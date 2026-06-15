import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

function extractStringArray(source, constName) {
  const match = source.match(new RegExp(`const ${constName} = \\[([\\s\\S]*?)\\];`));
  assert.ok(match, `${constName} array should exist`);
  return [...match[1].matchAll(/"([^"]+)"/g)].map(([, value]) => value);
}

test("consultation form includes consent checkbox before sending", async () => {
  const html = await readFile("src/public/index.html", "utf8");
  const script = await readFile("src/public/script.js", "utf8");
  const crisisDetection = await readFile("src/domain/crisis-detection.mjs", "utf8");

  assert.match(html, /id="terms-consent"/);
  assert.match(html, /name="terms-consent"/);
  assert.match(html, /name="terms-consent" type="checkbox"/);
  assert.match(html, /利用上の注意を確認しました/);
  assert.match(html, /医療・法律・金融・緊急対応の代わりではないことを確認してから送信してください。/);

  assert.match(script, /termsConsentInput/);
  assert.match(script, /const crisisKeywords = \[/);
  assert.match(script, /function hasClientCrisisSignal/);
  assert.match(script, /function canSendWithoutConsent/);
  assert.match(script, /termsConsentInput\.checked \|\| hasClientCrisisSignal\(message\)/);
  assert.match(script, /guardConsentBeforeSending\(message\)/);
  assert.match(script, /guardConsentBeforeSending\(currentConsultation\.message\)/);
  assert.match(script, /利用上の注意を確認してから送ってください/);
  assert.deepEqual(extractStringArray(script, "crisisKeywords"), extractStringArray(crisisDetection, "crisisKeywords"));
});
