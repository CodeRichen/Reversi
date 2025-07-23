// 載入所需的模組
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

// 初始化 Express 應用和 HTTP 伺服器
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// 將目前資料夾的靜態檔案提供給前端
app.use(express.static(__dirname));

// 儲存所有房間的資料，每個房間會有玩家、棋盤狀態等資訊
let rooms = {};

// 當有用戶連線進來
io.on('connection', socket => {
  let room = findAvailableRoom();  // 尋找有空位的房間
  let color;                       // 紀錄玩家顏色（黑或白）

  // 如果沒有找到房間，幫玩家開新房間
  if (!room) {
    const roomId = `room-${socket.id}`;
    rooms[roomId] = {
      players: [],
      board: createInitialBoard(), // 建立初始棋盤
      turn: 'black'                // 黑棋先手
    };
    room = rooms[roomId];
  }

  room.players.push(socket);              // 把玩家加入房間
  color = room.players.length === 1 ? 'black' : 'white'; // 第一個是黑棋，第二個是白棋

  socket.emit("playerColor", color);      // 告知玩家顏色

  if (room.players.length === 2) {
    // 如果湊齊兩位玩家，通知開始遊戲
    room.players.forEach(s => s.emit("startGame", {
      board: room.board,
      turn: room.turn
    }));
  } else {
    socket.emit("waitingForOpponent"); // 等待對手
  }

  // 玩家選擇與 AI 對戰
  socket.on("playAI", () => {
    const aiRoomId = `ai-${socket.id}`;
    rooms[aiRoomId] = {
      players: [socket],
      board: createInitialBoard(),
      turn: 'black',
      ai: true  // 標記是 AI 對戰
    };
    room = rooms[aiRoomId];
    color = 'black'; // 玩家永遠是黑棋
    socket.emit("playerColor", color);
    socket.emit("startGame", { board: room.board, turn: room.turn });
  });

  // 玩家下棋的動作
  socket.on("move", idx => { 
    if (room.turn !== color) return; // 如果還沒輪到你就不處理

    const x = idx % 8;
    const y = Math.floor(idx / 8);
    const flipped = getFlippable(room.board, x, y, color); // 檢查翻轉的棋子

    // 如果該格已經有棋子或不能翻任何子
    if (room.board[y][x] || flipped.length === 0) {
      socket.emit("invalidMove");
      return;
    }

    room.board[y][x] = color; // 落子
    flipped.forEach(([fx, fy]) => room.board[fy][fx] = color); // 翻轉

    room.turn = color === "black" ? "white" : "black"; // 換人

    emitUpdateBoard(room); // 更新所有人棋盤

    socket.emit("moveResult", {
      flippedCount: flipped.length,
      flippedPositions: flipped,
      player: color
    });

    // 如果是 AI 對戰且輪到 AI
    if (room.ai && room.turn === 'white') {
      const aiMove = getRandomValidMove(room.board, 'white');
      if (aiMove) {
        const [ax, ay] = aiMove;
        const aiFlipped = getFlippable(room.board, ax, ay, 'white');

        setTimeout(() => {
          room.board[ay][ax] = 'white';
          aiFlipped.forEach(([fx, fy]) => room.board[fy][fx] = 'white');
          room.turn = 'black'; // 換回玩家

          emitUpdateBoard(room);

          socket.emit("moveResult", {
            flippedCount: aiFlipped.length,
            flippedPositions: aiFlipped,
            player: 'white',
            placedPosition: [ax, ay]
          });
  

          if (checkGameOver(room.board)) {
            endGame(room);
          }
        }, 500); // AI 思考 0.5 秒
      }
    }

    if (checkGameOver(room.board)) {
      endGame(room);
    }
  });

  // 玩家移動滑鼠檢查某格是否合法
  socket.on("checkMove", idx => {
    const x = idx % 8;
    const y = Math.floor(idx / 8);
    const flipped = getFlippable(room.board, x, y, color);
    socket.emit("highlightMove", { idx, isValid: !room.board[y][x] && flipped.length > 0 });
  });

  // 傳遞滑鼠位置給對手
  socket.on("mouseMove", idx => {
    if (room.ai) return; // AI 對戰不需要
    room.players.forEach(p => {
      if (p !== socket) p.emit("opponentMouse", idx);
    });
  });

  // 玩家斷線
  socket.on("disconnect", () => {
    const id = getRoomId(socket);
    if (id) {
      rooms[id].players.forEach(p => {
        if (p !== socket) p.emit("opponentLeft");
      });
      delete rooms[id]; // 清理房間
    }
  });
});

// === 以下是輔助函數 ===

// 建立棋盤初始狀態
function createInitialBoard() {
  const board = Array(8).fill().map(() => Array(8).fill(null));
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
  return board;
}

// 找到一個還缺一位玩家的房間
function findAvailableRoom() {
  return Object.values(rooms).find(r => r.players.length === 1 && !r.ai);
}

// 找到玩家所在的房間 ID
function getRoomId(socket) {
  return Object.entries(rooms).find(([_, r]) => r.players.includes(socket))?.[0];
}

// 檢查某位置放下去後可以翻的棋子
function getFlippable(board, x, y, color) {
  const directions = [
    [0, 1], [1, 0], [0, -1], [-1, 0],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ];
  const opponent = color === "black" ? "white" : "black";
  let flipped = [];

  for (let [dx, dy] of directions) {
    let nx = x + dx, ny = y + dy;
    let line = [];

    while (nx >= 0 && nx < 8 && ny >= 0 && ny < 8) {
      if (board[ny][nx] === opponent) {
        line.push([nx, ny]);
      } else if (board[ny][nx] === color && line.length) {
        flipped = flipped.concat(line);
        break;
      } else {
        break;
      }
      nx += dx;
      ny += dy;
    }
  }
  return flipped;
}

// 檢查是否遊戲結束（雙方都不能再下了）
function checkGameOver(board) {
  const colors = ["black", "white"];
  for (let color of colors) {
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        if (!board[y][x] && getFlippable(board, x, y, color).length > 0) {
          return false;
        }
      }
    }
  }
  return true;
}

// 遊戲結束，通知雙方
function endGame(room) {
  const flat = room.board.flat();
  const black = flat.filter(c => c === 'black').length;
  const white = flat.filter(c => c === 'white').length;
  const winner = black > white ? 'black' : white > black ? 'white' : 'draw';

  room.players.forEach(s => s.emit("gameOver", { black, white, winner }));
}

// 更新雙方的棋盤畫面
function emitUpdateBoard(room) {
  room.players.forEach(s => s.emit("updateBoard", {
    board: room.board,
    turn: room.turn
  }));
}

// AI 隨機選擇一個合法位置
function getRandomValidMove(board, color) {
  const moves = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!board[y][x] && getFlippable(board, x, y, color).length > 0) {
        moves.push([x, y]);
      }
    }
  }
  if (moves.length === 0) return null;
  return moves[Math.floor(Math.random() * moves.length)];
}

// 啟動伺服器
server.listen(3000, () => {
  console.log("伺服器啟動：http://localhost:3000");
});

