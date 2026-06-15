import { expectStatus, postChat, startTestServer, waitForServer } from "./check-helpers.mjs";

const port = 4199;
const baseUrl = `http://127.0.0.1:${port}`;

const server = startTestServer(port);

try {
  await waitForServer(baseUrl);

  const page = await expectStatus(baseUrl, "/", 200);
  const html = await page.text();

  if (!html.includes("Kokoro Navi AI")) {
    throw new Error("Top page did not include the project name.");
  }

  const requiredPageTexts = [
    "利用上の注意",
    "診断、治療、法的判断、金融判断、緊急対応の代わりではありません",
    "個人情報や第三者の情報を必要以上に入力しないでください",
    "この相談をこの端末のブラウザだけに保存する",
    "利用上の注意を確認しました",
    "医療・法律・金融・緊急対応の代わりではないことを確認してから送信してください。",
    "利用規約",
    "プライバシーポリシー",
    "免責文言",
  ];

  for (const text of requiredPageTexts) {
    if (!html.includes(text)) {
      throw new Error(`Top page did not include required safety text: ${text}`);
    }
  }

  await expectStatus(baseUrl, "/server.mjs", 404);
  await expectStatus(baseUrl, "/package.json", 404);
  await expectStatus(baseUrl, "/.git/config", 404);
  await expectStatus(baseUrl, "/%E0%A4%A", 400);

  const legalPages = [
    ["/terms.html", "利用規約"],
    ["/privacy.html", "プライバシーポリシー"],
    ["/disclaimer.html", "免責文言"],
  ];

  for (const [path, title] of legalPages) {
    const response = await expectStatus(baseUrl, path, 200);
    const text = await response.text();

    if (!text.includes(title) || !text.includes("Kokoro Navi AI")) {
      throw new Error(`${path} did not include required legal draft text.`);
    }
  }

  const fallback = await postChat(baseUrl, {
    genre: "不安",
    message: "これからのことが不安です",
    mode: "initial",
  });

  if (fallback.source !== "fallback" || !fallback.reply) {
    throw new Error("Fallback chat response was not returned.");
  }

  const safety = await postChat(baseUrl, {
    genre: "人生相談",
    message: "死にたい気持ちがあります",
    mode: "initial",
  });

  if (safety.source !== "safety" || !safety.reply) {
    throw new Error("Safety chat response was not returned.");
  }
} finally {
  server.kill();
}
