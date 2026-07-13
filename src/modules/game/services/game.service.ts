import { Prisma } from "@prisma/client";
import type { PrismaClient } from "@prisma/client";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../../common/errors.js";
import type { NotificationsService } from "../../notifications/services/notifications.service.js";
import type { SettingsService } from "../../settings/services/settings.service.js";
import {
  applyMove,
  checkWin,
  chooseAiMove,
  initialState,
  MAX_PLIES,
  type Difficulty,
  type GameState,
} from "../engine/tictactoe.js";
import type { MoveResultDto, StartMatchDto, TttConfigDto } from "../schemas/game.schema.js";

const DIFFICULTIES: readonly Difficulty[] = ["EASY", "MEDIUM", "HARD", "IMPOSSIBLE"];

type MatchStatus = "IN_PROGRESS" | "WON" | "LOST" | "DRAW";

type CachedMatch = {
  state: GameState;
  status: MatchStatus;
  difficulty: Difficulty;
  hintsEnabled: boolean; // snapshot at start — decides the win payout
  userId: string;
  updatedAt: number; // last-touch ms, used by the sweep
};

// HOT PATH: in-memory match cache so a move never waits on the cloud DB.
// ponytail: single-process cache; move to Redis if this ever runs multi-instance.
const matchCache = new Map<string, CachedMatch>();
const MATCH_CACHE_MAX = 5000;
const MATCH_CACHE_TTL_MS = 60 * 60 * 1000;
setInterval(() => {
  const cutoff = Date.now() - MATCH_CACHE_TTL_MS;
  for (const [id, entry] of matchCache) if (entry.updatedAt < cutoff) matchCache.delete(id);
}, 10 * 60 * 1000).unref();

function cacheSet(matchId: string, entry: CachedMatch): void {
  if (!matchCache.has(matchId) && matchCache.size >= MATCH_CACHE_MAX) {
    // ponytail: evicts oldest-inserted, not oldest-touched; fine at 5000 entries.
    matchCache.delete(matchCache.keys().next().value as string);
  }
  matchCache.set(matchId, entry);
}

// Per-match in-flight lock: one move at a time, held until its async persist
// settles, so DB writes for a match can never interleave.
const inflight = new Set<string>();

