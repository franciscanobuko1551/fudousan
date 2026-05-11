import { spawn } from "node:child_process";

export function wait(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForServer(baseUrl) {
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

export function startTestServer(port) {
  return spawn(process.execPath, ["server.mjs"], {
    env: {
      ...process.env,
      PORT: String(port),
      OPENAI_API_KEY: "",
    },
    stdio: "ignore",
  });
}

export async function expectStatus(baseUrl, path, expectedStatus) {
  const response = await fetch(`${baseUrl}${path}`);

  if (response.status !== expectedStatus) {
    throw new Error(`${path} returned ${response.status}; expected ${expectedStatus}.`);
  }

  return response;
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
