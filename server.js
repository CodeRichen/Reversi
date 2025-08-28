const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', socket => {
  let room = findAvailableRoom();
  let color;
let roomId;
  if (!room) {
    roomId = `room-${socket.id}`;
    rooms[roomId] = {
      id: roomId, 
      players: [],
      board: createInitialBoard(),
      turn: 'black',
      ai: false,
      score: {
      black: 0,
      white: 0
  }
    };
    room = rooms[roomId];
  }else {
  roomId = room.id; // 拿現有房間的 ID
}
  socket.join(roomId);
  room.players.push(socket);
  color = room.players.length === 1 ? 'black' : 'white';

  socket.emit("playerColor", color);

 if (room.players.length === 2) {
  room.players.forEach(s => {
    s.emit("startGame", {
      board: room.board,
      turn: room.turn
    });

    s.emit("updateBoard", {
      board: room.board,
      turn: room.turn
    });
  });
}
 else {
    socket.emit("waitingForOpponent");
  }

  // 玩家選擇與 AI 對戰
  socket.on("playAI", () => {
    const aiRoomId = `ai-${socket.id}`;
    rooms[aiRoomId] = {
      players: [socket],
      board: createInitialBoard(),
      turn: 'black',
      ai: true,
      playerColor: 'black',  // 玩家是黑棋先手
      aiColor: 'white',       // AI 是白棋
      scores: { black: 0, white: 0 }
    };
    room = rooms[aiRoomId];
    color = 'black';

    socket.emit("playerColor", color);
    socket.emit("startGame", { board: room.board, turn: room.turn });
    socket.emit("updateBoard", { board: room.board, turn: room.turn });
  });

  socket.on("move", idx => {
    if (room.turn !== color) return;
    
    const x = idx % 8;
    const y = Math.floor(idx / 8);
    const flipped = getFlippable(room.board, x, y, color);
    //TODO 改變樣式
    
    if (room.board[y][x] || flipped.length === 0) {
      socket.emit("invalidMove");
      return;
    }

      setTimeout(() => {
    // 落子並翻轉棋子
    room.board[y][x] = color;
    flipped.forEach(([fx, fy]) => room.board[fy][fx] = color);
      room.turn = color === "black" ? "white" : "black";
      emitUpdateBoard(room);

      if (!room.scores) room.scores = { black: 0, white: 0 };
  const bonus = flipped.length >= 10 ? 5 : flipped.length >= 5 ? 2 : 1;
  room.scores[color] += flipped.length + bonus;

  // 廣播結果給所有該房間玩家

    room.players.forEach(s => s.emit("moveResult", {
    flippedCount: flipped.length,
    flippedPositions: flipped,
    player: color,
    scores: room.scores,
    idx:idx
  }));
      // 只發給對手，不發給自己，要在moveResult之後
    socket.to(roomId).emit("placeidx", idx);
     if (room.ai) {
      // AI 自動下棋
      // console.log(`AI ${room.aiColor} 的回合`);
      aiMoveLogic(room);
    } else {
      // 玩家對戰，判斷下一回合
      // console.log(`玩家 ${color} 的回合`);
      nextTurnLoop(room);
    }
        room.players.forEach(p => {
       p.emit("place",{i:idx,board:room.board});
    });
      }, 300);
  });

  socket.on("checkMove", idx => {
    const x = idx % 8;
    const y = Math.floor(idx / 8);
    const flipped = getFlippable(room.board, x, y, color);
    socket.emit("highlightMove", { idx, isValid: !room.board[y][x] && flipped.length > 0 });
  });

  socket.on("mouseMove", idx => {
    if (room.ai) return;
    room.players.forEach(p => {
      if (p !== socket) p.emit("opponentMouse", idx);
    });
  });

  socket.on("disconnect", () => {
    const id = getRoomId(socket);
    if (id) {
      rooms[id].players.forEach(p => {
        if (p !== socket) p.emit("opponentLeft");
      });
      delete rooms[id];
    }
  });
  
  socket.on("opponentJump", ({ x, y }) => {
  room.players.forEach(p => {
    if (p !== socket) p.emit("opponentDoJump", { x, y });
  });
});
socket.on("opponentMove", ({ x }) => {
  room.players.forEach(p => {
    if (p !== socket) p.emit("opponentDoMove", { x });
  });

});
});



