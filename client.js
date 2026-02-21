// 建立與伺服器的 Socket.IO 連線
const socket = io();

// 儲存自己的棋子顏色（"black" 或 "white"）
let myColor = null;

// 當前輪到哪個顏色的玩家
let currentTurn = null;

// 雙方的得分
let myScore = 0, opponentScore = 0;

let gun = null;
let sniper = null;
let smoke = null;
let wgunon = false;
let bgunon = false;
let flipon = false;
let popon = true;
let time_1A = 0;
let time_2A = 0;

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
opponentCursor.style.display = 'none'; // 初始隱藏
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

        // 重置 triggerClickWithCoords
      firstDigit = null;
      inCellMode = false;
      cells.forEach(cell => cell.classList.remove("highlight-row", "special"));

    console.log(currentTurn);
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
socket.on("playerColor", color => {
    myColor = color;
    
    // --- 1. 定義所有本地檔案總清單 (建議將所有檔案放在這裡即可) ---
    const allBoardFiles = [
        "cat_b1.jpg", "cat_b2.jpg", "cat_b3.jpg", "cat_b4.jpg", "cat_b1.mp4", "cat_b2.mp4",
        "cat_w1.jpg", "cat_w1.mp4", "cat_w2.mp4", "cat_w3.mp4",
        "cat_wb1.jpg","cat_w2.jpg"
    ];

    const allBackgroundFiles = [
        "b-background1.mp4", "b-background2.mp4", "b-background1.jpg", "b-background2.jpg", 
        "b-background3.jpg", "b-background4.jpg", "w-background1.mp4", "w-background1.jpg", 
         "w-background2.jpg", "wb-background1.mp4", "wb-background1.jpg", "wb-background2.jpg"
    ];

    // --- 2. 封裝通用的「自動分類過濾器」 ---
    // prefix1: 專屬顏色開頭 (如 'cat_b'), prefix2: 混合顏色開頭 (如 'cat_wb')
    const filterFiles = (list, prefix1, prefix2) => {
        return list.filter(name => name.startsWith(prefix1) || name.startsWith(prefix2));
    };

    // --- 3. 處理棋盤影片/圖片 (Cat 系列) ---
    const prefix = color === "black" ? "cat_b" : "cat_w";
    const boardList = filterFiles(allBoardFiles, prefix, "cat_wb");
    const randomCat = boardList[Math.floor(Math.random() * boardList.length)];
    
    updateMediaDisplay("board", "board-image", randomCat);

    // --- 4. 處理背景背景檔案 (Background 系列) ---
    const bgPrefix = color === "black" ? "b-" : "w-";
    const bgList = filterFiles(allBackgroundFiles, bgPrefix, "wb-");
    const randomBg = bgList[Math.floor(Math.random() * bgList.length)];
    
    updateMediaDisplay("bg", "bgImage", randomBg);

    // --- 5. 處理角落圖片 (立即顯示) ---
    updateCorners(color);
});
// 管理不同顯示區域的狀態
let videoStates = {
    bg: { active: 1 },
    board: { active: 1 }
};
/**
 * 修正版：確保 1s 入 + 1s 出 完成後，才進入下一次循環監聽
 */
function updateMediaDisplay(type, imageElemId, fileName) {
    const v1 = document.getElementById(`${type}Video1`);
    const v2 = document.getElementById(`${type}Video2`);
    const image = document.getElementById(imageElemId);
    const path = `picture/${fileName}`;
    const isVideo = fileName.endsWith(".mp4");

    console.log(`[Media] 開始處理 ${type}: ${fileName}`);

    if (!isVideo) {
        // --- 圖片邏輯 ---
        [v1, v2].forEach(v => { v.style.opacity = 0; v.pause(); v.style.zIndex = 1; });
        if (image) {
            image.src = path;
            image.style.display = "block";
            image.style.opacity = 1;
            image.style.zIndex = 2;
        }
    } else {
        // --- 影片邏輯 ---
        if (image) { image.style.display = "none"; image.style.opacity = 0; }

        const state = videoStates[type];
        // 第一次啟動時的初始化
        const currentVid = state.active === 1 ? v1 : v2;
        
        currentVid.src = path;
        currentVid.style.transition = "none";
        currentVid.style.opacity = 1;
        currentVid.style.zIndex = 5;
        
        currentVid.play().then(() => {
            // 啟動循環監聽
            setupLoopListener(type, currentVid, fileName);
        }).catch(e => console.log("播放失敗:", e));
    }
}

