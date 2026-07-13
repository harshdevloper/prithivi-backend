/**
 * 3-piece tic-tac-toe engine. Pure functions: state in, state out, no IO.
 *
 * Rules: 3x3 board, X always moves first. Each side keeps at most 3 marks —
 * placing a 4th removes that player's OLDEST mark in the same move. Win is
 * checked AFTER the removal. Matches are capped at MAX_PLIES plies (= DRAW).
 */

export type Player = "X" | "O";
export type Cell = Player | null;

export interface GameState {
  board: Cell[]; // 9 cells
  xOrder: number[]; // X's marks, oldest first
  oOrder: number[]; // O's marks, oldest first
  plies: number;
}

export type Difficulty = "EASY" | "MEDIUM" | "HARD" | "IMPOSSIBLE";

export const MAX_PLIES = 60;

const LINES = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
] as const;

export const initialState = (): GameState => ({
  board: Array<Cell>(9).fill(null),
  xOrder: [],
  oOrder: [],
  plies: 0,
});

// Center then corners then edges: strong moves first → earlier alpha-beta cutoffs.
const MOVE_ORDER = [4, 0, 2, 6, 8, 1, 3, 5, 7] as const;

export const legalMoves = (state: GameState): number[] => {
  const moves: number[] = [];
  for (const i of MOVE_ORDER) if (state.board[i] === null) moves.push(i);
  return moves;
};

export const checkWin = (board: Cell[], player: Player): boolean =>
  LINES.some(([a, b, c]) => board[a] === player && board[b] === player && board[c] === player);

/**
 * Place `player` on `cell`. If the player already had 3 marks, their oldest
 * mark is removed in the same move. Returns the new state plus the removed
 * cell (or null). Throws on an occupied cell — callers validate 0-8 range.
 */
export const applyMove = (
  state: GameState,
  player: Player,
  cell: number,
): { state: GameState; removedCell: number | null } => {
  if (state.board[cell] !== null) throw new Error(`Cell ${cell} is occupied`);
  const board = [...state.board];
  const order = [...(player === "X" ? state.xOrder : state.oOrder)];

  let removedCell: number | null = null;
  order.push(cell);
  if (order.length > 3) {
    removedCell = order.shift()!;
    board[removedCell] = null;
  }
  board[cell] = player;

  const next: GameState = {
    board,
    xOrder: player === "X" ? order : [...state.xOrder],
    oOrder: player === "O" ? order : [...state.oOrder],
    plies: state.plies + 1,
  };
  return { state: next, removedCell };
};

// ---- minimax (models the removal rule: full state = board + mark orders) ----

const WIN_SCORE = 1000;

/** Lines where `player` has 2 marks and the third cell is empty, minus same for opponent. */
const heuristic = (board: Cell[], me: Player): number => {
  const them: Player = me === "X" ? "O" : "X";
  let score = 0;
  for (const [a, b, c] of LINES) {
    const cells = [board[a], board[b], board[c]];
    const mine = cells.filter((v) => v === me).length;
    const theirs = cells.filter((v) => v === them).length;
    const empty = cells.filter((v) => v === null).length;
    if (mine === 2 && empty === 1) score += 1;
    if (theirs === 2 && empty === 1) score -= 1;
  }
  return score;
};

/** Transposition key: board + oldest-first orders fully determine the position. */
const stateKey = (state: GameState, toMove: Player): string =>
  `${state.xOrder.join(",")}|${state.oOrder.join(",")}|${toMove}`;

interface TTEntry {
  depth: number;
  score: number;
  flag: "EXACT" | "LOWER" | "UPPER";
}

const search = (
  state: GameState,
  me: Player, // the maximizing player (the AI)
  toMove: Player,
  depth: number,
  alpha: number,
  beta: number,
  ply: number,
  tt: Map<string, TTEntry>,
): number => {
  // The side that just moved may have won (win is checked after placement+removal).
  const justMoved: Player = toMove === "X" ? "O" : "X";
  if (checkWin(state.board, justMoved)) {
    // Prefer fast wins / slow losses via ply scaling.
    return justMoved === me ? WIN_SCORE - ply : -(WIN_SCORE - ply);
  }
  if (depth === 0) return heuristic(state.board, me);

  const key = stateKey(state, toMove);
  const hit = tt.get(key);
  if (hit && hit.depth >= depth) {
    if (hit.flag === "EXACT") return hit.score;
    if (hit.flag === "LOWER" && hit.score >= beta) return hit.score;
    if (hit.flag === "UPPER" && hit.score <= alpha) return hit.score;
  }

  const alphaOrig = alpha;
  const maximizing = toMove === me;
  let best = maximizing ? -Infinity : Infinity;
  for (const cell of legalMoves(state)) {
    const { state: next } = applyMove(state, toMove, cell);
    const score = search(next, me, justMoved, depth - 1, alpha, beta, ply + 1, tt);
    if (maximizing) {
      best = Math.max(best, score);
      alpha = Math.max(alpha, best);
    } else {
      best = Math.min(best, score);
      beta = Math.min(beta, best);
    }
    if (beta <= alpha) break;
  }

  const flag: TTEntry["flag"] =
    best <= alphaOrig ? "UPPER" : best >= beta ? "LOWER" : "EXACT";
  tt.set(key, { depth, score: best, flag });
  return best;
};

// Cross-request memo: bestMove is deterministic per (depth, to-move, state), so
// repeat positions (openings especially) resolve in O(1) instead of a full search.
// ponytail: FIFO eviction at cap (~few MB); an LRU is overkill for tiny string keys.
const MEMO_MAX = 50_000;
const memo = new Map<string, number>();

/** Best cell for `player` searching `depth` plies ahead. */
export const bestMove = (state: GameState, player: Player, depth: number): number => {
  const memoKey = `${depth}|${stateKey(state, player)}`;
  const cached = memo.get(memoKey);
  if (cached !== undefined) return cached;

  const opponent: Player = player === "X" ? "O" : "X";
  const tt = new Map<string, TTEntry>();
  let best = -Infinity;
  let bestCell = legalMoves(state)[0]!;
  for (const cell of legalMoves(state)) {
    const { state: next } = applyMove(state, player, cell);
    const score = search(next, player, opponent, depth - 1, best, Infinity, 1, tt);
    if (score > best) {
      best = score;
      bestCell = cell;
    }
  }

  if (memo.size >= MEMO_MAX) memo.delete(memo.keys().next().value!);
  memo.set(memoKey, bestCell);
  return bestCell;
};

/**
 * Difficulty-driven move selection. `rng` is injectable so tests are
 * deterministic; production callers use Math.random.
 */
export const chooseAiMove = (
  state: GameState,
  player: Player,
  difficulty: Difficulty,
  rng: () => number = Math.random,
): number => {
  const random = () => {
    const moves = legalMoves(state);
    return moves[Math.floor(rng() * moves.length)]!;
  };
  switch (difficulty) {
    case "EASY":
      return rng() < 0.7 ? random() : bestMove(state, player, 2);
    case "MEDIUM":
      return rng() < 0.15 ? random() : bestMove(state, player, 4);
    case "HARD":
      return rng() < 0.05 ? random() : bestMove(state, player, 8);
    case "IMPOSSIBLE":
      return bestMove(state, player, 12);
  }
};
