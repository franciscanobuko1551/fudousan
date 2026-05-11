import assert from "node:assert/strict";
import test from "node:test";

import { postChat, withTestApp } from "../helpers/server-test-helpers.mjs";

test("serves the top page and does not serve private project files", async () => {
  await withTestApp({}, async ({ baseUrl }) => {
    const topPage = await fetch(`${baseUrl}/`);
    assert.equal(topPage.status, 200);
    assert.match(await topPage.text(), /Kokoro Navi AI/);

    assert.equal((await fetch(`${baseUrl}/server.mjs`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/package.json`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/.git/config`)).status, 404);
    assert.equal((await fetch(`${baseUrl}/%E0%A4%A`)).status, 400);
  });
});

test("returns fallback reply when OpenAI API key is not configured", async () => {
  await withTestApp({}, async ({ baseUrl }) => {
    const data = await postChat(baseUrl, {
      genre: "不安",
      message: "これからのことが不安です",
      mode: "initial",
    });

    assert.equal(data.source, "fallback");
    assert.match(data.reply, /不安について/);
  });
});

test("normalizes unknown genre and mode in API requests", async () => {
  await withTestApp({}, async ({ baseUrl }) => {
    const genreData = await postChat(baseUrl, {
      genre: "知らないジャンル",
      message: "これからの進み方を整理したいです",
      mode: "initial",
    });
    assert.equal(genreData.source, "fallback");
    assert.match(genreData.reply, /人生相談について/);

    const modeData = await postChat(baseUrl, {
      genre: "不安",
      message: "少し落ち着きたいです",
      mode: "unknown-mode",
    });
    assert.match(modeData.reply, /今の気持ちに一つだけ名前をつけてみてください/);
  });
});

test("validates empty and long messages", async () => {
  await withTestApp({}, async ({ baseUrl }) => {
    const empty = await postChat(
      baseUrl,
      {
        genre: "人生相談",
        message: "",
        mode: "initial",
      },
      { expectedStatus: 400 },
    );
    assert.match(empty.error, /短い一言だけでも大丈夫です/);

    const tooLong = await postChat(
      baseUrl,
      {
        genre: "人生相談",
        message: "あ".repeat(2001),
        mode: "initial",
      },
      { expectedStatus: 413 },
    );
    assert.match(tooLong.error, /2000文字以内/);
  });
});

test("prioritizes safety replies for crisis signals", async () => {
  await withTestApp({}, async ({ baseUrl }) => {
    const data = await postChat(baseUrl, {
      genre: "人生相談",
      message: "死にたい気持ちがあります",
      mode: "initial",
    });

    assert.equal(data.source, "safety");
    assert.match(data.reply, /あなたの安全がいちばん大切です/);
  });
});