/**
 * 獨立的循環監聽函式，避免重複初始化導致動畫中斷
 */
function setupLoopListener(type, currentVid, fileName) {
    const v1 = document.getElementById(`${type}Video1`);
    const v2 = document.getElementById(`${type}Video2`);
    const path = `picture/${fileName}`;
    
    currentVid.ontimeupdate = function() {
        const overlapTime = 2.0; // 預留 2 秒啟動動畫 (1s淡入+1s淡出)
        
        if (currentVid.duration > 0 && (currentVid.duration - currentVid.currentTime < overlapTime)) {
            currentVid.ontimeupdate = null; // 停止監聽，進入換幕程序
            
            const state = videoStates[type];
            const nextVid = (currentVid === v1) ? v2 : v1;

            // console.log(`[Video] ${type} 接力開始: 新片入層`);

            // 1. 準備接力影片：放在最頂層 (z-index: 10) 但透明
            nextVid.style.transition = "none";
            nextVid.src = path;
            nextVid.style.opacity = 0;
            nextVid.style.zIndex = 10;
            nextVid.load();

            nextVid.oncanplay = function() {
                nextVid.play().then(() => {
                    // --- 階段一：新影片花 1 秒淡入 ---
                    nextVid.style.transition = "opacity 1s ease-in-out";
                    nextVid.style.opacity = 1;

                    // --- 階段二：1秒後，舊影片花 1 秒淡出 ---
                    setTimeout(() => {
                        // console.log(`[Video] ${type} 舊片開始淡出`);
                        currentVid.style.transition = "opacity 1s ease-in-out";
                        currentVid.style.opacity = 0;
                        
                        // 更新全局狀態
                        state.active = (nextVid === v1) ? 1 : 2;

                        // --- 階段三：淡出完成後，清理舊片並讓新片開始監聽下一次結束 ---
                        setTimeout(() => {
                            currentVid.pause();
                            currentVid.style.zIndex = 1;
                            // console.log(`[Video] ${type} 循環完成，新片接手監聽`);
                            
                            // 關鍵：讓新影片開始監聽它自己的結束時間
                            setupLoopListener(type, nextVid, fileName);
                        }, 1000);

                    }, 1000);
                });
                nextVid.oncanplay = null;
            };
        }
    };
}
/**
 * 輔助函數：角落圖片邏輯
 */
function updateCorners(color) {
    const corners = {
        t1: document.getElementById("corner-image1"),
        t2: document.getElementById("corner-image2"),
        t3: document.getElementById("corner-image3"),
        t4: document.getElementById("corner-image4")
    };

    const getRandomImage = () => {
        if (color === 'black') {
            const numb = Math.floor(Math.random() * 9) + 1;
            return `b_cat/C${numb}.png`;
        } else {
            const numw = Math.floor(Math.random() * 13) + 2;
            return `w_cat/C${numw}.png`;
        }
    };

    // 重置所有透明度
    Object.values(corners).forEach(img => { if(img) img.style.opacity = "0"; });

    if (color === 'black') {
        corners.t4.src = getRandomImage();
        corners.t4.style.opacity = "1";
    } else {
        corners.t1.src = getRandomImage();
        corners.t1.style.opacity = "1";
    }
}


// 遊戲開始時初始化畫面與狀態
socket.on("startGame", data => {
  currentTurn = data.turn;       // 設定當前回合
  const aiBtn = document.getElementById('aiButton');
if (aiBtn) {
  aiBtn.style.display = "none";
} else {
  console.warn("找不到 aiButton，可能尚未載入 DOM！");
}
  // 只在雙人對戰模式才顯示對手游標
  if (data.isMultiplayer === true) {
    opponentCursor.style.display = 'block';
  }
  updateStatus();                // 更新畫面狀態
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

      // 重置 triggerClickWithCoords
      firstDigit = null;
      inCellMode = false;
      cells.forEach(cell => cell.classList.remove("highlight-row", "special"));
    }
  }
});

