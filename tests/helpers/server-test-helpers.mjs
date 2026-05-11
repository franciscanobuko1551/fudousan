import { resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { createApp } from "../../src/server/app.mjs";

const rootDir = fileURLToPath(new URL("../..", import.meta.url));

export function listen(server) {
  return new Promise((resolveListen, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      server.off("error", reject);
      const address = server.address();
      resolveListen({
        baseUrl: `http://127.0.0.1:${address.port}`,
        close: () =>
          new Promise((resolveClose, rejectClose) => {
            server.close((error) => {
              if (error) {
                rejectClose(error);
                return;
              }

              resolveClose();
            });
          }),
      });
    });
  });
}

export async function withTestApp(options, callback) {
  const server = createApp({
    openAiApiKey: "",
    openAiModel: "gpt-5.1",
    publicDir: resolve(rootDir, "src/public"),
    ...options,
  });
  const app = await listen(server);

  try {
    return await callback(app);
  } finally {
    await app.close();
  }
}

export async function postChat(baseUrl, payload, { expectedStatus = 200 } = {}) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  const data = await response.json();

  if (response.status !== expectedStatus) {
    throw new Error(`/api/chat returned ${response.status}; expected ${expectedStatus}: ${JSON.stringify(data)}`);
  }

  return data;
}
