const form = document.querySelector("#consultation-form");
const genreInput = document.querySelector("#genre");
const messageInput = document.querySelector("#message");
const answer = document.querySelector("#answer");
const submitButton = form.querySelector("button[type='submit']");

function showAnswer(message, { isEmpty = false } = {}) {
  answer.textContent = message;
  answer.classList.toggle("empty", isEmpty);
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "心を整えています…" : "やさしく整理してもらう";
  answer.classList.toggle("loading", isLoading);
}

async function requestAiReply(genre, message) {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ genre, message }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error ?? "返事を受け取れませんでした。");
  }

  return data;
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const genre = genreInput.value;
  const message = messageInput.value.trim();

  if (!message) {
    showAnswer("まだ言葉にならない時もありますよね。短い一言だけでも大丈夫です。ゆっくり書いてくださいね。", {
      isEmpty: false,
    });
    messageInput.focus();
    return;
  }

  setLoading(true);
  showAnswer("あなたの言葉を受け止めながら、Kokoro Navi AIがやさしく整理しています。", {
    isEmpty: true,
  });

  try {
    const data = await requestAiReply(genre, message);
    const sourceNote = data.source === "fallback" ? "\n\n※ APIキー未設定のため、試作用のやさしい応答を表示しています。" : "";
    showAnswer(`${data.reply}${sourceNote}`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "返事を受け取れませんでした。";
    showAnswer(`${errorMessage}\n\n少し時間をおいて、もう一度送ってくださいね。`);
  } finally {
    setLoading(false);
  }
});
