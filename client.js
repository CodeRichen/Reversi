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
// const scoreEl = document.getElementById("score");
const audio_place = new Audio("place.mp3");
const audio_meow = new Audio("meow.mp3");
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

// 點擊棋盤時發送 move 事件給伺服器
boardEl.addEventListener("click", e => {

    const idx = e.target.closest(".cell")?.dataset.index;
    if (!idx || currentTurn !== myColor) return; // 不是自己回合就不能動
    socket.emit("move", parseInt(idx)); // 傳送落子位置
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
  // 棋盤影片（cat 系列）
  const catVideo = document.getElementById("board-video");
  const catSource = document.getElementById("board-video-source");
  const boardImage = document.getElementById("board-image");

  const bcat =  ["cat_b1.jpg","cat_b2.jpg","cat_b3.jpg","cat_b5.jpg","cat_b1.mp4","cat_b2.mp4" ];
  const wcat = ["cat_w1.jpg","cat_w1.mp4","cat_w2.mp4","cat_w3.mp4"];
  const wbcat = ["cat_wb1.jpg"];

  // 根據玩家顏色組出可用的背景列表
  let availableBackgrounds = [];
  if (color === "black") {
    availableBackgrounds = [...bcat, ...wbcat];
  } else {
    availableBackgrounds = [...wcat, ...wbcat];
  }

  const randomCat = availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
  catSource.src = `picture/${randomCat}`;

  const mediaPath = `picture/${randomCat}`;
    const isVideo = randomCat.endsWith(".mp4");
    if (isVideo) {
    // 顯示影片，隱藏圖片
    boardImage.style.display = "none";
    catVideo.style.display = "block";
    catSource.src = mediaPath;
    catVideo.load();
    catVideo.play();
  } else {
    // 顯示圖片，隱藏影片
    catVideo.style.display = "none";
    boardImage.style.display = "block";

    boardImage.src = mediaPath;
  }

 const bgVideo = document.getElementById("bgVideo");
const bgImage = document.getElementById("bgImage");

// 背景檔案清單
const bBackgrounds = ["b-background1.mp4", "b-background2.mp4", "b-background1.jpg", "b-background2.jpg", "b-background3.jpg", "b-background4.jpg"];
const wBackgrounds = ["w-background1.mp4", "w-background1.jpg", "w-background2.jpg"];
const wbBackgrounds = ["wb-background1.mp4", "wb-background1.jpg"];

// 假設玩家顏色

// 組出可用背景
 availableBackgrounds = [];
if (color === "black") {
  availableBackgrounds = [...bBackgrounds, ...wbBackgrounds];
} else {
  availableBackgrounds = [...wBackgrounds, ...wbBackgrounds];
}

// 隨機選一個
const randomBg = availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
 const mediaPath2 = `picture/${randomBg}`;
 const isVideo2 = randomBg.endsWith(".mp4");

if (isVideo2) {
  bgImage.style.display = "none";
  bgVideo.style.display = "block";
  bgVideo.src = mediaPath2;
  bgVideo.play();
} else {
  bgVideo.pause();
  bgVideo.style.display = "none";
  bgImage.style.display = "block";
  bgImage.src = mediaPath2;
}

});


// 遊戲開始時初始化畫面與狀態
socket.on("startGame", data => {
  currentTurn = data.turn;       // 設定當前回合
  const aiBtn = document.getElementById('aiButton');
if (aiBtn) {
  aiBtn.style.display = "none";
} else {
  console.warn("找不到 aiButton，可能尚未載入 DOM！");
}
  updateStatus();                // 更新畫面狀態
  // updateBoard(data.board);       // 更新棋盤內容
   initializeMask();
   renderScore(2, "blackScore");
  renderScore(2, "whiteScore");

});
function triggerClickWithCoords(element) {
  const rect = element.getBoundingClientRect();
  const centerX = rect.left + rect.width / 2;
  const centerY = rect.top + rect.height / 2;

  const customEvent = new MouseEvent("click", {
    clientX: centerX,
    clientY: centerY,
    bubbles: true
  });

  element.dispatchEvent(customEvent);
}
const cells = document.querySelectorAll(".cell"); 
cells.forEach(cell => cell.classList.remove("highlight-row", "special"));

let firstDigit = null;    // 紀錄目前選到哪一行
let currentRow = null;    // 當前選到的 row
let currentCol = null;    // 當前選到的 col (左右模式)
let inCellMode = false;   // 是否進入「單點模式」

function highlightRow(row) {
  cells.forEach(cell => cell.classList.remove("highlight-row", "special"));
  currentRow = row;
  inCellMode = false;
  const start = (row - 1) * 8;
  for (let i = 0; i < 8; i++) {
    cells[start + i].classList.add("highlight-row");
  }
}

