# Kokoro Navi AI

心を整え、未来へ進むためのAI相談室の最小構成プロトタイプです。

## 開発状況

現在のプロジェクト名は **Kokoro Navi AI** です。

このプロジェクトは、現時点では **Phase 0.5: AI相談体験プロトタイプ** として進めます。最終ゴールの仮説、Phase計画、開発ルール、フォルダ構成案は [docs/development-rules.md](docs/development-rules.md) にまとめています。

Phase 1に向けた利用規約・プライバシーポリシー・免責文言の叩き台は [docs/legal-and-safety-drafts.md](docs/legal-and-safety-drafts.md) にまとめています。

## できること

- 相談ジャンルを選んで、今の気持ちを入力できます。
- `OPENAI_API_KEY` がある場合は OpenAI Responses API に接続して、Kokoro Navi AI の人格プロンプトで回答します。
- `OPENAI_API_KEY` がない場合も、試作用のやさしい応答で画面の動きを確認できます。
- 回答後に「もっとやさしく」「具体的な一歩」などの深掘りボタンで相談を続けられます。
- 回答をコピーしたり、「新しい相談を始める」で入力欄と回答欄をリセットできます。
- 相談履歴はブラウザの `localStorage` に最大8件保存されます。保存したくない相談は、送信前にチェックを外せます。
- 医療・法律・緊急対応の代わりではないことを画面上で案内し、緊急性が疑われる相談では安全確保を優先した応答に切り替えます。

## 使い方

Node.js 20 以上で以下を実行してください。

```bash
npm start
```

その後、`http://localhost:4173` にアクセスしてください。

## 相談履歴について

相談履歴はサーバーや外部DBではなく、利用中のブラウザ内に保存されます。保存したくない相談は、送信前に「この相談をこのブラウザの履歴に保存する」のチェックを外してください。共有端末で使う場合は、画面の「履歴を削除」ボタンで削除してください。

ブラウザの設定や容量制限で保存できない場合でも、回答はその場で表示されます。

## 安全性について

Kokoro Navi AIは、気持ちを整理するための試作品です。医療・法律・金融など専門判断が必要な内容は断定せず、専門家への相談を促す方針にしています。

自傷・他害・虐待・DVなど緊急性が疑われる言葉が含まれる場合は、通常の相談回答よりも安全確保を優先した案内を返します。

## OpenAI API を使う場合

```bash
OPENAI_API_KEY=sk-... npm start
```

モデルを変更したい場合は `OPENAI_MODEL` を指定できます。未指定の場合は `gpt-5.1` を使用します。

```bash
OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-5.1 npm start
```

## スクリーンショット取得

モバイル幅のスクリーンショットを取得する場合は、先にアプリを起動してください。

```bash
npm install
npm start
```

別のターミナルで Chromium を準備し、スクリーンショット用スクリプトを実行します。

```bash
npx playwright install chromium
npm run screenshot:mobile
```

取得した画像は `screenshots/mobile.png` に保存されます。

### Playwright がない場合

`playwright: command not found` や `Executable doesn't exist` が表示される場合は、Playwrightまたはブラウザ実行ファイルが未インストールです。上記の `npm install` と `npx playwright install chromium` を実行してください。

ネットワーク制限などで npm registry やブラウザのダウンロードにアクセスできない環境では、スクリーンショット取得は実行できません。その場合は、ローカルPCまたは Playwright のブラウザ入りCIイメージなど、外部パッケージを取得できる環境で実行してください。

## 動作確認

```bash
npm run check
npm run smoke
npm run check:consultation
```
