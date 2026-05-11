import { spawn } from "node:child_process";

const port = 4199;
const baseUrl = `http://127.0.0.1:${port}`;

function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function waitForServer() {
  for (let attempt = 0; attempt < 30; attempt += 1) {
    try {
      const response = await fetch(baseUrl);

      if (response.ok) {
        return;
      }
    } catch {
      // The server may still be starting.
    }

    await wait(100);
  }

  throw new Error("Server did not start in time.");
}

async function expectStatus(path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`);

  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}.`);
  }

  return response;
}

async function postChat(payload) {
  const response = await fetch(`${baseUrl}/api/chat`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(`/api/chat returned ${response.status}: ${JSON.stringify(data)}`);
  }

  return data;
}

const server = spawn(process.execPath, ["server.mjs"], {
  env: {
    ...process.env,
    PORT: String(port),
    OPENAI_API_KEY: "",
  },
  stdio: "ignore",
});

try {
  await waitForServer();

  const page = await expectStatus("/", 200);
  const html = await page.text();

  if (!html.includes("Kokoro Navi AI")) {
    throw new Error("Top page did not include the project name.");
  }

  await expectStatus("/server.mjs", 404);
  await expectStatus("/package.json", 404);
  await expectStatus("/.git/config", 404);
  await expectStatus("/%E0%A4%A", 400);

  const fallback = await postChat({
    genre: "不安",
    message: "これからのことが不安です",
    mode: "initial",
  });

  if (fallback.source !== "fallback" || !fallback.reply) {
    throw new Error("Fallback chat response was not returned.");
  }

  const safety = await postChat({
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
