const crisisKeywords = [
  "死にたい",
  "消えたい",
  "自殺",
  "自傷",
  "殺したい",
  "殴られる",
  "虐待",
  "DV",
  "逃げたい",
];

export function hasCrisisSignal(message) {
  return crisisKeywords.some((keyword) => message.includes(keyword));
}

export function createCrisisReply() {
  return [
    "話してくれてありがとうございます。今、とても苦しい状態の中で言葉にしてくれたのですね。まず、あなたの安全がいちばん大切です。",
    "もし今すぐ自分や誰かを傷つけてしまいそうな危険がある場合は、この画面を閉じても大丈夫なので、近くの人、地域の緊急通報、医療機関、相談窓口につながってください。",
    "一人で耐えようとしなくて大丈夫です。今は正しい答えを出す時間ではなく、安全な場所と助けにつながる時間です。",
    "できれば、近くにいる人へ『今ひとりでいるのが危ないです』と短く伝えてください。言葉がまとまらなくても、その一言だけで十分です。",
  ].join("\n\n");
}
