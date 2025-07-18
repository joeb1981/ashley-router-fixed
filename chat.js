
let threadId = null;
const form = document.getElementById("form");
const input = document.getElementById("input");
const chat = document.getElementById("chat");
const resetBtn = document.getElementById("resetBtn");

function addMessage(text, sender, isUser = false) {
  const msg = document.createElement("div");
  msg.className = "msg " + (isUser ? "user" : "bot");
  msg.innerHTML = `<div class="sender">${sender}</div><div>${text}</div>`;
  chat.appendChild(msg);
  chat.scrollTop = chat.scrollHeight;
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, "Scott", true);
  input.value = "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: text, threadId }),
  });

  const data = await res.json();
  if (data.reply) {
    threadId = data.threadId;
    addMessage(data.reply, data.sender);
  } else {
    addMessage("Oops! Something went wrong.", "System");
  }
});

resetBtn.addEventListener("click", () => {
  chat.innerHTML = "";
  threadId = null;
});