function aiMoveLogic(room) {
  const aiColor = room.aiColor;
  const playerColor = room.playerColor;

  const aiMove = getRandomValidMove(room.board, aiColor);
  
  if (aiMove) {
    const [ax, ay] = aiMove;
    const aiFlipped = getFlippable(room.board, ax, ay, aiColor);

    setTimeout(() => {
      room.board[ay][ax] = aiColor;
      aiFlipped.forEach(([fx, fy]) => room.board[fy][fx] = aiColor);
    const idx=ay*8+ax;

  if (!room.scores) room.scores = { black: 0, white: 0 };
  const bonus = aiFlipped.length >= 10 ? 5 : aiFlipped.length >= 5 ? 2 : 1;
  room.scores[aiColor] += aiFlipped.length + bonus;

  emitUpdateBoard(room);
    room.players.forEach(p => {
        p.emit("place",{i:idx,board:room.board});
    });
    
  // 廣播這次 AI 的動作給 client（
  room.players.forEach(s => s.emit("moveResult", {
    flippedCount: aiFlipped.length,
    flippedPositions: aiFlipped,
    player: aiColor,
    scores: room.scores,
    idx:idx
  }));
  room.players.forEach(s => s.emit("placeidx", ay*8+ax));

      if (checkGameOver(room.board)) {
        endGame(room);
        return;
      }

      // 換回玩家回合
      room.turn = playerColor;
      nextTurnLoop(room);
    }, 1500); //TODO AI思考
  } else {
    console.log(`AI ${aiColor} 跳過回合，因為無法下子`);
    room.players.forEach(s => s.emit("pass", {
      skippedColor: aiColor,
      nextTurn: playerColor
    }));

    room.turn = playerColor;
    nextTurnLoop(room);
  }
}

function nextTurnLoop(room) {
  while (true) {
    const currentColor = room.turn;
    const opponentColor = currentColor === 'black' ? 'white' : 'black';

    // console.log(`目前是 ${currentColor} 的回合`);

    if (hasValidMove(room.board, currentColor)) {
      // 目前玩家能下棋，等待玩家行動
      // console.log(`玩家 ${currentColor} 可以下棋`);
      
      setTimeout(() => {
    room.players.forEach(s => s.emit("updateBoard", {
    board: room.board,
    turn: room.turn,
    changeWhiteImage : true
  }));
      }, 1000); // TODO: 因應每個動畫也不同可以改這邊的持續時間
      break;
    } else if (hasValidMove(room.board, opponentColor)) {
      // 目前玩家不能下，但對手能下，跳過回合換對手下
      room.turn = opponentColor;
      emitUpdateBoard(room);

      room.players.forEach(s => s.emit("pass", {
        skippedColor: currentColor,
        nextTurn: opponentColor
      }));

      console.log(`玩家 ${currentColor} 無法下棋，跳過回合，換 ${opponentColor}`);

      // 如果是 AI 回合，自動執行 AI 下棋
      if (room.ai && opponentColor === room.aiColor) {
        setTimeout(() => aiMoveLogic(room), 500);
      }
      break;
    } else {
      // 雙方都無法下，遊戲結束
      console.log("雙方都無法下棋，遊戲結束");
      endGame(room);
      break;
    }

  }
}

function createInitialBoard() {
  const board = Array(8).fill(null).map(() => Array(8).fill(null));
  board[3][3] = 'white';
  board[3][4] = 'black';
  board[4][3] = 'black';
  board[4][4] = 'white';
  //TODO 測試結束用
  //   for (let y = 0; y < 7; y++) {
  //   for (let x = 0; x < 8; x++) {
  //    board[y][x] = 'white'; 
  //   }
  // }
  // board[0][0] = 'black'; 
  // board[7][0] = 'black';
  // board[7][1] = 'black';
  // board[7][2] = 'black';
  // board[7][3] = 'black';
  // board[7][4] = 'black';
  // board[7][5] = 'black';
  
  return board;
}

function findAvailableRoom() {
  return Object.values(rooms).find(r => r.players.length === 1 && !r.ai);
}

function getRoomId(socket) {
  return Object.entries(rooms).find(([_, r]) => r.players.includes(socket))?.[0];
}

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

function hasValidMove(board, color) {
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      if (!board[y][x] && getFlippable(board, x, y, color).length > 0) {
        // console.log(`玩家 ${color} 可以在 (${x}, ${y}) 下棋`);
        return true;
      }
    }
  }
  return false;
}

function checkGameOver(board) {
  return !hasValidMove(board, 'black') && !hasValidMove(board, 'white');
}

function endGame(room) {
  const flat = room.board.flat();
  const black = flat.filter(c => c === 'black').length;
  const white = flat.filter(c => c === 'white').length;
  const winner = black > white ? 'black' : white > black ? 'white' : 'draw';

  room.players.forEach(s => s.emit("gameOver", { black, white, winner}));
}

function emitUpdateBoard(room) {
  // console.log(`更新房間 ${room.id} 的棋盤，目前輪到 ${room.turn}`);
  room.players.forEach(s => s.emit("updateBoard", {
    board: room.board,
    turn: room.turn
  }));
}

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

server.listen(3000, () => {
  console.log("伺服器啟動：http://localhost:3000");
});