function highlightCell(row, col) {
  cells.forEach(cell => cell.classList.remove("highlight-row", "special"));
  currentRow = row;
  currentCol = col;
  inCellMode = true;
  const index = (row - 1) * 8 + (col - 1);
  const cell = document.querySelector(`.cell[data-index="${index}"]`);
  if (cell) cell.classList.add("special");
}

function triggerCellClick(row, col) {
  const index = (row - 1) * 8 + (col - 1);
  const cell = document.querySelector(`.cell[data-index="${index}"]`);
  if (cell) {
    const rect = cell.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const customEvent = new MouseEvent("click", {
      clientX: centerX,
      clientY: centerY,
      bubbles: true
    });
    cell.dispatchEvent(customEvent);
  }
}

// 鍵盤監聽
document.addEventListener("keydown", (event) => {
  // C 鍵快捷
  if (event.key === "c" || event.key === "C") {
    triggerClickWithCoords(aiButton);
  }

  // 數字鍵 (1~8)
  if (event.key >= "1" && event.key <= "8") {
    const digit = parseInt(event.key, 10);

    if (firstDigit === null) {
      // 第一次數字 → 鎖定 row
      highlightRow(digit);
      firstDigit = digit;
    } else {
      // 第二次數字 → 在目前 row 下棋
      const row = currentRow; // 注意這裡是 currentRow (可能已經被上下鍵移動過)
      const col = digit;
      highlightCell(row, col);
      triggerCellClick(row, col);

      // 重置
      firstDigit = null;
      inCellMode = false;
      cells.forEach(cell => cell.classList.remove("highlight-row", "special"));
    }
    return;
  }

  if (firstDigit !== null) {
    // 上下移動 row (支援循環)
    if (event.key === "ArrowUp") {
      const newRow = currentRow > 1 ? currentRow - 1 : 8; // 從 1 再往上 → 跳到 8
      if (inCellMode) highlightCell(newRow, currentCol);
      else highlightRow(newRow);
    }
    if (event.key === "ArrowDown") {
      const newRow = currentRow < 8 ? currentRow + 1 : 1; // 從 8 再往下 → 跳到 1
      if (inCellMode) highlightCell(newRow, currentCol);
      else highlightRow(newRow);
    }

    // 左右移動 col (支援環繞)
    if (event.key === "ArrowLeft") {
      if (!inCellMode) {
        highlightCell(currentRow, 1); //TODO 數字之後再按右健能夠位在從左邊數來第一個可下位置
      } else {
        const newCol = currentCol > 1 ? currentCol - 1 : 8;
        highlightCell(currentRow, newCol);
      }
    }
    if (event.key === "ArrowRight") {
      if (!inCellMode) {
        highlightCell(currentRow, 1);
      } else {
        const newCol = currentCol < 8 ? currentCol + 1 : 1;
        highlightCell(currentRow, newCol);
      }
    }

    // Enter 下棋 (單點模式用)
    if (event.key === "Enter" && inCellMode) {
      triggerCellClick(currentRow, currentCol);

      // 重置
      firstDigit = null;
      inCellMode = false;
      cells.forEach(cell => cell.classList.remove("highlight-row", "special"));
    }
  }
});



// 每次落子或對手行動後，伺服器傳回新棋盤與回合
socket.on("updateBoard", data => {
  
  setTimeout(()=>{
  updateBoard(data.board);
  },1000)  // 時間同步 2A
  currentTurn = data.turn;
  updateStatus();
  const overlayImg = document.getElementById("cat_bw");
  // console.log(`當前回合: ${currentTurn}, 我的顏色: ${myColor}`);
  // 假設是依據目前輪到誰
  const boardFrame = document.getElementById('board-frame');
      const inners = document.querySelectorAll(".edge-horizontal .inner, .edge-vertical .inner");

  if (currentTurn === myColor) {
    // boardFrame.classList.add('glowing');  
    // playBorderAnimationOnTurn(); TODO
  document.querySelectorAll(".inner").forEach(inner => {
    inner.classList.remove("paused");
  });
const inners = document.querySelectorAll(".inner");

function loop() {
  inners.forEach(inner => inner.classList.remove("paused2"));
  setTimeout(() => {
    inners.forEach(inner => inner.classList.add("paused2"));
    setTimeout(loop, 7000); //TODO 小人休息時間
  }, 500);
}
loop();

  }
  else{
    // resetBorderVideos();
      document.querySelectorAll(".inner").forEach(inner => {
    inner.classList.add("paused");
  });
    // boardFrame.classList.remove('glowing');
  }
  if (currentTurn === "black" || currentTurn === "white") {
    overlayImg.style.display = "block"; // 顯示圖片
  if (currentTurn === "black") {
    overlayImg.src = "cat_b.png";
  } else {
    overlayImg.src = "cat_w.png";
  }}
  else {
    // 如果不符合條件就隱藏
    overlayImg.style.display = "none";
  }
document.querySelectorAll(".cell").forEach((cell, i) => {
  const y = Math.floor(i / 8);
  const x = i % 8;

  // 清除之前的 fogged 樣式
  cell.classList.remove("fogged");

  // console.log(`更新格子 (${x}, ${y})`);

  if (data.board[y][x]) {
    // 有棋子 → 加上 fogged 效果
    cell.classList.add("fogged");
  } else {
    // 無棋子 → 清空內容
    // cell.innerHTML = "";
  }

});

});

