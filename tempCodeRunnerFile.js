 socket.on("move", idx => {
    if (room.turn !== color) return;

    const x = idx % 8;
    const y = Math.floor(idx / 8);
    const flipped = getFlippable(room.board, x, y, color);

    if (room.board[y][x] || flipped.length === 0) {
      socket.emit("invalidMove");
      return;
    }

    // 落子並翻轉棋子
    room.board[y][x] = color;
    flipped.forEach(([fx, fy]) => room.board[fy][fx] = color);
      room.turn = color === "black" ? "white" : "black";
      emitUpdateBoard(room);

      if (!room.scores) room.scores = { black: 0, white: 0 };
  const bonus = flipped.length >= 10 ? 5 : flipped.length >= 5 ? 2 : 1;
  room.scores[color] += flipped.length + bonus;

  // 廣播結果給所有該房間玩家
  io.to(room.id).emit("moveResult", {
    flippedCount: flipped.length,
    flippedPositions: flipped,
    player: color,
    scores: room.scores // 把黑白分數一起傳回 client
  });
     if (room.ai) {
      // AI 自動下棋
      console.log(`AI ${room.aiColor} 的回合`);
      aiMoveLogic(room);
    } else {
      // 玩家對戰，判斷下一回合
      console.log(`玩家 ${color} 的回合`);
      nextTurnLoop(room);
    }
  });