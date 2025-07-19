const socket = io();
let myColor = null;
let currentTurn = null;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");

for (let i = 0; i < 64; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.index = i;
  boardEl.appendChild(cell);
}

boardEl.addEventListener("click", e => {
  const idx = e.target.dataset.index;
  if (!idx || currentTurn !== myColor) return;
  socket.emit("move", parseInt(idx));
});

socket.on("waitingForOpponent", () => {
  statusEl.textContent = "等待對手加入...";
});

socket.on("playerColor", color => {
  myColor = color;
});

socket.on("startGame", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
});

socket.on("updateBoard", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
});

function updateBoard(board) {
  document.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];
    cell.textContent = value === 'black' ? '⚫' : value === 'white' ? '⚪' : '';
  });
}

function updateStatus() {
  if (!myColor || !currentTurn) return;
  if (myColor === currentTurn) {
    statusEl.textContent = "輪到你下棋！";
  } else {
    statusEl.textContent = "等待對手下棋...";
  }
}