const meninner = document.querySelectorAll(".inner");

function loop() {
  meninner.forEach(inner => inner.classList.remove("paused2"));
  setTimeout(() => {
    meninner.forEach(inner => inner.classList.add("paused2"));
    setTimeout(loop, 6000); //TODO 小人休息時間
  }, 100);
}
loop();

// 每次落子或對手行動後，伺服器傳回新棋盤與回合
socket.on("updateBoard", data => {
  if (wgunon==true){
    setTimeout(()=>{updateBoard(data.board)},time_1A)
  }
  if (flipon==true || popon==true){
updateBoard(data.board);
  }
  
  currentTurn = data.turn;
  updateStatus();
  const overlayImg = document.getElementById("cat_bw");

  updategreen(currentTurn);
  
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
    
    // 為每個 fogged 元素設置隨機參數
    const randomBlur = 1.5 + Math.random() * 1; // 1.5-2.5px
    const randomInsetTop = Math.random() * 2; // 0-2px
    const randomInsetBottom = -1 - Math.random(); // -1至-2px
    const randomInsetSpread = 5 + Math.random() * 3; // 5-8px
    const randomOuterSpread = 8 + Math.random() * 6; // 8-14px
    
    // 隨機透明度微調
    const randomAlpha1 = 0.12 + Math.random() * 0.08; // 0.12-0.20
    const randomAlpha2 = 0.03 + Math.random() * 0.04; // 0.03-0.07
    const randomAlpha3 = 0.01 + Math.random() * 0.03; // 0.01-0.04
    const randomAlpha4 = 0.03 + Math.random() * 0.05; // 0.03-0.08
    
    // 隨機背景顏色（完全隨機 RGB）
    const randomR = Math.floor(Math.random() * 256); // 0-255
    const randomG = Math.floor(Math.random() * 256); // 0-255
    const randomB = Math.floor(Math.random() * 256); // 0-255
    const randomBgAlpha = 0.03 + Math.random() * 0.07; // 0.03-0.10
    
    cell.style.setProperty('--random-blur', `${randomBlur}px`);
    cell.style.setProperty('--random-inset-top', `${randomInsetTop}px`);
    cell.style.setProperty('--random-inset-bottom', `${randomInsetBottom}px`);
    cell.style.setProperty('--random-inset-spread', `${randomInsetSpread}px`);
    cell.style.setProperty('--random-outer-spread', `${randomOuterSpread}px`);
    cell.style.setProperty('--random-alpha1', randomAlpha1);
    cell.style.setProperty('--random-alpha2', randomAlpha2);
    cell.style.setProperty('--random-alpha3', randomAlpha3);
    cell.style.setProperty('--random-alpha4', randomAlpha4);
    cell.style.setProperty('--random-bg-color', `rgba(${randomR}, ${randomG}, ${randomB}, ${randomBgAlpha})`);

    // 產生 8 個 30% 到 70% 之間的隨機數
    const r = () => Math.floor(Math.random() * 41) + 30;
    
    // 格式化為： "h1 h2 h3 h4 / v1 v2 v3 v4"
    const randomValue = `${r()}% ${r()}% ${r()}% ${r()}% / ${r()}% ${r()}% ${r()}% ${r()}%`;
    
    // 傳送到 CSS 變數
    cell.style.setProperty('--random-radius', randomValue);
  }

});
});
socket.on("updategreens", turn => {
 updategreen(turn);
});
function updategreen(currentTurn){
    if (currentTurn === myColor) {
  document.querySelectorAll(".inner").forEach(inner => {
    inner.classList.remove("paused");
  });

  }
  else{
      document.querySelectorAll(".inner").forEach(inner => {
    inner.classList.add("paused");
  });
}
}
// 若玩家點了非法位置（例如不能落子處），顯示錯誤訊息
socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});
socket.on("place", ({i,board,turn}) => {
    audio_place.play();
    setTimeout(() => updatechess(i,board,turn));
   
});
socket.on("placeidx", idx => {

      const targetIndex = idx; 
const specialCell = boardEl.querySelector(`[data-index="${targetIndex}"]`);
  specialCell.classList.add("special"); 
});


