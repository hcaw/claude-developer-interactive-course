// Unit tests for answer-slot normalization — the pure half of grading.
// (gradeQuiz itself lives behind `import "server-only"` and cannot load under node:test.)

import assert from "node:assert/strict";
import { test } from "node:test";

import { isValidAnswerSlot, normalizeAnswerSlot, slotMatches } from "./quiz-grading.ts";

test("normalization canonicalizes case, order, whitespace and duplicates", () => {
  assert.equal(normalizeAnswerSlot("B"), "B");
  assert.equal(normalizeAnswerSlot("b"), "B");
  assert.equal(normalizeAnswerSlot("d,c"), "C,D");
  assert.equal(normalizeAnswerSlot(" c , C ,d"), "C,D");
  assert.equal(normalizeAnswerSlot(""), "");
  assert.equal(normalizeAnswerSlot(",,"), "");
});

test("slot matching is set equality, all-or-nothing", () => {
  assert.equal(slotMatches("B", ["B"]), true);
  assert.equal(slotMatches("b", ["B"]), true);
  assert.equal(slotMatches("D,C", ["C", "D"]), true);
  assert.equal(slotMatches("C", ["C", "D"]), false, "a subset is not the answer");
  assert.equal(slotMatches("B,C,D", ["C", "D"]), false, "a superset is not the answer");
  assert.equal(slotMatches("", ["B"]), false, "blank never matches");
});

test("slot validation rejects junk before it reaches the database", () => {
  assert.equal(isValidAnswerSlot("B"), true);
  assert.equal(isValidAnswerSlot("C,D"), true);
  assert.equal(isValidAnswerSlot("A,B,C,D,E,F"), true);
  assert.equal(isValidAnswerSlot(""), false);
  assert.equal(isValidAnswerSlot("b"), false, "client sends canonical uppercase");
  assert.equal(isValidAnswerSlot("D,C"), false, "client sends sorted sets");
  assert.equal(isValidAnswerSlot("C,C"), false, "no duplicate letters");
  assert.equal(isValidAnswerSlot("G"), false);
  assert.equal(isValidAnswerSlot("C, D"), false, "no whitespace in the wire format");
  assert.equal(isValidAnswerSlot("AB"), false);
});
