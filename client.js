// 建立與伺服器的 Socket.IO 連線
const socket = io();

// 儲存自己的棋子顏色（"black" 或 "white"）
let myColor = null;

// 當前輪到哪個顏色的玩家
let currentTurn = null;

// 雙方的得分
let myScore = 0, opponentScore = 0;

// 獲取 DOM 元素：棋盤、狀態欄、訊息欄、分數欄
const boardEl = document.getElementById("board");
const statusEl = document.getElementById("status");
const messageEl = document.getElementById("message");
const scoreEl = document.getElementById("score");

// 建立一個用來顯示對手滑鼠位置的虛擬游標
let opponentCursor = document.createElement('div');
opponentCursor.className = 'opponent-cursor';
document.body.appendChild(opponentCursor);

// 產生 64 格棋盤（8x8）
for (let i = 0; i < 64; i++) {
  const cell = document.createElement("div");
  cell.className = "cell";
  cell.dataset.index = i; // 每一格都用 data-index 標記位置

  // 滑鼠移入該格時要檢查合法性與同步游標
  cell.addEventListener('mouseenter', () => handleHover(cell));

  // 滑鼠離開時清除所有高亮
  cell.addEventListener('mouseleave', () => clearHighlights());

  // 將每一格加入棋盤 DOM 中
  boardEl.appendChild(cell);
}

// 點擊棋盤時發送 move 事件給伺服器，延遲 300ms 讓動畫可以先跑
boardEl.addEventListener("click", e => {
  setTimeout(() => {
    const idx = e.target.closest(".cell")?.dataset.index;
    if (!idx || currentTurn !== myColor) return; // 不是自己回合就不能動
    socket.emit("move", parseInt(idx)); // 傳送落子位置
  }, 300);
});

// 滑鼠移到某格時，要求伺服器檢查該格是否合法、並同步滑鼠位置
function handleHover(cell) {
  clearHighlights(); // 每次移動前先清掉所有高亮
  const idx = parseInt(cell.dataset.index);
  socket.emit('checkMove', idx);     // 要求伺服器檢查這步是否合法
  socket.emit('mouseMove', idx);     // 同步滑鼠位置給對手
}

// 清除棋盤上所有格子的高亮狀態
function clearHighlights() {
  document.querySelectorAll(".cell").forEach(cell => {
    cell.classList.remove('highlight', 'invalid', 'opponent-hover');
  });
}

// 當伺服器告知某格是否合法落子時，客戶端更新該格的樣式
socket.on("highlightMove", ({ idx, isValid }) => {
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell) {
    cell.classList.add(isValid ? "highlight" : "invalid");
  }
});

// 接收對手的滑鼠位置，顯示 hover 效果與同步虛擬游標位置
socket.on("opponentMouse", idx => {
  const targetCell = document.querySelector(`.cell[data-index='${idx}']`);
  if (!targetCell) return;

  clearHighlights(); // 先清空前一次高亮
  targetCell.classList.add('opponent-hover'); // 加上對手 hover 樣式

  // 把虛擬游標移到那一格中心位置
  const rect = targetCell.getBoundingClientRect();
  opponentCursor.style.left = `${rect.left + rect.width / 2}px`;
  opponentCursor.style.top = `${rect.top + rect.height / 2}px`;
});

// 等待對手加入時更新畫面提示
socket.on("waitingForOpponent", () => {
  statusEl.textContent = "等待對手加入...";
});

// 告知玩家分配到的顏色
socket.on("playerColor", color => {
  myColor = color;
  document.getElementById("role").textContent = `您是：${color === "black" ? "⚫ 黑棋" : "⚪ 白棋"}`;
});

// 遊戲開始時初始化畫面與狀態
socket.on("startGame", data => {
  updateBoard(data.board);       // 更新棋盤內容
  currentTurn = data.turn;       // 設定當前回合
  updateStatus();                // 更新畫面狀態
  document.getElementById('aiButton').style.display = "none"; // 隱藏 AI 對戰按鈕（若有）
});

// 每次落子或對手行動後，伺服器傳回新棋盤與回合
socket.on("updateBoard", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
});

// 若玩家點了非法位置（例如不能落子處），顯示錯誤訊息
socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});

// 當伺服器回傳落子結果時，更新分數與動畫
socket.on("moveResult", ({ flippedCount, flippedPositions, player, scores }) => {
  console.log(`玩家 ${player} 翻轉了 ${flippedCount} 顆棋子`);
  
  // 不用自己算分數，直接使用 server 傳來的
  myScore = scores[myColor];
  opponentScore = scores[myColor === "black" ? "white" : "black"];

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

let mouseX = 0;
let isJumping = false; // 控制是否正在跳躍動畫中

// 滑鼠移動時圖片左右跟著動（上下不動）
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  if (!isJumping) {
    img.style.transition = "left 0.1s linear";
    img.style.left = `${mouseX}px`;
  }
});

document.addEventListener("click", (e) => {
  if (isJumping) return; // 防止在跳躍時多次觸發
  isJumping = true;

  const jumpTargetX = e.clientX;
  const offsetX = 10;
  const jumpStartX = jumpTargetX + offsetX;

  const windowHeight = window.innerHeight + 100;
  const mouseY = e.clientY;
  const distanceFromBottom = windowHeight - mouseY;
  const jumpHeight = Math.min(distanceFromBottom, 750);

  // 移到起跳點
  img.style.transition = "none";
  img.style.left = `${jumpStartX}px`;
  img.style.transform = `translate(-50%, 0px)`;

  requestAnimationFrame(() => {
    // 第一步：往滑鼠點跳（左 + 上）
    img.style.transition = "transform 0.17s ease-out, left 0.17s ease-out";
    img.style.left = `${jumpTargetX}px`;
    img.style.transform = `translate(-50%, -${jumpHeight}px)`;

    setTimeout(() => {
      // 第二步：左下彈一下
      img.style.transition = "transform 0.05s ease";
      img.style.transform = `translate(-55%, -${jumpHeight - 50}px)`;

      setTimeout(() => {
        // ⭐ 第 2.5 步：停頓 （維持在原地）
        setTimeout(() => {
          // 第三步：回到起跳點（右 + 下來）
          img.style.transition = "transform 0.17s ease-in, left 0.17s ease-in";
          img.style.left = `${jumpStartX}px`;
          img.style.transform = `translate(-50%, 0px)`;

          setTimeout(() => {
            isJumping = false; // 跳完才允許再次跟隨滑鼠
          }, 170); // 確保結束後解除鎖定
        }, 150); // ⭐ 停頓時間
      }, 50); // 第二步結束時間
    }, 170); // 第一步結束時間
  });
});

