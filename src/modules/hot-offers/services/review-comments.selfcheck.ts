// Run: npx tsx src/modules/hot-offers/services/review-comments.selfcheck.ts
import assert from "node:assert";
import { COMBINATION_SPACE, generateReviewComment } from "./review-comments.js";

assert(COMBINATION_SPACE >= 50_000, `combination space too small: ${COMBINATION_SPACE}`);

for (const name of ["Coin Blast", null]) {
  const comment = generateReviewComment(name);
  assert(typeof comment === "string" && comment.length > 20 && comment.length < 400, comment);
  assert(!comment.includes("{name}"), `placeholder leaked: ${comment}`);
}

console.log(`ok — combination space: ${COMBINATION_SPACE}`);