const container = document.getElementById("container");
// 當伺服器回傳落子結果時，更新分數與動畫
socket.on("moveResult", ({ flippedCount, flippedPositions, player, scores,idx }) => {
    const x = idx % 8;
    const y = Math.floor(idx / 8);
  // console.log(`玩家 ${player} 翻轉了 ${flippedCount} 顆棋子`);
    if (flippedCount > 0) {
    audio_meow.play();
  }
  if (flippedCount == 1  ){
    flipon=false;
    wgunon=false;
    popon=true;
  }
    if (flippedCount >= 2  ){
    flipon=true;
    wgunon=false;
    popon=false;
  }
  if (horizontalOffset >= 50 && flippedCount >= 3  && flippedCount <= 6 && myColor=='white' ){
    wgunon=true;
    flipon=false;
    popon=false;
  }
    // wgunon=true;
    // flipon=false;
    // popon=false; //TODO test gun

    if (flippedCount >= 5) {
    const board = document.getElementById("board-frame");
    board.classList.add("shake");
    setTimeout(() => board.classList.remove("shake"), 800);
  }
  // 不用自己算分數，直接使用 server 傳來的
  // myScore = scores[myColor];
  // opponentScore = scores[myColor === "black" ? "white" : "black"];
    document.querySelectorAll('.disk.swing').forEach(disk => {
    disk.classList.remove('swing');
  });
  document.querySelectorAll('.note').forEach(note => note.remove());
    document.querySelectorAll('.cell').forEach(cell => cell.classList.remove('special'));
    
    const sortedFlipped = flippedPositions
  .map(([fx, fy]) => {
    const dx = fx - x;
    const dy = fy - y;
    const dist = dx * dx + dy * dy; // 平方距離，不用開根號比較快
    return { fx, fy, dist };
  })
  .sort((a, b) => a.dist - b.dist);
  if (wgunon==true){
    gunani(flippedPositions,sortedFlipped,flippedCount);
    time_1A = 400 + flippedCount * 600; //700->600
    time_2A = time_1A + 1300; 
    
  }
  if (flipon==true || popon==true){
    time_1A=0;
    time_2A=0;
    sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => flipani(fx, fy), i * 100); // 每顆延遲一點時間
   });
    sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => animateafterFlip(fx, fy), i * 500); // 每顆延遲一點時間
   });
     setTimeout(() => {
    updateBoardOffset(flippedPositions);
  },time_1A+500); //距離延遲時間
  }
  // console.log(time_1A);
  socket.emit("sendtime_2A", time_2A );
});

function gunani(flippedPositions,sortedFlipped,flippedCount){
  // 排序：依照與下棋點的距離
  
  const cols = 20, rows = 13;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 建立 tile
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";

      const layer1 = document.createElement("div");
      layer1.className = "layer1";
      layer1.style.backgroundPosition = `-${(width/cols)*c}px -${(height/rows)*r}px`;

      const layer2 = document.createElement("div");
      layer2.className = "layer2";
      layer2.style.backgroundPosition = `-${(width/cols)*c}px -${(height/rows)*r}px`;

      tile.appendChild(layer1);
      tile.appendChild(layer2);
      container.appendChild(tile);
    }
  }
