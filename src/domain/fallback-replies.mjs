import { genreHints } from "./consultation-policy.mjs";

const modeReplies = {
  gentle: "今は、がんばって前向きになろうとしなくても大丈夫です。まずは『そう感じている自分がいるんだな』と、そっと認めるだけで十分です。",
  steps: "今日の小さな一歩は、紙に今の気持ちを三つだけ書くことです。できたら、その中で一番軽くできそうなことを一つ選んでみましょう。",
  organize: "整理すると、今は『気持ちが重いこと』『先が見えにくいこと』『それでも変わりたい気持ちがあること』が重なっているのかもしれません。",
  hope: "今はまだ道がはっきり見えなくても、こうして言葉にできたことが未来への小さな灯りです。焦らず、その灯りを一緒に守っていきましょう。",
};

const professionalTopicKeywords = [
  "医療",
  "病気",
  "治療",
  "診断",
  "眠れ",
  "動悸",
  "法律",
  "契約",
  "借金",
  "金融",
  "投資",
  "お金",
];

function hasProfessionalTopic(message) {
  return professionalTopicKeywords.some((keyword) => message.includes(keyword));
}

export function createFallbackReply(genre, message, mode = "initial") {
  const hint = genreHints[genre] ?? genreHints.人生相談;
  const baseReply = [
    `お話ししてくれてありがとうございます。${genre}について、今とても丁寧に向き合おうとしているのですね。`,
    `「${message}」という気持ちがあるのは、決して弱さではありません。ここまで頑張ってきたあなたの心が、少し立ち止まってほしいと教えてくれているのかもしれません。`,
    hint,
  ];
  const professionalBoundary = hasProfessionalTopic(message)
    ? "医療・法律・金融などの専門的な判断が必要そうな部分は、ここだけで決めず、専門家や公的な相談窓口にもつながってください。Kokoro Navi AIは診断、治療、法的判断、金融判断の代わりではありません。"
    : "";

  return [
    ...baseReply,
    professionalBoundary,
    modeReplies[mode] ?? "まずは、今の気持ちに一つだけ名前をつけてみてください。次に、深呼吸をする、紙に書く、信頼できる人に一言話すなど、今日できるいちばん小さな行動を一つだけ選びましょう。",
    "あなたは一人で急いで答えを出さなくて大丈夫。ここから少しずつ、安心できる未来の輪郭を一緒に整えていきましょう。",
  ].filter(Boolean).join("\n\n");
}
