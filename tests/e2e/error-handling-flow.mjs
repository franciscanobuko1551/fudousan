import assert from "node:assert/strict";

import { chromium } from "playwright";

import { withTestApp } from "../helpers/server-test-helpers.mjs";

const historyStorageKey = "kokoro-navi-ai:consultation-history";

async function waitForIdleAnswer(page) {
  await page.waitForFunction(() => !document.querySelector("#answer")?.classList.contains("loading"));
}

async function submitConsultation(page, message = "I want to talk about work stress.") {
  await page.locator("#message").fill(message);
  await page.locator("#terms-consent").check();

  const [response] = await Promise.all([
    page.waitForResponse((candidate) => candidate.url().endsWith("/api/chat") && candidate.request().method() === "POST"),
    page.locator("button[type='submit']").click(),
  ]);

  await waitForIdleAnswer(page);
  return response;
}

function assertNoInternalErrorText(text) {
  assert.doesNotMatch(text, /TypeError|QuotaExceededError|Error:|stack|at /i);
}

async function expectNetworkFailureIsUserFacing(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

  try {
    await page.route("**/api/chat", (route) => route.abort("failed"));
    await page.goto(baseUrl);
    await page.locator("#message").fill("I want to talk about work stress.");
    await page.locator("#terms-consent").check();
    await page.locator("button[type='submit']").click();
    await waitForIdleAnswer(page);

    const answerText = await page.locator("#answer").innerText();
    assert.match(answerText, /通信がうまくいきませんでした/);
    assert.match(answerText, /もう一度/);
    assertNoInternalErrorText(answerText);
    assert.equal(await page.locator("#copy-answer").isDisabled(), true);
  } finally {
    await page.close();
  }
}

async function expectHistorySaveFailureIsUserFacing(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

  try {
    await page.addInitScript((key) => {
      const originalSetItem = Storage.prototype.setItem;
      Storage.prototype.setItem = function setItem(storageKey, value) {
        if (storageKey === key) {
          throw new DOMException("Storage disabled for test", "QuotaExceededError");
        }

        return originalSetItem.call(this, storageKey, value);
      };
    }, historyStorageKey);

    await page.goto(baseUrl);
    const response = await submitConsultation(page);
    assert.equal(response.status(), 200);

    const answerText = await page.locator("#answer").innerText();
    assert.match(answerText, /相談履歴を保存できませんでした/);
    assert.match(answerText, /回答はこの画面で確認できます/);
    assertNoInternalErrorText(answerText);
    assert.equal(await page.locator(".history-item").count(), 0);
    assert.equal(await page.locator("#copy-answer").isDisabled(), false);
  } finally {
    await page.close();
  }
}

async function expectClipboardFailureIsUserFacing(browser, baseUrl) {
  const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

  try {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            throw new Error("Clipboard blocked for test");
          },
        },
      });
    });

    await page.goto(baseUrl);
    const response = await submitConsultation(page);
    assert.equal(response.status(), 200);

    const copyButton = page.locator("#copy-answer");
    const originalText = await copyButton.innerText();
    await copyButton.click();

    await page.waitForFunction(
      (text) => document.querySelector("#copy-answer")?.textContent !== text,
      originalText,
    );
    const failureText = await copyButton.innerText();

    assert.match(failureText, /コピーできませんでした/);
    assert.doesNotMatch(failureText, /Clipboard blocked|Error/i);
    assert.equal(await page.locator("#answer").innerText().then((text) => text.length > 20), true);
  } finally {
    await page.close();
  }
}

await withTestApp({}, async ({ baseUrl }) => {
  const browser = await chromium.launch();

  try {
    await expectNetworkFailureIsUserFacing(browser, baseUrl);
    await expectHistorySaveFailureIsUserFacing(browser, baseUrl);
    await expectClipboardFailureIsUserFacing(browser, baseUrl);
  } finally {
    await browser.close();
  }
});

console.log("E2E error handling flow passed");
