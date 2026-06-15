import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const legalPages = [
  {
    path: "src/public/terms.html",
    href: "terms.html",
    title: "利用規約",
  },
  {
    path: "src/public/privacy.html",
    href: "privacy.html",
    title: "プライバシーポリシー",
  },
  {
    path: "src/public/disclaimer.html",
    href: "disclaimer.html",
    title: "免責文言",
  },
];

test("top page links to legal and safety draft pages", async () => {
  const html = await readFile("src/public/index.html", "utf8");

  assert.match(html, /aria-label="利用前に確認する文書"/);

  for (const page of legalPages) {
    assert.match(html, new RegExp(`href="${page.href}"`));
    assert.match(html, new RegExp(page.title));
  }
});

test("legal pages are static draft pages and allowed by static server", async () => {
  const staticFiles = await readFile("src/server/static-files.mjs", "utf8");

  for (const page of legalPages) {
    const html = await readFile(page.path, "utf8");

    assert.match(html, /Kokoro Navi AI/);
    assert.match(html, new RegExp(page.title));
    assert.match(html, /Phase 1 draft/);
    assert.match(html, /相談画面へ戻る/);
    assert.match(html, /href="index.html"/);
    assert.match(staticFiles, new RegExp(`/${page.href}`));
  }
});