// 若玩家點了非法位置（例如不能落子處），顯示錯誤訊息
socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});
socket.on("place", ({i,board}) => {
    audio_place.play();
    updatechess(i,board)
});
socket.on("placeidx", idx => {

      const targetIndex = idx; 
const specialCell = boardEl.querySelector(`[data-index="${targetIndex}"]`);
  specialCell.classList.add("special"); 
});
// 當伺服器回傳落子結果時，更新分數與動畫
socket.on("moveResult", ({ flippedCount, flippedPositions, player, scores,idx }) => {
    const x = idx % 8;
    const y = Math.floor(idx / 8);
  updateBoardOffset(flippedPositions);
  // console.log(`玩家 ${player} 翻轉了 ${flippedCount} 顆棋子`);
    if (flippedCount > 0) {
    audio_meow.play();
  }
    if (flippedCount >= 5) {
    const board = document.getElementById("board-frame");
    board.classList.add("shake");
    setTimeout(() => board.classList.remove("shake"), 800);
  }
  // 不用自己算分數，直接使用 server 傳來的
  myScore = scores[myColor];
  opponentScore = scores[myColor === "black" ? "white" : "black"];
    document.querySelectorAll('.disk.swing').forEach(disk => {
    disk.classList.remove('swing');
  });
  document.querySelectorAll('.note').forEach(note => note.remove());
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('special'));
  // 排序：依照與下棋點的距離
const sortedFlipped = flippedPositions
  .map(([fx, fy]) => {
    const dx = fx - x;
    const dy = fy - y;
    const dist = dx * dx + dy * dy; // 平方距離，不用開根號比較快
    return { fx, fy, dist };
  })
  .sort((a, b) => a.dist - b.dist);
  
   sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => animateFlip(fx, fy), i * 100); // 每顆延遲一點時間
   });
// 依序翻轉
 setTimeout(() => {
   sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => animateafterFlip(fx, fy), i * 100); // 每顆延遲一點時間
   });
   updateScore();
 }, 1000); // 時間同步 1A
});



socket.on("gameOver", ({ black, white, winner}) => {
  // let msg = `遊戲結束！黑棋: ${black}, 白棋: ${white}。`;
  // msg += winner === "draw" ? " 平手！" : winner === myColor ? " 你贏了！" : " 你輸了！";
  // statusEl.textContent = msg;
    initializeMask();
    
  showGameOver(winner);
});

function showGameOver(winner) {
  let overlay = document.getElementById("game-over-overlay");

  // 如果不存在就建立
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = "game-over-overlay";
    document.body.appendChild(overlay);
  }

  // 清空舊的內容
  overlay.innerHTML = "";
  
  // 根據顏色加 class
  if (myColor === "black") {
    overlay.classList.add("dark");
    overlay.classList.remove("light");
    overlay.classList.remove("striped");
  } else if (myColor === "white") {
    overlay.classList.add("light");
    overlay.classList.remove("dark");
    overlay.classList.remove("striped");
  }
  if (winner === "draw") {
  }

  // 建立三行文字
  let texts = [];
  for (let i = 0; i < 3; i++) {
    let text = document.createElement("div");
    text.className = "game-over-text hidden"; // 初始隱藏
    texts.push(text);
    overlay.appendChild(text);
  }

  // 設定文字內容
  if (winner === "draw") {
    texts[0].textContent = "THIS";
    texts[1].textContent = "ARE";
    texts[2].textContent = "DRAW";
  } else if (winner === myColor) {
    texts[0].textContent = "YOU";
    texts[1].textContent = "ARE";
    texts[2].textContent = "WINNER";
  } else {
    texts[0].textContent = "YOU";
    texts[1].textContent = "ARE";
    texts[2].textContent = "LOSER";
  }

  // 延遲依序顯示文字
  texts.forEach((t, i) => {
    setTimeout(() => {
      t.classList.remove("hidden");
      t.classList.add("show", `slide-${i % 2 === 0 ? "left" : "right"}`);
    }, 1000 + i * 500);
  });

  // 3 秒後清空
  setTimeout(() => {
    overlay.remove();
  }, 1000 + texts.length * 500 + 3000);
}



