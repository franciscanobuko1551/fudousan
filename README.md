# Kokoro Navi AI

心を整え、未来へ進むためのAI相談室の最小構成プロトタイプです。

## できること

- 相談ジャンルを選んで、今の気持ちを入力できます。
- `OPENAI_API_KEY` がある場合は OpenAI Responses API に接続して、Kokoro Navi AI の人格プロンプトで回答します。
- `OPENAI_API_KEY` がない場合も、試作用のやさしい応答で画面の動きを確認できます。

## 使い方

Node.js 20 以上で以下を実行してください。

```bash
npm start
```

その後、`http://localhost:4173` にアクセスしてください。

## OpenAI API を使う場合

```bash
OPENAI_API_KEY=sk-... npm start
```

モデルを変更したい場合は `OPENAI_MODEL` を指定できます。未指定の場合は `gpt-5.1` を使用します。

```bash
OPENAI_API_KEY=sk-... OPENAI_MODEL=gpt-5.1 npm start
```

## 動作確認

```bash
npm run check
```
