import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = fileURLToPath(new URL(".", import.meta.url));
const publicDir = __dirname;
const port = Number(process.env.PORT ?? 4173);
const openAiApiKey = process.env.OPENAI_API_KEY;
const openAiModel = process.env.OPENAI_MODEL ?? "gpt-5.1";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".ico": "image/x-icon",
};


const crisisKeywords = [
  "死にたい",
  "消えたい",
  "自殺",
  "自傷",
  "殺したい",
  "殴られる",
  "虐待",
  "DV",
  "逃げたい",
];

const genreHints = {
  人生相談: "人生は、すぐに答えを出さなくても大丈夫です。今のあなたが大切にしたいことを一緒に見つめていきましょう。",
  心のモヤモヤ: "モヤモヤは、心が何かを知らせてくれているサインかもしれません。まずは言葉にできたこと自体が一歩です。",
  不安: "不安があるときは、未来を全部背負おうとしなくて大丈夫です。今日できる小さな安心を一つ選びましょう。",
  人間関係: "人との関係で疲れるときは、相手のことだけでなく、あなたの心の境界線も大切にしていいんです。",
  "50代からの生き方": "50代からは、これまでの経験が静かな力になります。遅いのではなく、深く選べる時期です。",
  起業の悩み: "起業の不安は、真剣に未来を考えている証拠です。完璧な準備より、小さく試す道を探しましょう。",
  自分らしい未来: "自分らしい未来は、誰かの正解ではなく、あなたの心が少しあたたかくなる方向にあります。",
};

const systemPrompt = `あなたは「Kokoro Navi AI」です。
心を整え、未来へ進むためのAI相談室として、次の人格を必ず守ってください。
- 否定しない
- 急かさない
- やさしく整理する
- 希望を見つける
- 母のような安心感を出す
- やわらかく、安心感がある
- 上から言わない
- 正論だけで押さない
- 気持ちを受け止める

回答の流れ:
1. まず相談してくれたことへの感謝を短く伝える
2. ユーザーの感情を決めつけず、やさしく受け止める
3. 今の状況を2〜3点で整理する
4. 今日できる小さな一歩を1つだけ提案する
5. 最後に希望が残る言葉で締める

安全方針:
医療・法律・金融など専門判断が必要な内容は断定せず、専門家への相談をやさしく促してください。
自傷・他害・虐待・DV・緊急性が高い内容が疑われる場合は、一人で抱え込まないこと、身近な人や地域の緊急窓口・医療機関・緊急通報へつながることを、落ち着いた言葉で促してください。`;

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

    if (body.length > 12000) {
      throw new Error("相談内容が長すぎます。少し短くして、もう一度送ってください。");
    }
  }

  return JSON.parse(body || "{}");
}


function hasCrisisSignal(message) {
  return crisisKeywords.some((keyword) => message.includes(keyword));
}

function createCrisisReply() {
  return [
    "話してくれてありがとうございます。今、とても苦しい状態の中で言葉にしてくれたのですね。まず、あなたの安全がいちばん大切です。",
    "もし今すぐ自分や誰かを傷つけてしまいそうな危険がある場合は、この画面を閉じても大丈夫なので、近くの人、地域の緊急通報、医療機関、相談窓口につながってください。",
    "一人で耐えようとしなくて大丈夫です。今は正しい答えを出す時間ではなく、安全な場所と助けにつながる時間です。",
    "できれば、近くにいる人へ『今ひとりでいるのが危ないです』と短く伝えてください。言葉がまとまらなくても、その一言だけで十分です。",
  ].join("\n\n");
}

function createFallbackReply(genre, message) {
  const hint = genreHints[genre] ?? genreHints.人生相談;

  return [
    `お話ししてくれてありがとうございます。${genre}について、今とても丁寧に向き合おうとしているのですね。`,
    `「${message}」という気持ちがあるのは、決して弱さではありません。ここまで頑張ってきたあなたの心が、少し立ち止まってほしいと教えてくれているのかもしれません。`,
    hint,
    "まずは、今の気持ちに一つだけ名前をつけてみてください。次に、深呼吸をする、紙に書く、信頼できる人に一言話すなど、今日できるいちばん小さな行動を一つだけ選びましょう。",
    "あなたは一人で急いで答えを出さなくて大丈夫。ここから少しずつ、安心できる未来の輪郭を一緒に整えていきましょう。",
  ].join("\n\n");
}

function extractOutputText(data) {
  if (typeof data.output_text === "string" && data.output_text.trim()) {
    return data.output_text.trim();
  }

  const text = data.output
    ?.flatMap((item) => item.content ?? [])
    .filter((content) => content.type === "output_text" && typeof content.text === "string")
    .map((content) => content.text)
    .join("\n")
    .trim();

  return text || "うまく言葉にできませんでした。少し時間をおいて、もう一度話しかけてくださいね。";
}

async function createAiReply(genre, message) {
  if (hasCrisisSignal(message)) {
    return {
      source: "safety",
      reply: createCrisisReply(),
    };
  }

  if (!openAiApiKey) {
    return {
      source: "fallback",
      reply: createFallbackReply(genre, message),
    };
  }

  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${openAiApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: openAiModel,
      instructions: systemPrompt,
      input: `相談ジャンル: ${genre}\n相談内容: ${message}`,
      max_output_tokens: 900,
      store: false,
    }),
  });

  const data = await apiResponse.json();

  if (!apiResponse.ok) {
    const messageFromApi = data.error?.message ?? "AIから返事を受け取れませんでした。";
    throw new Error(messageFromApi);
  }

  return {
    source: "openai",
    reply: extractOutputText(data),
  };
}

async function handleChat(request, response) {
  try {
    const body = await readJsonBody(request);
    const genre = String(body.genre ?? "人生相談").trim();
    const message = String(body.message ?? "").trim();

    if (!message) {
      sendJson(response, 400, {
        error: "まだ言葉にならない時もありますよね。短い一言だけでも大丈夫です。",
      });
      return;
    }

    const aiReply = await createAiReply(genre, message);
    sendJson(response, 200, aiReply);
  } catch (error) {
    sendJson(response, 500, {
      error: "ごめんなさい。今は少し返事に時間がかかっているようです。深呼吸して、少ししてからもう一度送ってくださいね。",
      detail: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

async function serveStatic(request, response) {
  const requestUrl = new URL(request.url ?? "/", `http://${request.headers.host}`);
  const pathname = requestUrl.pathname === "/" ? "/index.html" : requestUrl.pathname;
  const safePath = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, "");
  const filePath = join(publicDir, safePath);

  if (!filePath.startsWith(publicDir)) {
    response.writeHead(403);
    response.end("Forbidden");
    return;
  }

  try {
    const fileStat = await stat(filePath);

    if (!fileStat.isFile()) {
      throw new Error("Not a file");
    }

    response.writeHead(200, {
      "Content-Type": mimeTypes[extname(filePath)] ?? "application/octet-stream",
      "Cache-Control": "no-cache",
    });
    createReadStream(filePath).pipe(response);
  } catch {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end("Not found");
  }
}

const server = createServer(async (request, response) => {
  if (request.method === "POST" && request.url === "/api/chat") {
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

server.listen(port, () => {
  console.log(`Kokoro Navi AI is running at http://localhost:${port}`);
});
