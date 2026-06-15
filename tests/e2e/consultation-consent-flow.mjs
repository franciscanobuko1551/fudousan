import assert from "node:assert/strict";

import { chromium } from "playwright";

import { withTestApp } from "../helpers/server-test-helpers.mjs";

async function waitForIdleAnswer(page) {
  await page.waitForFunction(() => !document.querySelector("#answer")?.classList.contains("loading"));
}

async function expectConsentBlock(page, getRequestCount, expectedRequestCount) {
  const blockedState = await page.locator("#answer").evaluate((element) => ({
    text: element.textContent ?? "",
    isEmpty: element.classList.contains("empty"),
  }));

  assert.equal(blockedState.isEmpty, false);
  assert.match(blockedState.text, /Kokoro Navi AI/);
  assert.equal(
    await page.locator("#terms-consent").evaluate((element) => document.activeElement === element),
    true,
  );
  assert.equal(getRequestCount(), expectedRequestCount);
}

async function submitAndWaitForChat(page) {
  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith("/api/chat") && candidate.request().method() === "POST"),
    page.locator("button[type='submit']").click(),
  ]);
  await waitForIdleAnswer(page);
  return response;
}

async function runConsentAndSafetyFlow(baseUrl) {
  const browser = await chromium.launch();

  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
    let chatRequestCount = 0;
    page.on("request", (request) => {
      if (request.url().endsWith("/api/chat")) {
        chatRequestCount += 1;
      }
    });

    await page.goto(baseUrl);
    await page.locator("#message").fill("I want to talk about work stress.");

    await page.locator("button[type='submit']").click();
    await expectConsentBlock(page, () => chatRequestCount, 0);

    await page.locator("#terms-consent").check();
    const firstResponse = await submitAndWaitForChat(page);
    assert.equal(firstResponse.status(), 200);
    assert.equal(chatRequestCount, 1);

    await page.locator("#terms-consent").uncheck();
    await page.locator("[data-mode='gentle']").click();
    await expectConsentBlock(page, () => chatRequestCount, 1);

    await page.locator("#new-consultation").click();
    await page.locator("#message").fill("DV");
    const safetyResponse = await submitAndWaitForChat(page);
    assert.equal(safetyResponse.status(), 200);
    assert.equal((await safetyResponse.json()).source, "safety");
    assert.equal(chatRequestCount, 2);

    await page.goto(baseUrl);
    const japaneseCrisisMessage = String.fromCodePoint(
      0x6b7b,
      0x306b,
      0x305f,
      0x3044,
      0x6c17,
      0x6301,
      0x3061,
      0x304c,
      0x3042,
      0x308a,
      0x307e,
      0x3059,
    );
    await page.locator("#message").fill(japaneseCrisisMessage);
    const japaneseSafetyResponse = await submitAndWaitForChat(page);
    assert.equal(japaneseSafetyResponse.status(), 200);
    assert.equal((await japaneseSafetyResponse.json()).source, "safety");
  } finally {
    await browser.close();
  }
}

await withTestApp({}, async ({ baseUrl }) => {
  await runConsentAndSafetyFlow(baseUrl);
});

console.log("E2E consultation consent flow passed");