// 顯示順序：先偶數行再奇數行
  const order = [];
  for (let c = 0; c < cols; c++) {
    for (let r = 0; r < rows; r += 2) order.push({r, c});
    for (let r = 1; r < rows; r += 2) order.push({r, c});
  }

  let acc = 5;
  order.forEach((pos, i) => {
    const index = pos.r * cols + pos.c;
    const tile = container.children[index];
    setTimeout(() => {
      tile.style.opacity = "1";
    }, i * acc);
    acc -= 0.015;
  });
  container.classList.add("move-left");
  const totalDelay = 400; 
  setTimeout(() => {
  container.innerHTML = ""; // 清空所有 tile
    // 加完整圖
    sniper = document.createElement("div");
    sniper.id = "full-sniper";
    gun = document.createElement("div");
    gun.id = "full-gun";
    smoke = document.createElement("div");
    smoke.id = "smoke";
    smoke.style.width = "400px";
    smoke.style.height = "260px";
    smoke.style.backgroundSize = "contain";
    smoke.style.backgroundRepeat = "no-repeat";
    smoke.style.opacity = "1";
    smoke.style.transition = "opacity 0.5s ease";
    smoke.style.transformOrigin = "20% 50%";
    const img = new Image();
    img.src = "gun/smoky.png";
    smoke.style.backgroundImage = `url('${img.src}')`;
    container.appendChild(smoke);
    container.appendChild(sniper);
    container.appendChild(gun);
    sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => gunFlip(fx, fy), i * 500); // 每顆延遲一點時間
   });
// 依序翻轉
 setTimeout(() => {
   sortedFlipped.forEach(({ fx, fy }, i) => {
     setTimeout(() => animateafterFlip(fx, fy), i * 500); // 每顆延遲一點時間
   })
  setTimeout(() => {
    updateBoardOffset(flippedPositions);
      exitAnimation();
  },time_1A); // TODO 調整結束時間
  }, totalDelay);
 }, 500); // gun出現動畫時間
}