socket.on("opponentLeft", () => {
  statusEl.textContent = "對手已離開房間，遊戲結束。";
   initializeMask();
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

function updatechess(idx,board){
  document.querySelectorAll(".cell").forEach((cell, i) => {
    if(i===idx){
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];
    const oldDisk = cell.querySelector(".disk");
    if (oldDisk) oldDisk.remove();
    if (value) {
      const disk = document.createElement("div");
      disk.className = `disk ${value}`;
      disk.id='disk';
        if (value === "white") {
        let imgName;
        if (!cell.dataset.whiteImage) {
          const rand = Math.floor(Math.random() * 6) + 1;
          imgName = rand === 1 ? 'chess1.png' : `chess/chess1_${rand}.png`;
          cell.dataset.whiteImage = imgName;
        } else {
          imgName = cell.dataset.whiteImage;
        }

        disk.style.backgroundImage = `url('${imgName}')`;
      } else if (value === "black") {
        let imgName;

        if (!cell.dataset.blackImage) {
          const rand = Math.floor(Math.random() * 6) + 1;
          imgName = rand === 1 ? 'chess2.png' : `chess/chess2_${rand}.png`;
          cell.dataset.blackImage = imgName;
        } else {
          imgName = cell.dataset.blackImage;
        }

        disk.style.backgroundImage = `url('${imgName}')`;
      }
      cell.appendChild(disk);
    } else {
      delete cell.dataset.whiteImage;
      delete cell.dataset.blackImage;
    }
  }
  });

}
function updateBoard(board) {
  let black = 0, white = 0;

  document.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];

    const hadSwing = cell.firstChild?.classList.contains("swing");
    const hadNotes = cell.querySelector(".note") !== null;
  // cell.innerHTML = ""; // 砍掉
    const oldDisk = cell.querySelector(".disk");
    if (oldDisk) oldDisk.remove();
    if (value) {
      const disk = document.createElement("div");
      disk.className = `disk ${value}`;
      disk.id='disk';
      if (hadSwing) disk.classList.add("swing");
      if (hadNotes) attachNotes(disk);
        if (value === "white") {
        let imgName;

        if (!cell.dataset.whiteImage) {
          const rand = Math.floor(Math.random() * 6) + 1;
          imgName = rand === 1 ? 'chess1.png' : `chess/chess1_${rand}.png`;
          cell.dataset.whiteImage = imgName;
        } else {
          imgName = cell.dataset.whiteImage;
        }

        disk.style.backgroundImage = `url('${imgName}')`;
        white++;
      } else if (value === "black") {
        let imgName;

        if (!cell.dataset.blackImage) {
          const rand = Math.floor(Math.random() * 6) + 1;
          imgName = rand === 1 ? 'chess2.png' : `chess/chess2_${rand}.png`;
          cell.dataset.blackImage = imgName;
        } else {
          imgName = cell.dataset.blackImage;
        }

        disk.style.backgroundImage = `url('${imgName}')`;
        black++;
      }
      cell.appendChild(disk);
    } else {
      delete cell.dataset.whiteImage;
      delete cell.dataset.blackImage;
    }
  });

  document.getElementById("blackScore").dataset.value = black;
  document.getElementById("whiteScore").dataset.value = white;

  // document.getElementById("blackScore").textContent = black; 
  // document.getElementById("whiteScore").textContent = white;

        updateCounts(black, white);
}

function updateStatus() {
  if (!myColor || !currentTurn) return;
  // statusEl.textContent = myColor === currentTurn ? "輪到你下棋！" : "等待對手下棋...";
  statusEl.textContent="";
}

function updateScore() {
  // scoreEl.textContent = `分數 - 你: ${myScore} | 對手: ${opponentScore}`;
}

