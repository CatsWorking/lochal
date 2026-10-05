const WS_BASE = "wss://lochal.lochal.workers.dev";

const $ = (id) => document.getElementById(id);
const login = $("login"), chat = $("chat");
const loginForm = $("loginForm"), messageForm = $("messageForm");
const messages = $("messages"), messageInput = $("message");
const errorBox = $("loginError"), connection = $("connection");

let socket = null;
let me = null;

function addMessage(data) {
  const row = document.createElement("div");
  row.className = "message";

  if (data.type === "system") {
    row.classList.add("system");
    row.textContent = `[ ${data.text} ]`;
  } else {
    const time = document.createElement("span");
    time.className = "time";
    time.textContent = new Date(data.at).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"});
    const name = document.createElement("span");
    name.className = "name";
    name.textContent = data.username + ":";
    name.style.color = data.color || "#66ff99";
    const text = document.createElement("span");
    text.textContent = " " + data.text;
    row.append(time, name, text);
  }
  messages.appendChild(row);
  messages.scrollTop = messages.scrollHeight;
}

function setConnection(text) {
  connection.textContent = `[ ${text} ]`;
}

loginForm.addEventListener("submit", (event) => {
  event.preventDefault();
  errorBox.textContent = "";

  const username = $("username").value.trim();
  const color = $("nameColor").value;
  const room = $("room").value.trim();

  if (!/^[-A-Za-z0-9_]{2,20}$/.test(username)) {
    errorBox.textContent = "Invalid username.";
    return;
  }
  if (!/^[A-Za-z0-9_-]{1,32}$/.test(room)) {
    errorBox.textContent = "Invalid room name.";
    return;
  }

  me = {username, color, room};
  const url = `${WS_BASE.replace(/\/$/, "")}/room/${encodeURIComponent(room)}`;
  socket = new WebSocket(url);

  setConnection("CONNECTING");

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({
      type: "join",
      username,
      color
    }));
  });

  socket.addEventListener("message", (event) => {
    let data;
    try { data = JSON.parse(event.data); } catch { return; }

    if (data.type === "error") {
      errorBox.textContent = data.text;
      socket.close();
      return;
    }

    if (data.type === "joined") {
      login.classList.add("hidden");
      chat.classList.remove("hidden");
      $("roomLabel").textContent = `room: ${me.room}`;
      setConnection("ONLINE");
      messageInput.focus();
      messages.replaceChildren();
      return;
    }

    if (data.type === "history") {
      data.messages.forEach(addMessage);
      return;
    }

    if (data.type === "message" || data.type === "system") {
      addMessage(data);
      if (data.type === "message" && data.username !== me.username) playPing();
      return;
    }
  });

  socket.addEventListener("close", () => {
    setConnection("OFFLINE");
  });

  socket.addEventListener("error", () => {
    setConnection("ERROR");
    errorBox.textContent = "Could not connect to the chat server.";
  });
});

messageForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = messageInput.value.trim();
  if (!text || !socket || socket.readyState !== WebSocket.OPEN) return;
  socket.send(JSON.stringify({type:"message", text}));
  messageInput.value = "";
  messageInput.focus();
});

$("leave").addEventListener("click", () => {
  if (socket) socket.close();
  location.reload();
});

// Small terminal-like notification sound generated locally; no audio file needed.
function playPing() {
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(720, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(980, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.045, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.09);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {}
}
