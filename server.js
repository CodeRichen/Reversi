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
  const roomId = getRoomId(socket);
  const color = room.players.length === 1 ? 'black' : 'white';

  socket.emit("playerColor", color);

  if (room.players.length === 2) {
    room.players.forEach(s => s.emit("startGame", {
      board: room.board,
      turn: room.turn
    }));
  } else {
    socket.emit("waitingForOpponent");
  }

  socket.on("move", idx => {
    if (room.turn !== color) return;

    const x = idx % 8;
    const y = Math.floor(idx / 8);

    const flipped = getFlippable(room.board, x, y, color);
    if (room.board[y][x] || flipped.length === 0) return;

    room.board[y][x] = color;
    flipped.forEach(([fx, fy]) => room.board[fy][fx] = color);
    room.turn = color === "black" ? "white" : "black";

    room.players.forEach(s => s.emit("updateBoard", {
      board: room.board,
      turn: room.turn
    }));
  });

  socket.on("disconnect", () => {
    const id = getRoomId(socket);
    if (id) delete rooms[id];
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
  return Object.values(rooms).find(r => r.players.length === 1);
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

server.listen(3000, () => {
  console.log("伺服器啟動：http://localhost:3000");
});
