// Self-test for the 3-piece tic-tac-toe engine. Run: npx tsx scripts/ttt-selftest.mjs
import assert from "node:assert/strict";
import {
  applyMove,
  checkWin,
  chooseAiMove,
  initialState,
  legalMoves,
  MAX_PLIES,
} from "../src/modules/game/engine/tictactoe.ts";

// Seeded RNG so a failure is reproducible.
const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ---- (b) removal rule: a 4th placement removes that player's oldest mark ----
{
  let s = initialState();
  ({ state: s } = applyMove(s, "X", 0));
  ({ state: s } = applyMove(s, "X", 1));
  ({ state: s } = applyMove(s, "X", 5)); // 0,1,5 — no line
  const { state: next, removedCell } = applyMove(s, "X", 7);
  assert.equal(removedCell, 0, "4th placement must remove the OLDEST mark");
  assert.equal(next.board[0], null, "removed cell must be cleared");
  assert.deepEqual(next.xOrder, [1, 5, 7], "order must shift oldest out, newest in");
  assert.equal(next.board[7], "X");
  // first three placements must not remove anything
  const fresh = applyMove(initialState(), "X", 4);
  assert.equal(fresh.removedCell, null, "placements 1-3 must not remove");
  console.log("PASS removal rule: 4th placement removes that player's oldest mark");
}

// ---- (c) win detection AFTER removal ----
{
  // Would-be win 0-1-2 is negated: 0 is the oldest and gets removed by the same move.
  let s = initialState();
  ({ state: s } = applyMove(s, "X", 0));
  ({ state: s } = applyMove(s, "X", 1));
  ({ state: s } = applyMove(s, "X", 5));
  const negated = applyMove(s, "X", 2); // removes 0 -> marks are 1,5,2
  assert.equal(negated.removedCell, 0);
  assert.equal(checkWin(negated.state.board, "X"), false, "win must NOT count when removal breaks the line");

  // Win still forms when the removed (oldest) mark is not part of the line: 5,0,1 + place 2 -> removes 5 -> 0,1,2 wins.
  let t = initialState();
  ({ state: t } = applyMove(t, "X", 5));
  ({ state: t } = applyMove(t, "X", 0));
  ({ state: t } = applyMove(t, "X", 1));
  const formed = applyMove(t, "X", 2); // removes 5 -> marks are 0,1,2
  assert.equal(formed.removedCell, 5);
  assert.equal(checkWin(formed.state.board, "X"), true, "win MUST count when removal is outside the line");
  console.log("PASS win detection post-removal (both negated and formed cases)");
}

// ---- (d) per-difficulty worst-case AI move latency (memo-cold: runs first) ----
{
  const rng = mulberry32(99);
  const worst = { EASY: 0, MEDIUM: 0, HARD: 0, IMPOSSIBLE: 0 };
  for (const difficulty of Object.keys(worst)) {
    for (let game = 0; game < 25; game++) {
      let state = initialState();
      while (state.plies < MAX_PLIES) {
        const moves = legalMoves(state);
        ({ state } = applyMove(state, "X", moves[Math.floor(rng() * moves.length)]));
        if (checkWin(state.board, "X") || state.plies >= MAX_PLIES) break;
        const t0 = performance.now();
        const oCell = chooseAiMove(state, "O", difficulty, rng);
        worst[difficulty] = Math.max(worst[difficulty], performance.now() - t0);
        ({ state } = applyMove(state, "O", oCell));
        if (checkWin(state.board, "O")) break;
      }
    }
  }
  console.log("Per-difficulty worst-case AI move latency (25 games each):");
  for (const [d, ms] of Object.entries(worst)) console.log(`  ${d.padEnd(10)} ${ms.toFixed(1)}ms`);
  assert.ok(worst.IMPOSSIBLE < 100, `IMPOSSIBLE worst-case must be <100ms, got ${worst.IMPOSSIBLE.toFixed(1)}ms`);
  console.log("PASS worst-case IMPOSSIBLE move < 100ms");
}

// ---- (a) 200 random-X games vs IMPOSSIBLE O: the engine must NEVER lose ----
{
  const rng = mulberry32(1234);
  let aiWins = 0;
  let draws = 0;
  const start = Date.now();

  for (let game = 0; game < 200; game++) {
    let state = initialState();
    let result = "DRAW";
    // Mirrors the service loop: X (random user) then O (engine), win check after each placement.
    while (state.plies < MAX_PLIES) {
      const moves = legalMoves(state);
      const xCell = moves[Math.floor(rng() * moves.length)];
      ({ state } = applyMove(state, "X", xCell));
      if (checkWin(state.board, "X")) {
        result = "X";
        break;
      }
      if (state.plies >= MAX_PLIES) break;

      const oCell = chooseAiMove(state, "O", "IMPOSSIBLE", rng);
      ({ state } = applyMove(state, "O", oCell));
      if (checkWin(state.board, "O")) {
        result = "O";
        break;
      }
    }
    assert.notEqual(result, "X", `engine lost game ${game} (IMPOSSIBLE must never lose)`);
    if (result === "O") aiWins++;
    else draws++;
  }

  const secs = ((Date.now() - start) / 1000).toFixed(1);
  console.log(
    `PASS 200 random-vs-IMPOSSIBLE games in ${secs}s: engine losses=0, engine wins=${aiWins}, draws=${draws}`,
  );
}

console.log("ALL SELF-TESTS PASSED");
