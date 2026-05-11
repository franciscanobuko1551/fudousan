import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "./src/server/app.mjs";

const rootDir = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT ?? 4173);

const server = createApp({
  openAiApiKey: process.env.OPENAI_API_KEY,
  openAiModel: process.env.OPENAI_MODEL ?? "gpt-5.1",
  publicDir: resolve(rootDir, "src/public"),
});

server.listen(port, () => {
  console.log(`Kokoro Navi AI is running at http://localhost:${port}`);
});
