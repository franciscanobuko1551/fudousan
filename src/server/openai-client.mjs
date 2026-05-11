import { modeInstructions, systemPrompt } from "../domain/consultation-policy.mjs";

export function extractOutputText(data) {
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

export async function createOpenAiReply({ apiKey, genre, message, mode, model }) {
  const apiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      instructions: systemPrompt,
      input: `相談ジャンル: ${genre}\n深掘りの方向: ${modeInstructions[mode] ?? modeInstructions.initial}\n相談内容: ${message}`,
      max_output_tokens: 900,
      store: false,
    }),
  });

  const data = await apiResponse.json();

  if (!apiResponse.ok) {
    console.error("OpenAI API error", data.error ?? data);
    throw new Error("AIから返事を受け取れませんでした。少し時間をおいて、もう一度送ってくださいね。");
  }

  return extractOutputText(data);
}