function showMessage(text) {
  messageEl.textContent = text;
  messageEl.classList.add("show");
  setTimeout(() => messageEl.classList.remove("show"), 500);
}
function attachNotes(cell) {
  const notes = ["♩", "♪", "♫"];
  const colors = ["gold", "deepskyblue", "hotpink", "limegreen", "orange", "violet"];
  const count = 5; // 每次 5 個音符
  const minStartDist = 17;
  const maxStartDist = 21;
  const stepDist = 10;
  const duration = 1.5;
  const offsetY = 3; // 往下調整的量
  function createNote(index) {
    const note = document.createElement("span");
    note.classList.add("note");
    note.textContent = notes[Math.floor(Math.random() * notes.length)];
    note.style.color = colors[Math.floor(Math.random() * colors.length)];

    // 等分角度，避免重疊
    const baseAngle = (index / count) * 2 * Math.PI;

    // 加入一點隨機偏移（最多 ±10°）
    const angle = baseAngle + (Math.random() - 0.5) * (Math.PI / 18);

    // 初始半徑
    const r = minStartDist + Math.random() * (maxStartDist - minStartDist);
    const startX = Math.cos(angle) * r;
    const startY = Math.sin(angle) * r+ offsetY; ;

    // 終點位置
    const endX = Math.cos(angle) * (r + stepDist);
    const endY = Math.sin(angle) * (r + stepDist)+ offsetY; 

    note.style.setProperty("--startX", `${startX}px`);
    note.style.setProperty("--startY", `${startY}px`);
    note.style.setProperty("--endX", `${endX}px`);
    note.style.setProperty("--endY", `${endY}px`);
    note.style.animationDuration = `${duration}s`;

    cell.appendChild(note);

    note.addEventListener("animationend", () => {
      note.remove();
      createNote(index); // 確保角度區隔仍然保持
    });
  }

  for (let i = 0; i < count; i++) {
    createNote(i);
  }
}
function animateFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    const disk = cell.firstChild;
    // 取得背景圖片網址
    const bg = disk.style.backgroundImage;
    const src = bg.slice(5, -2); // 去掉 url("...") 外層字串
disk.innerHTML = `
  <div class="half half-top" style="background-image: url('${src}'); background-size: 100% 200%; background-position: top;"></div>
  <div class="half half-bottom" style="background-image: url('${src}'); background-size: 100% 200%; background-position: bottom;"></div>
`;
    disk.classList.add("fly");
  }
}

function animateafterFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    const disk = cell.firstChild;
    disk.classList.add('flip');
    disk.classList.add('pop');
    disk.classList.add("swing");
    attachNotes(disk);

    // 爆星星 ✨
    for (let i = 0; i < 6; i++) {
      const star = document.createElement('span');
      star.classList.add('star');
      const angle = Math.random() * 2 * Math.PI;
      const radius = Math.random() * 30 + 10;
      const xOffset = Math.cos(angle) * radius + 'px';
      const yOffset = Math.sin(angle) * radius + 'px';
      star.style.setProperty('--x', xOffset);
      star.style.setProperty('--y', yOffset);
      disk.appendChild(star);
      setTimeout(() => star.remove(), 1000);
    }

    // 衝擊波 💥
    const shockwave = document.createElement('div');
    shockwave.classList.add('shockwave');
    disk.appendChild(shockwave);
    setTimeout(() => shockwave.remove(), 1500);

    // 移除 flip 動畫
    setTimeout(() => {
      disk.classList.remove('flip');
    }, 400);
    setTimeout(() => {
      disk.classList.remove('pop');
    }, 400);
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
const img2 = document.getElementById("floating-img2");
let mouseX = 0;
let isJumping = false; // 控制是否正在跳躍動畫中

// 滑鼠移動時圖片左右跟著動（上下不動）
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  if (!isJumping) {
    img.style.transition = "left 0.1s linear";
    img.style.left = `${mouseX}px`;
  }
  socket.emit("opponentMove", { x: e.clientX });
});

document.addEventListener("click", (e) => {
  if (isJumping) return; // 防止在跳躍時多次觸發
  isJumping = true;
  const jumpTargetX = e.clientX;
  const offsetX = 70;
  const jumpStartX = jumpTargetX + offsetX;

  const windowHeight = window.innerHeight + 130;
  const mouseY = e.clientY;
  const distanceFromBottom = windowHeight - mouseY;
  const jumpHeight = Math.min(distanceFromBottom, 750);

  //發送給伺服器，請對手也跳一次
  socket.emit("opponentJump", { x: e.clientX, y: e.clientY });

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
      img.style.transition = "transform 0.07s ease";
      img.style.transform = `translate(-55%, -${jumpHeight - 80}px)`;

      setTimeout(() => {
        // 第 2.5 步：停頓 （維持在原地）
        showcat_real(e.clientX, e.clientY, "cat_real.png");
        
        setTimeout(() => {
          // 第三步：回到起跳點（右 + 下來）
          img.style.transition = "transform 0.17s ease-in, left 0.17s ease-in";
          img.style.left = `${jumpStartX}px`;
          img.style.transform = `translate(-50%, 0px)`;
showcat_real(e.clientX, e.clientY, "cat.png");
          setTimeout(() => {
            isJumping = false; // 跳完才允許再次跟隨滑鼠
          }, 170); // 確保結束後解除鎖定
        }, 150); // 停頓時間
      }, 70); // 第二步結束時間
    }, 170); // 第一步結束時間
  });
});

socket.on("opponentDoMove", ({ x }) => {
  mouseX = x;
  if (!isJumping) {
    img2.style.transition = "left 0.1s linear";
    img2.style.left = `${mouseX}px`;
  }
});

