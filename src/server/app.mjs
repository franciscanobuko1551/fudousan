import { createServer } from "node:http";

import { createCrisisReply, hasCrisisSignal } from "../domain/crisis-detection.mjs";
import { createFallbackReply } from "../domain/fallback-replies.mjs";
import { maxMessageLength, normalizeGenre, normalizeMode } from "../domain/consultation-policy.mjs";
import { createOpenAiReply } from "./openai-client.mjs";
import { createStaticHandler } from "./static-files.mjs";

class UserFacingError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

function sendJson(response, statusCode, payload) {
  response.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(payload));
}

async function readJsonBody(request) {
  let body = "";

  for await (const chunk of request) {
    body += chunk;

    if (body.length > maxMessageLength * 6) {
      throw new UserFacingError("相談内容が長すぎます。少し短くして、もう一度送ってください。", 413);
    }
  }

  try {
    return JSON.parse(body || "{}");
  } catch {
    throw new UserFacingError("送信内容を読み取れませんでした。ページを更新して、もう一度送ってください。");
  }
}

async function createAiReply({ genre, message, mode, openAiApiKey, openAiModel }) {
  if (hasCrisisSignal(message)) {
    return {
      source: "safety",
      reply: createCrisisReply(),
    };
  }

  if (!openAiApiKey) {
    return {
      source: "fallback",
      reply: createFallbackReply(genre, message, mode),
    };
  }

  return {
    source: "openai",
    reply: await createOpenAiReply({
      apiKey: openAiApiKey,
      genre,
      message,
      mode,
      model: openAiModel,
    }),
  };
}

function createChatHandler({ openAiApiKey, openAiModel }) {
  return async function handleChat(request, response) {
    try {
      const body = await readJsonBody(request);
      const requestedGenre = String(body.genre ?? "人生相談").trim();
      const message = String(body.message ?? "").trim();
      const requestedMode = String(body.mode ?? "initial").trim();
      const genre = normalizeGenre(requestedGenre);
      const mode = normalizeMode(requestedMode);

      if (!message) {
        sendJson(response, 400, {
          error: "まだ言葉にならない時もありますよね。短い一言だけでも大丈夫です。",
        });
        return;
      }

      if (message.length > maxMessageLength) {
        sendJson(response, 413, {
          error: `相談内容が少し長いようです。まずは${maxMessageLength}文字以内で、いちばん聞いてほしいことから送ってくださいね。`,
        });
        return;
      }

      const aiReply = await createAiReply({
        genre,
        message,
        mode,
        openAiApiKey,
        openAiModel,
      });
      sendJson(response, 200, aiReply);
    } catch (error) {
      console.error(error);
      sendJson(response, error instanceof UserFacingError ? error.statusCode : 500, {
        error:
          error instanceof UserFacingError
            ? error.message
            : "ごめんなさい。今は少し返事に時間がかかっているようです。深呼吸して、少ししてからもう一度送ってくださいね。",
      });
    }
  };
}

export function createApp({ openAiApiKey, openAiModel, publicDir }) {
  const handleChat = createChatHandler({ openAiApiKey, openAiModel });
  const serveStatic = createStaticHandler({ publicDir });

  return createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "POST" && requestUrl.pathname === "/api/chat") {
      await handleChat(request, response);
      return;
    }

    if (request.method === "GET" || request.method === "HEAD") {
      await serveStatic(request, response);
      return;
    }

    response.writeHead(405, { Allow: "GET, HEAD, POST" });
    response.end("Method Not Allowed");
  });
}
