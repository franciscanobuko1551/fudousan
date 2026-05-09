const form = document.querySelector("#consultation-form");
const genreInput = document.querySelector("#genre");
const messageInput = document.querySelector("#message");
const answer = document.querySelector("#answer");
const submitButton = form.querySelector("button[type='submit']");
const followUpButtons = [...document.querySelectorAll("[data-mode]")];
const historyList = document.querySelector("#history-list");
const clearHistoryButton = document.querySelector("#clear-history");

const historyStorageKey = "kokoro-navi-ai:consultation-history";
const maxHistoryItems = 8;
const maxMessageLength = 2000;

let currentConsultation = null;

const modeLabels = {
  initial: "最初の相談",
  gentle: "もっとやさしく",
  steps: "具体的な一歩",
  organize: "気持ちを整理",
  hope: "未来への励まし",
};

function showAnswer(message, { isEmpty = false } = {}) {
  answer.textContent = message;
  answer.classList.toggle("empty", isEmpty);
}

function setLoading(isLoading) {
  submitButton.disabled = isLoading;
  submitButton.textContent = isLoading ? "心を整えています…" : "やさしく整理してもらう";
  followUpButtons.forEach((button) => {
    button.disabled = isLoading || !currentConsultation;
  });
  answer.classList.toggle("loading", isLoading);
}

function getHistory() {
  try {
    const savedHistory = JSON.parse(localStorage.getItem(historyStorageKey) ?? "[]");
    return Array.isArray(savedHistory) ? savedHistory : [];
  } catch {
    return [];
  }
}

function saveHistoryItem(item) {
  try {
    const history = [item, ...getHistory()].slice(0, maxHistoryItems);
    localStorage.setItem(historyStorageKey, JSON.stringify(history));
  } catch {
    showAnswer(`${item.reply}\n\n※ このブラウザでは相談履歴を保存できませんでした。回答はこの画面で確認できます。`);
  }
  renderHistory();
}

function createHistoryId() {
  return globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(isoDate) {
  return new Intl.DateTimeFormat("ja-JP", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoDate));
}

function createHistoryButton(item) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "history-item";
  button.innerHTML = `
    <span class="history-meta">${formatDate(item.createdAt)}・${item.genre}・${modeLabels[item.mode] ?? item.mode}</span>
    <span class="history-message"></span>
  `;
  button.querySelector(".history-message").textContent = item.message;
  button.addEventListener("click", () => {
    currentConsultation = {
      genre: item.genre,
      message: item.message,
      reply: item.reply,
    };
    genreInput.value = item.genre;
    messageInput.value = item.message;
    showAnswer(item.reply);
    setLoading(false);
    answer.scrollIntoView({ behavior: "smooth", block: "start" });
  });
  return button;
}

function renderHistory() {
  const history = getHistory();
  historyList.innerHTML = "";
  historyList.classList.toggle("empty-history", history.length === 0);

  if (history.length === 0) {
    historyList.textContent = "まだ相談履歴はありません。";
    clearHistoryButton.disabled = true;
    return;
  }

  clearHistoryButton.disabled = false;
  history.forEach((item) => historyList.append(createHistoryButton(item)));
}

async function requestAiReply(genre, message, mode = "initial") {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ genre, message, mode }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error ?? "返事を受け取れませんでした。");
  }

  return data;
}

async function sendConsultation({ genre, message, mode = "initial" }) {
  setLoading(true);
  showAnswer("あなたの言葉を受け止めながら、Kokoro Navi AIがやさしく整理しています。", {
    isEmpty: true,
  });

  try {
    const data = await requestAiReply(genre, message, mode);
    const sourceNote = data.source === "fallback" ? "\n\n※ APIキー未設定のため、試作用のやさしい応答を表示しています。" : "";
    const reply = `${data.reply}${sourceNote}`;

    currentConsultation = { genre, message, reply };
    showAnswer(reply);
    saveHistoryItem({
      id: createHistoryId(),
      createdAt: new Date().toISOString(),
      genre,
      message,
      mode,
      reply,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "返事を受け取れませんでした。";
    showAnswer(`${errorMessage}\n\n少し時間をおいて、もう一度送ってくださいね。`);
  } finally {
    setLoading(false);
  }
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

  if (message.length > maxMessageLength) {
    showAnswer(`相談内容が少し長いようです。まずは${maxMessageLength}文字以内に短くして、いちばん聞いてほしいことから送ってくださいね。`, {
      isEmpty: false,
    });
    messageInput.focus();
    return;
  }

  await sendConsultation({ genre, message });
});

followUpButtons.forEach((button) => {
  button.addEventListener("click", async () => {
    if (!currentConsultation) {
      return;
    }

    await sendConsultation({
      genre: currentConsultation.genre,
      message: currentConsultation.message,
      mode: button.dataset.mode,
    });
  });
});

clearHistoryButton.addEventListener("click", () => {
  try {
    localStorage.removeItem(historyStorageKey);
  } catch {
    showAnswer("このブラウザでは履歴を削除できませんでした。ブラウザ設定からサイトデータを削除してくださいね。", {
      isEmpty: false,
    });
  }
  renderHistory();
});

renderHistory();
setLoading(false);