socket.on("opponentDoJump", ({ x, y }) => {
   if (isJumping) return;
  isJumping = true;

  const jumpTargetX = x;
  const jumpTargetY = y;
  const offsetX = 50;
  const jumpStartX = jumpTargetX - offsetX;
  const windowHeight = 0;

  const distanceFromTop = jumpTargetY + 100;  // 從上往下
  const jumpHeight = Math.min(distanceFromTop, 750);

  // 移到起始點（畫面上方）
  img2.style.transition = "transform 0.17s ease-out, left 0.17s ease-out";
  img2.style.left = `${jumpStartX}px`;
  img2.style.transform = `translate(-50%, ${windowHeight}px)`; 

  requestAnimationFrame(() => {
    // 第一步：降落到底部（滑鼠點附近）
    img2.style.transition = "transform 0.07s ease-out, left 0.07s ease-out";
    img2.style.transform = `translate(-50%, ${jumpHeight}px)`;

    setTimeout(() => {
      // 第二步：反彈一下（微微往上）
      img2.style.transition = "transform 0.07s ease";
      img2.style.transform = `translate(-35%, ${jumpHeight - 60}px)`;

      setTimeout(() => {
        // ⭐ 停頓一會兒
        setTimeout(() => {
          // 第三步：飛回上方原位
          img2.style.transition = "transform 0.17s ease-in, left 0.17s ease-in";
          img2.style.left = `${jumpStartX}px`;
          img2.style.transform = `translate(-50%, -${windowHeight}px)`;

          setTimeout(() => {
            isJumping = false;
          }, 170);
        }, 150);
      }, 70);
    }, 170);
  });
});

function showcat_real(x, y, imageUrl) {
  if (imageUrl === "cat_real.png") {
  const img = document.createElement("img");
  img.src = imageUrl;
  img.className = "effect-image";
  img.style.left = `${x - 50}px`; // 讓圖片中心對齊點（扣掉一半寬度）
  img.style.top = `${y - 50}px`;  // 同上

  document.body.appendChild(img);

  img.addEventListener("animationend", () => {
    img.remove(); // 動畫結束後自動刪除
  });
  }
  if(imageUrl === "cat.png") {
    const img = document.createElement("img");
    img.src = imageUrl;
    img.className = "effect-image2";
    img.style.left = `${x - 220}px`; // 讓圖片中心對齊點（扣掉一半寬度）
    img.style.top = `${y - 220}px`;  // 同上

    document.body.appendChild(img);
  img.addEventListener("animationend", () => {
    img.remove(); // 動畫結束後自動刪除
  });
  }
}

// let Mask_x = 0;
let verticalOffset = 0; // Y 偏移量
let horizontalOffset = 0; // X 偏移量
initializeMask(); // 初始化遮罩位置

window.addEventListener('resize', () => {
  initializeMask(); // 每次視窗大小變化就重新定位遮罩
});

// 創建一個更可靠的初始化函數
function initializeMask() {
  // 確保所有元素都存在
  const maskRect = document.getElementById('maskRect');
  const board = document.getElementById("board");
  const boardWrapper = document.getElementById("game-wrapper");
  const countsEl = document.getElementById("counts");
  
  if (!maskRect || !board || !boardWrapper || !countsEl) {
    console.log('元素尚未載入完成，延遲重試...');
    setTimeout(() => initializeMask(), 100);
    return;
  }

  // 先清除所有 transition，避免干擾計算
  const originalTransitions = {
    boardWrapper: boardWrapper.style.transition,
    maskRect: maskRect.style.transition
  };
  
  boardWrapper.style.transition = 'none';
  maskRect.style.transition = 'none';

  // 強制重新計算佈局
  board.offsetHeight;
  document.body.offsetHeight;

  // 取得位置
  const boardRect = board.getBoundingClientRect();
  const svgRect = maskRect.ownerSVGElement?.getBoundingClientRect() || 
                  document.querySelector('svg')?.getBoundingClientRect();
  
  if (!svgRect) {
    console.error('找不到 SVG 元素');
    return;
  }

  const x = boardRect.left - svgRect.left;
  const y = boardRect.top - svgRect.top;
  
  // console.log(`棋盤位置: ${boardRect.left}, ${boardRect.top}`);
  // console.log(`SVG位置: ${svgRect.left}, ${svgRect.top}`);
  // console.log(`計算出的遮罩位置: x=${x}, y=${y}`);

  // 設定遮罩位置
  maskRect.setAttribute("x", x);
  maskRect.setAttribute("y", y);
  maskRect.setAttribute("width", boardRect.width);
  maskRect.setAttribute("height", boardRect.height);

  // 重置元素位置
  boardWrapper.style.left = "0px";
  boardWrapper.style.top = "0px";
  countsEl.style.left = "0px";
  countsEl.style.top = "0px";
  maskRect.style.transform = "translate(0px, 0px)";

  // 恢復 transition
  setTimeout(() => {
    boardWrapper.style.transition = "left 0.5s ease, top 0.5s ease";
    maskRect.style.transition = "transform 0.5s ease";
  }, 10);
}

