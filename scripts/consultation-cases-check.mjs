import { expectStatus, postChat, startTestServer, waitForServer } from "./check-helpers.mjs";

const port = 4200;
const baseUrl = `http://127.0.0.1:${port}`;
const maxMessageLength = 2000;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertIncludes(text, expected, label) {
  assert(typeof text === "string" && text.includes(expected), `${label} did not include: ${expected}`);
}

async function expectFallbackCase({ name, payload, includes = [] }) {
  const data = await postChat(baseUrl, payload);

  assert(data.source === "fallback", `${name} source was ${data.source}; expected fallback.`);
  assert(typeof data.reply === "string" && data.reply.length > 0, `${name} did not return reply text.`);

  for (const expected of includes) {
    assertIncludes(data.reply, expected, name);
  }

  return data;
}

const server = startTestServer(port);

try {
  await waitForServer(baseUrl);

  await expectStatus(baseUrl, "/missing-page", 404);

  const empty = await postChat(
    baseUrl,
    {
      genre: "人生相談",
      message: "",
      mode: "initial",
    },
    { expectedStatus: 400 },
  );
  assertIncludes(empty.error, "短い一言だけでも大丈夫です", "empty message error");

  const longMessage = "あ".repeat(maxMessageLength + 1);
  const tooLong = await postChat(
    baseUrl,
    {
      genre: "人生相談",
      message: longMessage,
      mode: "initial",
    },
    { expectedStatus: 413 },
  );
  assertIncludes(tooLong.error, `${maxMessageLength}文字以内`, "long message error");

  await expectFallbackCase({
    name: "unknown genre fallback",
    payload: {
      genre: "知らないジャンル",
      message: "これからの進み方を整理したいです",
      mode: "initial",
    },
    includes: ["人生相談について"],
  });

  const modeCases = [
    {
      mode: "gentle",
      includes: ["前向きになろうとしなくても大丈夫"],
    },
    {
      mode: "steps",
      includes: ["今日の小さな一歩"],
    },
    {
      mode: "organize",
      includes: ["整理すると"],
    },
    {
      mode: "hope",
      includes: ["未来への小さな灯り"],
    },
  ];

  for (const modeCase of modeCases) {
    await expectFallbackCase({
      name: `${modeCase.mode} mode`,
      payload: {
        genre: "不安",
        message: "明日のことを考えると落ち着きません",
        mode: modeCase.mode,
      },
      includes: modeCase.includes,
    });
  }

  await expectFallbackCase({
    name: "unknown mode fallback",
    payload: {
      genre: "不安",
      message: "少し気持ちを落ち着けたいです",
      mode: "unknown-mode",
    },
    includes: ["まずは、今の気持ちに一つだけ名前をつけてみてください"],
  });

  const safetyMessages = ["死にたいです", "消えたい気持ちです", "DVから逃げたいです"];

  for (const message of safetyMessages) {
    const data = await postChat(baseUrl, {
      genre: "人生相談",
      message,
      mode: "initial",
    });

    assert(data.source === "safety", `safety message "${message}" source was ${data.source}; expected safety.`);
    assertIncludes(data.reply, "あなたの安全がいちばん大切です", `safety reply for ${message}`);
  }
} finally {
  server.kill();
}
