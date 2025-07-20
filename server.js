// === server.js ===
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

  if (!room) {
    const roomId = `room-${socket.id}`;
    rooms[roomId] = {
      players: [],
      board: createInitialBoard(),
      turn: 'black'
    };
    room = rooms[roomId];
  }

  room.players.push(socket);
  color = room.players.length === 1 ? 'black' : 'white';

  socket.emit("playerColor", color);

  if (room.players.length === 2) {
    room.players.forEach(s => s.emit("startGame", {
      board: room.board,
      turn: room.turn
    }));
  } else {
    socket.emit("waitingForOpponent");
  }

 socket.on("playAI", () => {
  const aiRoomId = `ai-${socket.id}`;
  rooms[aiRoomId] = {
    players: [socket],
    board: createInitialBoard(),
    turn: 'black',
    ai: true
  };
    room = rooms[aiRoomId];
    color = 'black';
    socket.emit("playerColor", color);
    socket.emit("startGame", { board: room.board, turn: room.turn });
  });

socket.on("move", idx => { 
  if (room.turn !== color) return;

  const x = idx % 8;
  const y = Math.floor(idx / 8);

  const flipped = getFlippable(room.board, x, y, color);
  if (room.board[y][x] || flipped.length === 0) {
    socket.emit("invalidMove");
    return;
  }

  room.board[y][x] = color;
  flipped.forEach(([fx, fy]) => room.board[fy][fx] = color);
  room.turn = color === "black" ? "white" : "black";

  emitUpdateBoard(room);

  socket.emit("moveResult", {
    flippedCount: flipped.length,
    flippedPositions: flipped,
    player: color
  });

  // === AI 邏輯 ===
  if (room.ai && room.turn === 'white') {
    const aiMove = getRandomValidMove(room.board, 'white');
    if (aiMove) {
      const [ax, ay] = aiMove;
      const aiFlipped = getFlippable(room.board, ax, ay, 'white');

      setTimeout(() => {
        room.board[ay][ax] = 'white';
        aiFlipped.forEach(([fx, fy]) => room.board[fy][fx] = 'white');
        room.turn = 'black';

        emitUpdateBoard(room);

        socket.emit("moveResult", {
          flippedCount: aiFlipped.length,
          flippedPositions: aiFlipped,
          player: 'white'
        });

        if (checkGameOver(room.board)) {
          endGame(room);
        }
      }, 1000); 
    }
  }

  if (checkGameOver(room.board)) {
    endGame(room);
  }
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
});

function createInitialBoard() {
  const board = Array(8).fill().map(() => Array(8).fill(null));
  board[3][3] = "white";
  board[3][4] = "black";
  board[4][3] = "black";
  board[4][4] = "white";
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

function endGame(room) {
  const flat = room.board.flat();
  const black = flat.filter(c => c === 'black').length;
  const white = flat.filter(c => c === 'white').length;
  const winner = black > white ? 'black' : white > black ? 'white' : 'draw';

  room.players.forEach(s => s.emit("gameOver", { black, white, winner }));
}

function emitUpdateBoard(room) {
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