// 使用 ResizeObserver 監聽
const resizeObserver = new ResizeObserver((entries) => {
  // 延遲一點確保所有佈局完成
  setTimeout(() => {
    initializeMask();
  }, 50);
});

// 監聽 body 或主要容器的大小變化
resizeObserver.observe(document.body);

// 頁面載入完成後初始化
window.addEventListener('load', () => {
  setTimeout(() => {
    initializeMask();
  }, 200);
});
  const DIGIT_PATH = "digits"; // 手寫數字圖片資料夾
  const MAX_PER_DIGIT = 200;   // 每個數字有幾種圖片

  // 隨機取得某個數字的圖片
  function getRandomDigitImage(digit) {
    const randomIndex = Math.floor(Math.random() * MAX_PER_DIGIT);
    return `${DIGIT_PATH}/${digit}/${randomIndex}.png`;
  }

  function renderScore(newScore, spanId) {
  const span = document.getElementById(spanId);
  const digits = newScore.toString().split("");

  // 確保 digit-wrapper 數量和 digits 一致
  while (span.children.length < digits.length) {
    const wrapper = document.createElement("div");
    wrapper.className = "digit-wrapper";
    span.appendChild(wrapper);
  }
  while (span.children.length > digits.length) {
    span.removeChild(span.lastChild);
  }

  digits.forEach((ch, i) => {
    const wrapper = span.children[i];
    const oldImg = wrapper.querySelector("img");

    const newImg = document.createElement("img");
    newImg.className = "digit-img";
    newImg.src = getRandomDigitImage(ch);

    wrapper.appendChild(newImg);

    newImg.onload = () => {
      newImg.style.opacity = 1; // 新的淡入
      if (oldImg) {
        oldImg.style.opacity = 0; // 舊的淡出
        setTimeout(() => oldImg.remove(), 500); // 動畫結束後移除
      }
    };
  });
}





function updateBoardOffset(flippedPositions) {
  // const black = parseInt(document.getElementById("blackScore").textContent);
  // const white = parseInt(document.getElementById("whiteScore").textContent);

const black = parseInt(document.getElementById("blackScore").dataset.value || "0");
const white = parseInt(document.getElementById("whiteScore").dataset.value || "0");

  renderScore(black, "blackScore");
  renderScore(white, "whiteScore");

  const boardWrapper = document.getElementById("game-wrapper");
  const countsEl = document.getElementById("counts");
  const maskRect = document.getElementById("maskRect");

  /* ---------- 水平偏移計算（分數差） ---------- */
  const pixelPerDifference = 14;
  const maxHorizontalOffset = window.innerWidth / 2;
  horizontalOffset = (black - white) * pixelPerDifference;
  horizontalOffset = Math.max(-maxHorizontalOffset, Math.min(maxHorizontalOffset, horizontalOffset,425),-425);

  /* ---------- 垂直偏移計算（翻轉位置分佈） ---------- */
  const middleY = 4; // 棋盤上半部/下半部分界
  let topCount = 0, bottomCount = 0;
  flippedPositions.forEach(([x, y]) => {
    if (y < middleY) topCount++;
    else bottomCount++;
  });

  const pixelPerFlip = 18;
  const maxVerticalOffset = window.innerHeight / 2;
  verticalOffset = (bottomCount - topCount) * pixelPerFlip;
  verticalOffset = Math.max(-maxVerticalOffset, Math.min(maxVerticalOffset, verticalOffset,110),-110);
  // console.log(`水平偏移: ${horizontalOffset}, 垂直偏移: ${verticalOffset}，最高偏移y: ${window.innerHeight/2}，最高偏移x: ${window.innerWidth/2}`);
  /* ---------- 棋盤本體偏移 ---------- */
  boardWrapper.style.position = "relative";
  boardWrapper.style.left = `${horizontalOffset}px`;
  boardWrapper.style.top = `${verticalOffset}px`;
  boardWrapper.style.transition = "left 0.5s ease, top 0.5s ease";


  /* ---------- counts 偏移 & 防出界處理 ---------- */
  countsEl.style.transition = "left 0.5s ease, top 0.5s ease";
  // console.log(countsEl.getBoundingClientRect().top + verticalOffset);
if (!(countsEl.getBoundingClientRect().top + verticalOffset < 0) ) {
    countsEl.style.top = `${verticalOffset}px`;
  }
    // 正常位置（隨偏移移動）
    countsEl.style.left = `${horizontalOffset}px`;
  

  /* ---------- maskRect 同步 2D 偏移 ---------- */
  maskRect.style.transform = `translate(${horizontalOffset}px, ${verticalOffset}px)`;
  maskRect.style.transition = "transform 0.5s ease";
  // console.log('遮罩位置更新：', horizontalOffset, verticalOffset,'棋盤位置：', boardWrapper.style.left, boardWrapper.style.top);
}



