// 建立與伺服器的連線
const socket = io();

// 儲存玩家顏色、目前輪到誰、雙方分數
let myColor = null;
let currentTurn = null;
let myScore = 0, opponentScore = 0;

// 取得頁面上的 DOM 元素
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");

// 創建對手滑鼠指標的圖示
let opponentCursor = document.createElement('div');
opponentCursor.className = 'opponent-cursor';
document.body.appendChild(opponentCursor);

// 建立 8x8 棋盤的格子
for (let i = 0; i < 64; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.index = i;

  // 滑鼠移入格子時觸發
  cell.addEventListener('mouseenter', () => handleHover(cell));
  // 滑鼠離開格子時清除提示
  cell.addEventListener('mouseleave', () => clearHighlights());

  boardEl.appendChild(cell);
}
let lastHoverValid = false;

socket.on("highlightMove", ({ idx, isValid }) => {
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell) {
    cell.classList.add(isValid ? "highlight" : "invalid");
  }
  lastHoverValid = isValid;
});

// 點擊格子時的行為
boardEl.addEventListener("click", e => {
  const idx = e.target.closest(".cell")?.dataset.index;
 if (!idx || currentTurn !== myColor || !lastHoverValid) return;
  const x = idx % 8;
  const y = Math.floor(idx / 8);

  moveHandToCell(x, y, () => {
    socket.emit("move", parseInt(idx));
  }, false);  // false = 玩家
});



// 滑鼠移入格子時觸發：檢查是否合法並傳送滑鼠位置
function handleHover(cell) {
  clearHighlights();
  const idx = parseInt(cell.dataset.index);
  socket.emit('checkMove', idx);
  socket.emit('mouseMove', idx);
}

// 清除格子的提示樣式
function clearHighlights(keepOpponent = false) {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove('highlight', 'invalid');
    if (!keepOpponent) cell.classList.remove('opponent-hover');
  });
}



// 對手滑鼠位置更新，顯示對手滑鼠所在格子與紅點
socket.on("opponentMouse", idx => {
  const targetCell = document.querySelector(`.cell[data-index='${idx}']`);
  if (!targetCell) return;
  clearHighlights();
  targetCell.classList.add('opponent-hover');

  const rect = targetCell.getBoundingClientRect();
  opponentCursor.style.left = `${rect.left + rect.width / 2}px`;
  opponentCursor.style.top = `${rect.top + rect.height / 2}px`;
});

// 等待對手
socket.on("waitingForOpponent", () => {
  statusEl.textContent = "等待對手加入...";
});

// 伺服器告知玩家的顏色
socket.on("playerColor", color => {
  myColor = color;
  document.getElementById("role").textContent = `您是：${color === "black" ? "⚫ 黑棋" : "⚪ 白棋"}`;
});

// 開始遊戲
socket.on("startGame", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
  document.getElementById('aiButton').style.display = "none"; 
});

// 伺服器回傳更新棋盤
socket.on("updateBoard", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
});

// 伺服器通知該落子不合法
socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});

function moveHandToCell(x, y, callback, isAI = false) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  const hand = document.getElementById('hand');

  if (!cell) return;

  const rect = cell.getBoundingClientRect();

  hand.src = isAI ? 'hand2.png' : 'hand1.png';

  // 切換 CSS class 來對齊圖像碰觸位置
  hand.classList.remove('hand-top', 'hand-bottom');
  hand.classList.add(isAI ?  'hand-bottom': 'hand-top' );

  hand.style.display = 'block';
  hand.style.transition = 'none';

  const targetX = rect.left + rect.width / 2;
  const targetY = rect.top + rect.height / 2;
  const startY = isAI ? -100 : window.innerHeight + 100;

  hand.style.left = `${targetX}px`;
  hand.style.top = `${startY}px`;

  void hand.offsetWidth;

  hand.style.transition = 'left 0.4s ease, top 0.4s ease';
  hand.style.left = `${targetX}px`;
  hand.style.top = `${targetY}px`;

  setTimeout(() => {
    hand.style.display = 'none';
    if (callback) callback();
  }, 800);
}





function placeDiskWithHand(x, y, color, callback) {
  moveHandToCell(x, y, () => {
    const idx = y * 8 + x;
    const cell = document.querySelector(`.cell[data-index='${idx}']`);
    if (cell) {
      const disk = document.createElement('div');
      disk.className = `disk ${color}`;
      cell.appendChild(disk);
    }
    if (callback) callback();
  });
}
function placeDisk(x, y, color) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell) {
    const disk = document.createElement('div');
    disk.className = `disk ${color}`;
    cell.appendChild(disk);
  }
}

// 計算翻轉棋子數並加分
socket.on("moveResult", ({ flippedCount, flippedPositions, player, placedPosition }) => {
  const bonus = flippedCount >= 10 ? 5 : flippedCount >= 5 ? 2 : 1;

  if (placedPosition) {
    const [px, py] = placedPosition;
    const isAI = player === 'white' && myColor === 'black'; // 假設 AI 是 white
    moveHandToCell(px, py, () => {
    placeDisk(px, py, player);
    flippedPositions.forEach(([fx, fy]) => animateFlip(fx, fy));
    updateScore();
  }, isAI);
    
  }

  if (player === myColor) {
    myScore += flippedCount + bonus;
  } else {
    opponentScore += flippedCount + bonus;
  }
});



// 遊戲結束
socket.on("gameOver", ({ black, white, winner }) => {
  let msg = `遊戲結束！黑棋: ${black}, 白棋: ${white}。`;
  msg += winner === "draw" ? " 平手！" : winner === myColor ? " 你贏了！" : " 你輸了！";
  statusEl.textContent = msg;

  // 顯示返回匹配按鈕
  const backBtn = document.createElement("button");
  backBtn.textContent = "返回匹配模式";
  backBtn.id = "backToMatch";
  document.body.appendChild(backBtn);
  backBtn.addEventListener("click", () => {
    window.location.reload(); // 重新載入頁面進入配對
  });
});

// 對手離開
socket.on("opponentLeft", () => {
  statusEl.textContent = "對手已離開房間，遊戲結束。";
});

// 更新棋盤畫面
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

// 更新提示文字（輪到誰）
function updateStatus() {
  if (!myColor || !currentTurn) return;
  statusEl.textContent = myColor === currentTurn ? "輪到你下棋！" : "等待對手下棋...";
}

// 更新分數
function updateScore() {
  scoreEl.textContent = `分數 - 你: ${myScore} | 對手: ${opponentScore}`;
}

// 顯示短暫的提示訊息
function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  setTimeout(() => messageEl.classList.remove("show"), 500);
}

// 棋子翻轉的動畫
function animateFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    cell.firstChild.classList.add('flip');
    setTimeout(() => cell.firstChild.classList.remove('flip'), 400);
  }
}

// 點擊與電腦對戰按鈕
document.getElementById('aiButton').addEventListener('click', () => {
  socket.emit('playAI');
  statusEl.textContent = "與電腦對戰開始！";
  document.getElementById('aiButton').style.display = "none";
});
