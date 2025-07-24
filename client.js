// === client.js ===
const socket = io();
let myColor = null;
let currentTurn = null;
let myScore = 0, opponentScore = 0;

const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");

let opponentCursor = document.createElement('div');
opponentCursor.className = 'opponent-cursor';
document.body.appendChild(opponentCursor);

for (let i = 0; i < 64; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.index = i;

  cell.addEventListener('mouseenter', () => handleHover(cell));
  cell.addEventListener('mouseleave', () => clearHighlights());
  boardEl.appendChild(cell);
}

boardEl.addEventListener("click", e => {
  const idx = e.target.closest(".cell")?.dataset.index;
  if (!idx || currentTurn !== myColor) return;
  socket.emit("move", parseInt(idx));
});

function handleHover(cell) {
  clearHighlights();
  const idx = parseInt(cell.dataset.index);
  socket.emit('checkMove', idx);
  socket.emit('mouseMove', idx);
}

function clearHighlights() {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove('highlight', 'invalid', 'opponent-hover');
  });
}

socket.on("highlightMove", ({ idx, isValid }) => {
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell) {
    cell.classList.add(isValid ? "highlight" : "invalid");
  }
});

socket.on("opponentMouse", idx => {
  const targetCell = document.querySelector(`.cell[data-index='${idx}']`);
  if (!targetCell) return;
  clearHighlights();
  targetCell.classList.add('opponent-hover');

  const rect = targetCell.getBoundingClientRect();
  opponentCursor.style.left = `${rect.left + rect.width / 2}px`;
  opponentCursor.style.top = `${rect.top + rect.height / 2}px`;
});

socket.on("waitingForOpponent", () => {
  statusEl.textContent = "等待對手加入...";
});

socket.on("playerColor", color => {
  myColor = color;
  document.getElementById("role").textContent = `您是：${color === "black" ? "⚫ 黑棋" : "⚪ 白棋"}`;
});

socket.on("startGame", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
  document.getElementById('aiButton').style.display = "none"; 
});

socket.on("updateBoard", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
});

socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});

socket.on("moveResult", ({ flippedCount, flippedPositions, player }) => {
  const bonus = flippedCount >= 10 ? 5 : flippedCount >= 5 ? 2 : 1;
  if (player === myColor) {
    myScore += flippedCount + bonus;
  } else {
    opponentScore += flippedCount + bonus;
  }
  flippedPositions.forEach(([x, y]) => animateFlip(x, y));
  updateScore();
});

socket.on("gameOver", ({ black, white, winner }) => {
  let msg = `遊戲結束！黑棋: ${black}, 白棋: ${white}。`;
  msg += winner === "draw" ? " 平手！" : winner === myColor ? " 你贏了！" : " 你輸了！";
  statusEl.textContent = msg;
});

socket.on("opponentLeft", () => {
  statusEl.textContent = "對手已離開房間，遊戲結束。";
});
function hasValidMove(board, color) {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!board[y][x] && getFlippable(board, x, y, color).length > 0) {
        return true;
      }
    }
  }
  return false;
}

function updateBoard(board) {
  let black = 0, white = 0;
  document.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];

    cell.innerHTML = "";

    if (value) {
      const disk = document.createElement("div");
      disk.className = `disk ${value}`;
      cell.appendChild(disk);

      if (value === "black") black++;
      else white++;
    }
  });
  document.getElementById("blackCount").textContent = black;
  document.getElementById("whiteCount").textContent = white;
}
function showMessage(text) {
  const box = document.getElementById("messageBox");
  box.innerText = text;
}

function updateStatus() {
  if (!myColor || !currentTurn) return;
  statusEl.textContent = myColor === currentTurn ? "輪到你下棋！" : "等待對手下棋...";
}

function updateScore() {
  scoreEl.textContent = `分數 - 你: ${myScore} | 對手: ${opponentScore}`;
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  setTimeout(() => messageEl.classList.remove("show"), 500);
}

function animateFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    cell.firstChild.classList.add('flip');
    setTimeout(() => cell.firstChild.classList.remove('flip'), 400);
  }
}

document.getElementById('aiButton').addEventListener('click', () => {
  socket.emit('playAI');
  statusEl.textContent = "與電腦對戰開始！";
  document.getElementById('aiButton').style.display = "none";
});

socket.on("pass", ({ skippedColor, nextTurn }) => {
  if (skippedColor === myColor) {
    showMessage("你沒有合法步數，自動跳過這一回合。");
  } else {
    showMessage("對手無法下棋，跳過回合！");
  }
  currentTurn = nextTurn;
  updateStatus();
});

const img = document.getElementById("floating-img");

document.addEventListener("mousemove", (e) => {
  const mouseX = e.clientX;
  img.style.left = `${mouseX}px`;
});

document.addEventListener("click", (e) => {
  const windowHeight = window.innerHeight;
  const mouseY = e.clientY;

  // 根據滑鼠距離底部的距離算出跳躍高度（最多跳 300px）
  const distanceFromBottom = windowHeight - mouseY;
  const jumpHeight = Math.min(distanceFromBottom, 500); // 最多跳 300px

  // 加動畫 class 或直接套 transform
  img.style.transition = "transform 0.2s ease-out";
  img.style.transform = `translate(-50%, -${jumpHeight}px)`;

  // 再跳回來
  setTimeout(() => {
    img.style.transition = "transform 0.2s ease-in";
    img.style.transform = `translate(-50%, 0px)`;
  }, 200);
});