// ponytail: queries are trivial one-liners, prisma used directly (AppAssetsService precedent) — add a repository if they grow.
export class GameService {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
  ) {}

  private async difficulty(): Promise<Difficulty> {
    const value = await this.settings.getString("game.ttt.difficulty");
    return DIFFICULTIES.includes(value as Difficulty) ? (value as Difficulty) : "MEDIUM";
  }

  private async playedToday(userId: string): Promise<number> {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    return this.prisma.gameMatch.count({
      where: {
        userId,
        createdAt: { gte: startOfDay },
        // Grace for accidental opens: an IN_PROGRESS match with zero moves that
        // is >10 min old was never really played, so it doesn't spend the limit.
        NOT: {
          status: "IN_PROGRESS",
          createdAt: { lt: new Date(Date.now() - 10 * 60 * 1000) },
          state: { path: ["plies"], equals: 0 },
        },
      },
    });
  }

  async getConfig(userId: string): Promise<TttConfigDto> {
    const [enabled, winCoins, hintWinCoins, difficulty, dailyLimit, playedToday] =
      await Promise.all([
        this.settings.getBoolean("game.ttt.enabled"),
        this.settings.getNumber("game.ttt.winCoins"),
        this.settings.getNumber("game.ttt.hintWinCoins"),
        this.difficulty(),
        this.settings.getNumber("game.ttt.dailyLimit"),
        this.playedToday(userId),
      ]);
    return {
      enabled,
      winCoins,
      hintWinCoins,
      difficulty,
      dailyLimit,
      playedToday,
      remaining: Math.max(0, dailyLimit - playedToday),
    };
  }

  async startMatch(userId: string, hints = false): Promise<StartMatchDto> {
    if (!(await this.settings.getBoolean("game.ttt.enabled"))) {
      throw new ForbiddenError("Tic-tac-toe is currently disabled");
    }
    const dailyLimit = await this.settings.getNumber("game.ttt.dailyLimit");
    if ((await this.playedToday(userId)) >= dailyLimit) {
      throw new ConflictError("You've reached today's match limit");
    }

    const state = initialState();
    const match = await this.prisma.gameMatch.create({
      data: {
        userId,
        state: state as unknown as Prisma.InputJsonValue,
        difficulty: await this.difficulty(),
        hintsEnabled: hints,
      },
    });
    cacheSet(match.id, {
      state,
      status: "IN_PROGRESS",
      difficulty: match.difficulty as Difficulty,
      hintsEnabled: match.hintsEnabled,
      userId,
      updatedAt: Date.now(),
    });
    return {
      matchId: match.id,
      board: state.board,
      yourSymbol: "X",
      hintsEnabled: match.hintsEnabled,
    };
  }

  async move(userId: string, matchId: string, cell: number): Promise<MoveResultDto> {
    if (inflight.has(matchId)) {
      throw new ConflictError("A move on this match is already being processed");
    }
    inflight.add(matchId);
    // On the non-terminal path the lock is handed off to the async persist
    // chain; everywhere else the finally below releases it.
    let lockHandedOff = false;
    try {
      let cached = matchCache.get(matchId);
      if (!cached) {
        // Cache miss (e.g. server restart mid-match): fall back to the DB,
        // then repopulate so subsequent moves stay on the hot path.
        const match = await this.prisma.gameMatch.findUnique({ where: { id: matchId } });
        if (!match || match.userId !== userId) throw new NotFoundError("Match not found");
        cached = {
          state: match.state as unknown as GameState,
          status: match.status,
          difficulty: match.difficulty as Difficulty,
          hintsEnabled: match.hintsEnabled,
          userId: match.userId,
          updatedAt: Date.now(),
        };
        cacheSet(matchId, cached);
      }
      if (cached.userId !== userId) throw new NotFoundError("Match not found");
      if (cached.status !== "IN_PROGRESS") throw new ConflictError("Match is already finished");

      const state = cached.state;
      if (state.board[cell] !== null) throw new BadRequestError("Cell is already occupied");

      // ---- user (X) move ----
      const userMove = applyMove(state, "X", cell);
      let current = userMove.state;
      let aiMove: number | null = null;
      let aiRemovedCell: number | null = null;
      let status: MatchStatus = "IN_PROGRESS";

      if (checkWin(current.board, "X")) {
        status = "WON";
      } else if (current.plies >= MAX_PLIES) {
        status = "DRAW";
      } else {
        // ---- AI (O) move ----
        aiMove = chooseAiMove(current, "O", cached.difficulty);
        const ai = applyMove(current, "O", aiMove);
        current = ai.state;
        aiRemovedCell = ai.removedCell;
        if (checkWin(current.board, "O")) status = "LOST";
        else if (current.plies >= MAX_PLIES) status = "DRAW";
      }

      const result: MoveResultDto = {
        board: current.board,
        removedCell: userMove.removedCell,
        aiMove,
        aiRemovedCell,
        status,
        coinsAwarded: null,
      };

      if (status === "IN_PROGRESS") {
        // HOT PATH: update the cache and respond immediately; persist to the
        // cloud DB in the background. The in-flight lock stays held until the
        // write settles, so the next move can't interleave with it.
        cacheSet(matchId, { ...cached, state: current, updatedAt: Date.now() });
        lockHandedOff = true;
        void this.prisma.gameMatch
          .update({
            where: { id: matchId },
            data: { state: current as unknown as Prisma.InputJsonValue },
          })
          .catch((error) => {
            console.error(`[game] async persist failed for match ${matchId}`, error);
          })
          .finally(() => inflight.delete(matchId));
        return result;
      }

      // TERMINAL: persist (final state + wallet credit) synchronously
      // BEFORE responding, then evict from the cache.
      let coinsAwarded: number | null = null;
      if (status === "WON") {
        const [winCoins, hintWinCoins] = await Promise.all([
          this.settings.getNumber("game.ttt.winCoins"),
          this.settings.getNumber("game.ttt.hintWinCoins"),
        ]);
        // Hinted wins pay the (lower) hint rate — snapshot taken at match start.
        coinsAwarded = cached.hintsEnabled ? hintWinCoins : winCoins;
      }
      await this.persist(matchId, userId, current, status, coinsAwarded);
      matchCache.delete(matchId);

      if (status === "WON" && coinsAwarded) {
        await this.notifications.enqueue({
          userId,
          type: "WALLET",
          title: "You beat the AI",
          body: `You won tic-tac-toe and earned ${coinsAwarded} coins!`,
        });
      }

      return { ...result, coinsAwarded };
    } finally {
      if (!lockHandedOff) inflight.delete(matchId);
    }
  }

  /**
   * Persist a terminal move; on WON also credit the wallet in the same
   * transaction. All game computation happens BEFORE this is called — the
   * transaction wraps only the writes, so it commits in milliseconds.
   */
  private async persist(
    matchId: string,
    userId: string,
    state: GameState,
    status: MatchStatus,
    coinsAwarded: number | null,
  ): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      // Guard: only finish a still-in-progress match. In-process races are
      // already serialized by the in-flight lock; this catches replays.
      const updated = await tx.gameMatch.updateMany({
        where: { id: matchId, status: "IN_PROGRESS" },
        data: {
          state: state as unknown as Prisma.InputJsonValue,
          status,
          coinsAwarded: coinsAwarded === null ? undefined : new Prisma.Decimal(coinsAwarded),
        },
      });
      if (updated.count !== 1) throw new ConflictError("Match was updated concurrently");

      if (status === "WON" && coinsAwarded) {
        const wallet = await tx.wallet.upsert({
          where: { userId },
          create: { userId },
          update: {},
        });
        const after = await tx.wallet.update({
          where: { id: wallet.id },
          data: { balance: { increment: coinsAwarded } },
        });
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            type: "CREDIT",
            amount: new Prisma.Decimal(coinsAwarded),
            balanceAfter: after.balance,
            reference: `game-ttt:${matchId}`,
            description: "Tic-tac-toe win vs AI",
          },
        });
      }
      // Belt: generous timeout so a briefly busy event loop can't expire the tx.
    }, { timeout: 10_000 });
  }
}