function exitAnimation() {
  const cols = 20, rows = 13;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // 清掉原本完整圖
  container.innerHTML = "";

  // 建立退場用 tile
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = document.createElement("div");
      tile.className = "tile";
      tile.style.opacity = "1"; // 一開始是滿的

      const layer1 = document.createElement("div");
      layer1.className = "layer1";
      layer1.style.backgroundPosition = `-${(width/cols)*c}px -${(height/rows)*r}px`;

      const layer2 = document.createElement("div");
      layer2.className = "layer2";
      layer2.style.backgroundPosition = `-${(width/cols)*c}px -${(height/rows)*r}px`;

      tile.appendChild(layer1);
      tile.appendChild(layer2);
      container.appendChild(tile);
    }
  }

  // 🔹 退場順序：整列整列從右到左
  const order = [];
  for (let c = cols - 1; c >= 0; c--) {
    for (let r = 0; r < rows; r++) {
      order.push({r, c});
    }
  }

  let acc = 2; // 每個 tile 間隔
  order.forEach((pos, i) => {
    const index = pos.r * cols + pos.c;
    const tile = container.children[index];
    setTimeout(() => {
      tile.style.opacity = "0"; // 消失
    }, i * acc);
  });

  // 動畫結束後清空
  setTimeout(() => {
    container.innerHTML = "";
      container.classList.remove("move-left"); 
  }, order.length * acc + 500);
}
socket.on("gameOver", ({ black, white, winner}) => {
  // let msg = `遊戲結束！黑棋: ${black}, 白棋: ${white}。`;
  // msg += winner === "draw" ? " 平手！" : winner === myColor ? " 你贏了！" : " 你輸了！";
  // statusEl.textContent = msg;
    initializeMask();
    opponentCursor.style.display = 'none'; // 遊戲結束隱藏對手游標
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
   opponentCursor.style.display = 'none'; // 對手離開隱藏游標
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

function updatechess(idx,board,turn){
  document.querySelectorAll(".cell").forEach((cell, i) => {
    
    if(i===idx){
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = turn; 
    const oldDisk = cell.querySelector(".disk");
    if (oldDisk) oldDisk.remove();
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
function flipani(x,y){
    const idx = y * 8 + x;
    const cell = document.querySelectorAll(".cell")[idx];
    const disk = cell.firstChild;
    
    if (flipon==true){
    disk.classList.add('flip');
    setTimeout(() => {
      disk.classList.remove('flip');
    }, 400);
    }
    if(popon==true){
    disk.classList.add('pop');
        setTimeout(() => {
      disk.classList.remove('pop');
    }, 400);
  }
}

function gunFlip(x, y) {

    const idx = y * 8 + x;
    const cell = document.querySelectorAll(".cell")[idx];
    if (cell && cell.firstChild) {
        const disk = cell.firstChild;
        const bg = disk.style.backgroundImage;
        
        if (!bg) return;
        const src = bg.slice(5, -2);
        let newImg = "";

        if (src.includes("chess2")) {
            if (!cell.dataset.whiteImage) {
                const rand = Math.floor(Math.random() * 6) + 1;
                newImg = rand === 1 ? "chess1.png" : `chess/chess1_${rand}.png`;
                cell.dataset.whiteImage = newImg;
            } else newImg = cell.dataset.whiteImage;
        } else if (src.includes("chess1")) {
            if (!cell.dataset.blackImage) {
                const rand = Math.floor(Math.random() * 6) + 1;
                newImg = rand === 1 ? "chess2.png" : `chess/chess2_${rand}.png`;
                cell.dataset.blackImage = newImg;
            } else newImg = cell.dataset.blackImage;
        } else return;
        // 延遲計算座標，但使用固定尺寸
        const rect = cell.getBoundingClientRect();
        setTimeout(() => {
        const flying = document.createElement("div");
        flying.className = "flying-chess";
        flying.style.backgroundImage = `url('${newImg}')`;
        document.body.appendChild(flying);

        // 取得目標位置
        
        const targetX = rect.left + rect.width / 2;
        const targetY = rect.top + rect.height / 2;

        // 取得容器中心點
        const rect1 = container.getBoundingClientRect();
        const cx = rect1.left + rect1.width / 2;
        const cy = rect1.top ;
        const cy2 = rect1.top - rect1.height / 8;

        // 計算槍的角度
        const gunAngle = Math.atan2(targetY - cy, targetX - cx) * 180 / Math.PI;
        const gunAngle2 = Math.atan2(targetY - cy2, targetX - cx) * 180 / Math.PI; 
        const gun = document.getElementById("full-gun");
        // console.log(gunAngle,gunAngle2);
        if(gunAngle < -25){ //上
        gun.style.transform = `rotate(${gunAngle2}deg)`;
        smoke.style.transform = `rotate(${gunAngle2}deg)`;
        }
        else{ //下
        gun.style.transform = `rotate(${gunAngle}deg)`;
        smoke.style.transform = `rotate(${gunAngle}deg)`;
        }
            // 左下角座標
            const startX = 0;
            const startY = window.innerHeight;

            const launchX = startX +  container.clientWidth/10;
            const launchY = startY -   container.clientHeight*6/10;
          
            
            setupFlyingAnimation(flying, launchX, launchY, targetX, targetY);
            
        }, 100); // 減少延遲時間

        // 移除原本的棋子外觀
        disk.style.backgroundImage = 'none';
        
        // 創建翻轉動畫
        createFlipAnimation(cell, rect, src, newImg);
    }
}

// 飛行動畫設定
function setupFlyingAnimation(flying, startX, startY, targetX, targetY) {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    // 初始位置
    flying.style.left = startX + "px";
    flying.style.top = startY + "px";

    // 設定方向與變形
    flying.style.transform = `rotate(${angle}deg) scale(1.3, 0.6)`;
    flying.style.transformOrigin = "center center";
    flying.style.opacity = "0";
    smoke.style.opacity = "1";
    setTimeout(() => {
        smoke.style.opacity = "0";
    }, 150);
    // 啟動動畫
    requestAnimationFrame(() => {
        flying.style.transition = "transform 0.3s ease-in-out, left 0.3s ease-in-out, top 0.3s ease-in-out";
        flying.style.left = targetX + "px";
        flying.style.top = targetY + "px";
    });
   setTimeout(() => {
        flying.style.opacity = "1";
    }, 140);
    // 動畫結束後的處理
    flying.addEventListener("transitionend", () => {
        // 在這裡處理棋子到達目標的邏輯
        // console.log("飛行動畫完成");
        flying.remove();
    });
}

// 分離翻轉動畫創建
function createFlipAnimation(cell, rect, oldSrc, newSrc) {
    const flipAnim = document.createElement("div");
    flipAnim.className = "flip-anim";
    flipAnim.style.position = "absolute";
    flipAnim.style.left = rect.left + "px";
    flipAnim.style.top = rect.top + "px";
    flipAnim.style.width = rect.width + "px";
    flipAnim.style.height = rect.height + "px";
    
    const flipInner = document.createElement("div");
    flipInner.className = "flip-inner";
    
    flipInner.innerHTML = `
        <div class="half half-top" style="background-image: url('${oldSrc}'); background-size: 100% 200%; background-position: center top;">
            <img class="sweat-drop" src="./other/sweat.png" style="position: absolute; top: -5px; right: -5px; width: 20px; height: 20px; z-index: 10;">
        </div>
        <div class="half half-bottom" style="background-image: url('${oldSrc}'); background-size: 100% 200%; background-position: center bottom;"></div>
    `;
    
    flipAnim.appendChild(flipInner);
    document.body.appendChild(flipAnim);

    setTimeout(() => {
        flipAnim.classList.add("fly");
        const sweat = flipInner.querySelector(".sweat-drop");
        if (sweat) sweat.remove();
    }, 300);

    // 飛行動畫完成時立即更新棋子（100ms延遲 + 300ms飛行時間）
    setTimeout(() => {
        if (flipAnim.parentNode) {
            flipAnim.remove();
        }
        // 更新棋子圖片 - 使用與 updateBoard 一致的邏輯
        const disk = document.createElement("div");
        disk.className = "disk";
        disk.style.backgroundImage = `url('${newSrc}')`;
        
        // 清除舊的棋子
        const oldDisk = cell.querySelector(".disk");
        if (oldDisk) oldDisk.remove();
        
        // 添加新棋子
        cell.appendChild(disk);
    }, 650);
}


function animateafterFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    const disk = cell.firstChild;

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
    // const shockwave = document.createElement('div');
    // shockwave.classList.add('shockwave');
    // disk.appendChild(shockwave);
    // setTimeout(() => shockwave.remove(), 1500);


  }
}

document.getElementById('aiButton').addEventListener('click', () => {
  
  socket.emit('playAI');
  statusEl.textContent = "與電腦對戰開始！";
  document.getElementById('aiButton').style.display = "none";
  opponentCursor.style.display = 'none'; // AI 模式隱藏對手游標
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

const cursor = document.querySelector(".cursor");
let lastX = window.innerWidth / 2;
let lastY = window.innerHeight / 2;
let lastTime = Date.now();

   const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    
    let activePoints = []; // 當前正在畫的黑線點
    let fadingSegments = []; // 存放正在淡出的棕色路徑段落
    let permanentSegments = []; // 存放你要求「持續留在螢幕」的棕色路徑
    
    let lastMousePos = null;
    const MAX_POINTS = 10;   
    const FADE_SPEED = 0.02; // 控制舊線淡出的速度

// 滑鼠移動時圖片左右跟著動（上下不動）
document.addEventListener("mousemove", (e) => {
  mouseX = e.clientX;
  if (!isJumping) {
    img.style.transition = "left 0.1s linear";
    img.style.left = `${mouseX}px`;
  }

  socket.emit("opponentMove", { x: e.clientX });

      const nowX = e.clientX;
      const nowY = e.clientY;
      const nowTime = Date.now();

      // 游標圖片跟隨
      cursor.style.left = nowX + "px";
      cursor.style.top = nowY + "px";
        const currentPos = { x: e.clientX, y: e.clientY };

        activePoints.push(currentPos);

        // 當黑點超過 MAX_POINTS，將多出的點轉化為棕色段落
        if (activePoints.length > MAX_POINTS) {
            const oldPoint = activePoints.shift();
            
            // 這裡實作你的邏輯：
            // 如果你希望「新出現的棕色持續留在螢幕上」，我們把它加到 permanentSegments
            // 如果是滑鼠停止後產生的「舊棕色」，則放入 fadingSegments
            
            // 為了符合你說的「正在淡出的繼續淡出，新出的留下」，
            // 我們預設新轉棕色的點直接進入「永久保留區」
            if (permanentSegments.length > 0) {
                permanentSegments[permanentSegments.length - 1].points.push(oldPoint);
            } else {
                permanentSegments.push({ points: [oldPoint], color: '#8B4513' });
            }
        }
        lastMousePos = currentPos;


      // 更新上次位置
      lastX = nowX;
      lastY = nowY;
      lastTime = nowTime;
});
// 監測滑鼠停止，停止時將「當前所有點」轉為「正在淡出」的段落
    let stopTimer;
    window.addEventListener('mousemove', () => {
        clearTimeout(stopTimer);
        stopTimer = setTimeout(() => {
       if (permanentSegments.length > 0) {
                // 我們只把原本就屬於棕色的部分 (permanentSegments) 丟進淡出清單
                const brownPath = [...permanentSegments.flatMap(s => s.points)];
                
                if (brownPath.length > 1) {
                    fadingSegments.push({
                        points: brownPath,
                        opacity: 1
                    });
                }
                // 只清空棕色區，不碰 activePoints
                permanentSegments = []; 
            }
        }, 100); 
    });

    function draw() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // 1. 繪製並更新「正在淡出」的段落
        for (let i = fadingSegments.length - 1; i >= 0; i--) {
            const seg = fadingSegments[i];
            ctx.save();
            ctx.globalAlpha = seg.opacity;
            drawPath(seg.points, '#8B4513');
            ctx.restore();

            seg.opacity -= FADE_SPEED; // 持續淡出，不被新動作打斷
            if (seg.opacity <= 0) {
                fadingSegments.splice(i, 1); // 徹底消失後移除
            }
        }

        // 2. 繪製「持續留在螢幕」的棕色段落 (移動中產生的)
        permanentSegments.forEach(seg => {
            drawPath(seg.points, '#8B4513');
        });

        // 3. 繪製當前的黑線
        if (activePoints.length > 1) {
            if (myColor=='black') drawPath(activePoints, 'black');
            else if (myColor=='white') drawPath(activePoints, 'white');
        }

        requestAnimationFrame(draw);
    }

    function drawPath(pathPoints, color) {
        if (pathPoints.length < 2) return;
        ctx.beginPath();
        ctx.setLineDash([20, 15]);
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = color;

        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length - 1; i++) {
            const xc = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
            const yc = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(pathPoints[i].x, pathPoints[i].y, xc, yc);
        }
        ctx.stroke();
    }
    
    requestAnimationFrame(draw);
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

function initializeMask() {

const canvas = document.getElementById('canvas'); // 取得你的 Canvas
    if (!canvas) return;
    if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    }
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

  // console.log(`黑棋: ${blackScore}, 白棋: ${whiteScore}`);
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


let toggle = true;

function getRandomImageForUpdate() {
  const numw = Math.floor(Math.random() * (14 - 2 + 1)) + 2;
  const numb = Math.floor(Math.random() * (9 - 1 + 1)) + 1;

  if (myColor === 'black') {
    return `b_cat/C${numb}.png`;
  }
  return `w_cat/C${numw}.png`;
}

setInterval(() => {
  if (toggle) {
    if (myColor === 'black'){
    const timg3 = document.getElementById("corner-image3");
    const timg4 = document.getElementById("corner-image4");
    timg3.src = getRandomImageForUpdate();
    timg3.style.opacity = "1";
    timg4.style.opacity = "0";
    }
    else{
    const timg1 = document.getElementById("corner-image1");
    const timg2 = document.getElementById("corner-image2");
    timg2.src = getRandomImageForUpdate();
    timg2.style.opacity = "1";
    timg1.style.opacity = "0";
    }
  } else {
    if (myColor === 'black'){
      const timg3 = document.getElementById("corner-image3");
      const timg4 = document.getElementById("corner-image4");
      timg4.src = getRandomImageForUpdate();
      timg4.style.opacity = "1";
      timg3.style.opacity = "0";
    }
    else  {
    const timg1 = document.getElementById("corner-image1");
    const timg2 = document.getElementById("corner-image2");
    timg1.src = getRandomImageForUpdate();
    timg1.style.opacity = "1";
    timg2.style.opacity = "0";
    }
  }
  toggle = !toggle;
}, 6000);
