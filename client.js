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

// 點擊棋盤時發送 move 事件給伺服器，延遲 300ms 讓動畫可以先跑
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
  const catOptions = color === "black"
    ? ["cat_b1.mp4", "cat_b2.mp4","cat_b1.jpg" ]
    : ["cat_w1.mp4", "cat_w2.mp4", ];
  const randomCat = catOptions[Math.floor(Math.random() * catOptions.length)];
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

  // 背景影片（背景系列）
  const bgVideo = document.getElementById("background-video");
  const bgSource = bgVideo.querySelector("source");

  // 定義各種背景影片清單
  const wBackgrounds = ["w-background1.mp4", "w-background2.mp4"];
  const bBackgrounds = ["b-background1.mp4", "b-background2.mp4" ];
  const wbBackgrounds = ["wb-background1.mp4"];

  // 根據玩家顏色組出可用的背景列表
  let availableBackgrounds = [];
  if (color === "black") {
    availableBackgrounds = [...bBackgrounds, ...wbBackgrounds];
  } else {
    availableBackgrounds = [...wBackgrounds, ...wbBackgrounds];
  }

  // 隨機選擇其中一個
  const randomBg = availableBackgrounds[Math.floor(Math.random() * availableBackgrounds.length)];
  bgSource.src = `picture/${randomBg}`;
  bgVideo.load();
  bgVideo.play();
});


// 遊戲開始時初始化畫面與狀態
socket.on("startGame", data => {
  currentTurn = data.turn;       // 設定當前回合
  updateStatus();                // 更新畫面狀態
  document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('aiButton').style.display = "none";
});// 隱藏 AI 對戰按鈕（若有）
const aiBtn = document.getElementById('aiButton');
if (aiBtn) {
  aiBtn.style.display = "none";
} else {
  console.warn("找不到 aiButton，可能尚未載入 DOM！");
}
  // updateBoard(data.board);       // 更新棋盤內容

});

// 每次落子或對手行動後，伺服器傳回新棋盤與回合
socket.on("updateBoard", data => {
  updateBoard(data.board);
  currentTurn = data.turn;
  updateStatus();
  const overlayImg = document.getElementById("cat_bw");
  // console.log(`當前回合: ${currentTurn}, 我的顏色: ${myColor}`);
  // 假設是依據目前輪到誰
  const boardFrame = document.getElementById('board-frame');
  if (currentTurn === myColor) {
    boardFrame.classList.add('glowing');  
    // playBorderAnimationOnTurn();
  }
  else{
    // resetBorderVideos();
    boardFrame.classList.remove('glowing');
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
    cell.innerHTML = "";
  }
});

});

// 若玩家點了非法位置（例如不能落子處），顯示錯誤訊息
socket.on("invalidMove", () => {
  showMessage("這不是合法的落子位置");
});
socket.on("place", idx => {
    audio_place.play();
});
// 當伺服器回傳落子結果時，更新分數與動畫
socket.on("moveResult", ({ flippedCount, flippedPositions, player, scores }) => {
  
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
function updateBoard(board, changeImage = false) {
  let black = 0, white = 0;

  document.querySelectorAll(".cell").forEach((cell, i) => {
    const x = i % 8;
    const y = Math.floor(i / 8);
    const value = board[y][x];

    cell.innerHTML = "";

    if (value) {
      const disk = document.createElement("div");
      disk.className = `disk ${value}`;

      if (value === "white") {
        let imgName;

        if (changeImage || !cell.dataset.whiteImage) {
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

        if (changeImage || !cell.dataset.blackImage) {
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

  document.getElementById("blackCount").textContent = black;
  document.getElementById("whiteCount").textContent = white;
        if(!changeImage) {
        updateCounts(black, white);
        updateBoardOffset();
      }
}



function showMessage(text) {
  const box = document.getElementById("messageBox");
  box.innerText = text;
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

function animateFlip(x, y) {
  const idx = y * 8 + x;
  const cell = document.querySelector(`.cell[data-index='${idx}']`);
  if (cell && cell.firstChild) {
    const disk = cell.firstChild;
    disk.classList.add('flip');

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

function updateBoardOffset() {
  const black = parseInt(document.getElementById("blackCount").textContent);
  const white = parseInt(document.getElementById("whiteCount").textContent);
  const delta = black - white;

  // 設定每顆棋子差距所移動的像素
  const pixelPerDifference = 12;
  const maxOffset = 200;

  // 計算偏移量，限制最大偏移
  let offset = delta * pixelPerDifference;
  offset = Math.max(-maxOffset, Math.min(maxOffset, offset)); 
  // console.log(`偏移量: ${offset}px`); // 調試輸出

  // 套用到棋盤容器上
  const boardWrapper = document.getElementById("game-wrapper");
  boardWrapper.style.transform = `translateX(${offset}px)`;
  boardWrapper.style.transition = "transform 0.5s ease";

  // 移動黑白棋數量顯示
  const countsEl = document.getElementById("counts");
  countsEl.style.transform = `translateX(${offset}px)`;
  countsEl.style.transition = "transform 0.5s ease";
}
let lastState = "black"; // "black"、"white" 或 "tie"

function updateCounts(blackScore, whiteScore) {
  const blackDiv = document.getElementById("blackCounter");
  const whiteDiv = document.getElementById("whiteCounter");

  console.log(`黑棋: ${blackScore}, 白棋: ${whiteScore}`);

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
  console.log(`當前狀態: ${currentState}， 上次狀態: ${lastState}`);

  console.log(`黑棋: ${blackScore}, 白棋: ${whiteScore}`);

  // 根據目前狀態與分數，決定是否要交換
  if (lastState === "black" && currentState === "white") {
    // 白棋逆轉，白在上
    blackDiv.style.transform = "translateY(100%)";
    whiteDiv.style.transform = "translateY(-100%)";
    lastState = "white";
    console.log("白棋逆轉，白在上");
  } else if (lastState === "white" && currentState === "black") {
    // 黑棋逆轉，黑在上
    blackDiv.style.transform = "translateY(-0%)";
    whiteDiv.style.transform = "translateY(0%)";
    lastState = "black";
    console.log("黑棋逆轉，黑在上");
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

document.addEventListener("DOMContentLoaded", () => {
  setupBorderVideos(); // 初始化邊框影片
});


function resetBorderVideos() {
  const allVideos = document.querySelectorAll(".frame-video");
  allVideos.forEach((vid) => {
    vid.pause();          // 先暫停影片
    vid.currentTime = 0;  // 時間設回 0
    vid.style.opacity = "0"; // 隱藏（如果需要）
  });
    hasPlayed = false;
}


