// === client.js ===
const socket = io();
let myColor = null;
let currentTurn = null;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");

for (let i = 0; i < 64; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.index = i;
  boardEl.appendChild(cell);
}

boardEl.addEventListener("click", e => {
  const idx = e.target.closest(".cell")?.dataset.index;
  if (!idx || currentTurn !== myColor) return;
  socket.emit("move", parseInt(idx));
});

socket.on("waitingForOpponent", () => {
  statusEl.textContent = "等待對手加入...";
});



socket.on("playerColor", color => {
  myColor = color;
  const roleEl = document.getElementById("role");
  roleEl.textContent = `您是：${color === "black" ? "⚫ 黑棋" : "⚪ 白棋"}`;
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

socket.on("invalidMove", () => {
  const messageEl = document.getElementById("message");
  messageEl.textContent = "這不是合法的落子位置";
  messageEl.classList.add("show");
  setTimeout(() => {
    messageEl.classList.remove("show");
  }, 500);
});

socket.on("gameOver", ({ black, white, winner }) => {
  let msg = `遊戲結束！黑棋: ${black}, 白棋: ${white}。`;
  if (winner === "draw") msg += " 平手！";
  else msg += winner === myColor ? " 你贏了！" : " 你輸了！";
  statusEl.textContent = msg;
});

socket.on("opponentLeft", () => {
  statusEl.textContent = "對手已離開房間，遊戲結束。";
});

function updateBoard(board) {
  let black = 0, white = 0;
  document.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];

    // 取得前一個棋子顏色（若存在）
    const prevDisk = cell.querySelector(".disk");
    const prevColor = prevDisk?.classList.contains("black") ? "black" :
                      prevDisk?.classList.contains("white") ? "white" : null;

    // 清空目前這格
    cell.innerHTML = "";

    if (value) {
      const disk = document.createElement("div");

      // 判斷是否是變色，若是則加上 flip class
      const isFlipped = prevColor && prevColor !== value;
      disk.className = `disk ${value}${isFlipped ? " flip" : ""}`;

      // 初始動畫縮放效果
      disk.style.transform = "scale(0)";
      setTimeout(() => disk.style.transform = "scale(1)", 10);
      cell.appendChild(disk);

      // 累加數量
      if (value === "black") black++;
      else white++;
    }
  });

  // 更新棋子數量顯示
  document.getElementById("blackCount").textContent = black;
  document.getElementById("whiteCount").textContent = white;
}

function updateStatus() {
  if (!myColor || !currentTurn) return;
  if (myColor === currentTurn) {
    statusEl.textContent = "輪到你下棋！";
  } else {
    statusEl.textContent = "等待對手下棋...";
  }
} 

function placeDisk(row, col, color, animate = false) {
  const cell = document.querySelector(`.cell[data-row='${row}'][data-col='${col}']`);
  if (!cell) return;
  let disk = cell.querySelector(".disk");
  if (!disk) {
    disk = document.createElement("div");
    disk.classList.add("disk");
    cell.appendChild(disk);
  }
  disk.className = "disk " + color + (animate ? " flip" : "");
}