let lastState = "black"; // "black"、"white" 或 "tie"

function updateCounts(blackScore, whiteScore) {
  const blackDiv = document.getElementById("blackCounter");
  const whiteDiv = document.getElementById("whiteCounter");

  console.log(`黑棋: ${blackScore}, 白棋: ${whiteScore}`);
  // getComputedStyle(document.getElementById('image-layer')).maskImage
  // console.log("遮罩圖片：", getComputedStyle(document.getElementById('image-layer')).maskImage);
  // 決定這次狀態
  let currentState;
  if (blackScore > whiteScore) {
    currentState = "black";
  } else if (whiteScore > blackScore) {
    currentState = "white";
  } else {
    currentState = "tie";
  }
  if(blackScore === 2 && whiteScore === 2) {
    currentState = "black"; // 特例：兩人都只有 2 分時，強制顯示黑棋
  }
  // console.log(`當前狀態: ${currentState}， 上次狀態: ${lastState}`);

  // console.log(`黑棋: ${blackScore}, 白棋: ${whiteScore}`);

  // 根據目前狀態與分數，決定是否要交換
  if (lastState === "black" && currentState === "white") {
    // 白棋逆轉，白在上
    blackDiv.style.transform = "translateY(100%)";
    whiteDiv.style.transform = "translateY(-100%)";
    lastState = "white";
    // console.log("白棋逆轉，白在上");
  } else if (lastState === "white" && currentState === "black") {
    // 黑棋逆轉，黑在上
    blackDiv.style.transform = "translateY(-0%)";
    whiteDiv.style.transform = "translateY(0%)";
    lastState = "black";
    // console.log("黑棋逆轉，黑在上");
  }
}
const videoUrl = "picture/output.webm";
let hasPlayed = false;

// 產生邊框影片，放入 DOM
function setupBorderVideos() {
  const template = document.getElementById("video-template");
  const top = document.querySelector(".top-frame");
  const bottom = document.querySelector(".bottom-frame");
  const left = document.querySelector(".left-frame");
  const right = document.querySelector(".right-frame");

  const createClones = (container, count) => {
    for (let i = 0; i < count; i++) {
      const clone = template.cloneNode(true);
      clone.removeAttribute("id");
      clone.classList.add("frame-video");

      // 初始設定
      clone.src = videoUrl;  // ✅ 提前設定好 src
      clone.muted = true;
      clone.autoplay = false; // ✅ 不自動播放
      clone.playsInline = true;
      clone.setAttribute("muted", "");
      clone.setAttribute("playsinline", "");

      container.appendChild(clone);
    }
  };

  createClones(top, 9);
  createClones(bottom, 9);
  createClones(left, 15);
  createClones(right, 15);
}

function playBorderAnimationOnTurn() {
  console.log("播放邊框動畫");
  if (hasPlayed) return;
  hasPlayed = true;

  const allVideos = document.querySelectorAll(".frame-video");
  console.log("影片元素數量：", allVideos.length);

  let loadedCount = 0;

  allVideos.forEach((vid, i) => {
    vid.muted = true;
    vid.playsInline = true;
    vid.loop = false;
    vid.style.opacity = "1";

    // 在載入影片時，加上防快取參數（讓瀏覽器當成新影片）
vid.src = videoUrl + "?t=" + Date.now();


    vid.addEventListener("loadeddata", () => {
      loadedCount++;
      console.log(`影片 ${i} 已載入 (${loadedCount}/${allVideos.length})`);

      if (loadedCount === allVideos.length) {
        console.log("全部影片都載入完成，開始播放");

        allVideos.forEach((v) => {
          v.currentTime = 0;
          v.play().then(() => {
            const minTime = 0.9;
            const maxTime = 1.1;
            const randomTime = Math.random() * (maxTime - minTime) + minTime;

            setTimeout(() => {
              v.pause();
              v.currentTime = randomTime;
            }, randomTime * 1000);
          }).catch(err => {
            console.warn("播放失敗：", err);
          });
        });
      }
    }, { once: true });
  });
}


// setupBorderVideos(); // 初始化邊框影片



function resetBorderVideos() {
  const allVideos = document.querySelectorAll(".frame-video");
  allVideos.forEach((vid) => {
    vid.pause();          // 先暫停影片
    vid.currentTime = 0;  // 時間設回 0
    vid.style.opacity = "0"; // 隱藏（如果需要）
  });
    hasPlayed = false;
}


