import assert from "node:assert/strict";
import test from "node:test";

import {
  allowedGenres,
  allowedModes,
  maxMessageLength,
  modeInstructions,
  normalizeGenre,
  normalizeMode,
  systemPrompt,
} from "../../src/domain/consultation-policy.mjs";
import { hasCrisisSignal } from "../../src/domain/crisis-detection.mjs";
import { createFallbackReply } from "../../src/domain/fallback-replies.mjs";

test("normalizes unknown genre and mode to safe defaults", () => {
  assert.equal(normalizeGenre("知らないジャンル"), "人生相談");
  assert.equal(normalizeMode("unknown-mode"), "initial");
});

test("keeps known genre and mode values", () => {
  assert.equal(normalizeGenre("不安"), "不安");
  assert.equal(normalizeMode("steps"), "steps");
});

test("policy exports expected genre, mode, prompt, and message length", () => {
  assert.equal(maxMessageLength, 2000);
  assert.ok(allowedGenres.has("人生相談"));
  assert.ok(allowedModes.has("gentle"));
  assert.match(modeInstructions.steps, /今日できる小さな一歩/);
  assert.match(systemPrompt, /Kokoro Navi AI/);
  assert.match(systemPrompt, /医療・法律・金融/);
});

test("detects crisis signals", () => {
  assert.equal(hasCrisisSignal("死にたい気持ちがあります"), true);
  assert.equal(hasCrisisSignal("DVから逃げたいです"), true);
  assert.equal(hasCrisisSignal("今日は少し不安です"), false);
});

test("fallback replies include genre, message, and mode-specific guidance", () => {
  const reply = createFallbackReply("不安", "明日のことが不安です", "steps");

  assert.match(reply, /不安について/);
  assert.match(reply, /明日のことが不安です/);
  assert.match(reply, /今日の小さな一歩/);
});

test("fallback replies preserve professional boundaries", () => {
  const reply = createFallbackReply("人生相談", "眠れず動悸が続いている。病気ですか？", "initial");

  assert.match(reply, /医療・法律・金融/);
  assert.match(reply, /専門家/);
  assert.match(reply, /診断、治療、法的判断、金融判断の代わりではありません/);
});

test("unknown fallback mode uses the initial guidance", () => {
  const reply = createFallbackReply("不安", "少し落ち着きたいです", "unknown-mode");

  assert.match(reply, /今の気持ちに一つだけ名前をつけてみてください/);
});
