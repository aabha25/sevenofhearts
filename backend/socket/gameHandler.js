import {
  createGrid,
  isGameOver,
  createDeck,
  shuffleDeck
} from "../utils/gameUtils.js";

const rooms = {};

// 🔐 SAFE EMIT (each player sees only their own hand)
const emitRoomUpdate = (io, roomId, room) => {
  room.players.forEach(player => {
    io.to(player.id).emit("roomUpdate", {
      ...room,
      players: room.players.map(p => ({
        id: p.id,
        username: p.username,
        hand: p.id === player.id ? p.hand : undefined
      }))
    });
  });
};
const getCardParts = (card) => {
  const [rank, suit] = card.split("-");
  return { rank, suit };
};

const calculateScore = (hand) => {
  let sum = 0;

  hand.forEach(card => {
    const { rank } = getCardParts(card);
    sum += rankOrder.indexOf(rank) + 1;
  });

  return sum * hand.length;
};



const rankOrder = [
  "A","2","3","4","5","6","7",
  "8","9","10","J","Q","K"
];
export const handleSocket = (io, socket) => {

  // ✅ CREATE ROOM
  socket.on("createRoom", ({ roomId, username }) => {
    if (!roomId || !username) {
      socket.emit("errorMsg", "Invalid input");
      return;
    }

    if (rooms[roomId]) {
      socket.emit("errorMsg", "Room already exists");
      return;
    }

    rooms[roomId] = {
      hostId: socket.id,
      players: [{ id: socket.id, username, hand: [] }],
      grid: createGrid(),
      turnIndex: 0,
      started: false,
    pile: {
  H: [],
  D: [],
  C: [],
  S: []
}
    };

    socket.join(roomId);
    emitRoomUpdate(io, roomId, rooms[roomId]);
  });

  // ✅ JOIN ROOM
  socket.on("joinRoom", ({ roomId, username }) => {
  const room = rooms[roomId];

  if (!room) {
    socket.emit("errorMsg", "Room does not exist");
    return;
  }

  if (room.players.length >= 10) {
    socket.emit("errorMsg", "Room full");
    return;
  }

  // ✅ normalize username (avoid case issues like "Aabha" vs "aabha")
  const normalizedUsername = username.trim().toLowerCase();

  // 🚫 check duplicate username
  const usernameExists = room.players.some(
    p => p.username.toLowerCase() === normalizedUsername
  );

  if (usernameExists) {
    socket.emit("errorMsg", "Username already taken in this room");
    return;
  }

  // 🚫 prevent duplicate socket joins
  const alreadyExists = room.players.some(
    p => p.id === socket.id
  );

  if (!alreadyExists) {
    room.players.push({
      id: socket.id,
      username: username.trim(),
      hand: []
    });
  }

  socket.join(roomId);
  emitRoomUpdate(io, roomId, room);
});

  // ✅ START GAME (ONLY HOST)
  socket.on("startGame", (roomId) => {
    const room = rooms[roomId];

    if (!room || room.hostId !== socket.id) return;

    if (room.players.length < 3) {
      socket.emit("errorMsg", "Need at least 3 players");
      return;
    }

    // 🔄 RESET GAME STATE
    room.grid = createGrid();
    room.turnIndex = 0;
    room.pile = {
  H: [],
  D: [],
  C: [],
  S: []
};
    // 🃏 CREATE & SHUFFLE DECK
    let deck = shuffleDeck(createDeck());

    // 🃏 CLEAR HANDS
    room.players.forEach(p => (p.hand = []));

    // 🎯 FIND HOST INDEX
    const hostIndex = room.players.findIndex(
      p => p.id === room.hostId
    );

    if (hostIndex === -1) {
      socket.emit("errorMsg", "Host error");
      return;
    }

    // 🔁 DISTRIBUTE CARDS (round-robin)
    let turn = hostIndex;

    while (deck.length > 0) {
      room.players[turn].hand.push(deck.pop());
      turn = (turn + 1) % room.players.length;
    }

    room.started = true;

    emitRoomUpdate(io, roomId, room);
  });

  // ✅ MAKE MOVE
  socket.on("makeMove", ({ roomId, row, col }) => {
    const room = rooms[roomId];
    if (!room || !room.started) return;

    const currentPlayer = room.players[room.turnIndex];

    if (currentPlayer.id !== socket.id) return;
    if (room.grid[row][col] === 1) return;

    room.grid[row][col] = 1;

    // 🏁 GAME OVER
    if (isGameOver(room.grid)) {
      io.to(roomId).emit("gameOver");
      delete rooms[roomId];
      return;
    }

    room.turnIndex =
      (room.turnIndex + 1) % room.players.length;

    emitRoomUpdate(io, roomId, room);
  });
  //skipTurn
  socket.on("skipTurn", (roomId) => {
  const room = rooms[roomId];
  if (!room || !room.started) return;

  const playerIndex = room.players.findIndex(
    p => p.id === socket.id
  );

  if (playerIndex === -1) return;

  // ✅ only current player can skip
  if (room.turnIndex !== playerIndex) return;

  // 🔄 move to next player
  room.turnIndex =
    (room.turnIndex + 1) % room.players.length;

  emitRoomUpdate(io, roomId, room);
});
  // ❌ DISCONNECT
  socket.on("disconnect", () => {
    for (const roomId in rooms) {
      const room = rooms[roomId];

      const wasHost = room.hostId === socket.id;

      // remove player
      room.players = room.players.filter(
        p => p.id !== socket.id
      );

      if (room.players.length === 0) {
        delete rooms[roomId];
        continue;
      }

      // 👑 TRANSFER HOST
      if (wasHost) {
        room.hostId = room.players[0].id;
      }

      // 🔄 FIX TURN INDEX
      room.turnIndex =
        room.turnIndex % room.players.length;

      emitRoomUpdate(io, roomId, room);
    }
  });

  socket.on("playCard", ({ roomId, card }) => {
  const room = rooms[roomId];
  if (!room || !room.started) return;

  const playerIndex = room.players.findIndex(
    p => p.id === socket.id
  );

  if (playerIndex === -1) return;

  if (room.turnIndex !== playerIndex) return;

  const player = room.players[playerIndex];

  const cardIndex = player.hand.indexOf(card);
  if (cardIndex === -1) return;

  const { rank, suit } = getCardParts(card);

  const suitPile = room.pile[suit];

  // 🧠 RULE 1: First move must be 7-H
  const isFirstMove = Object.values(room.pile)
    .every(arr => arr.length === 0);

  if (isFirstMove) {
    if (card !== "7-H") {
      socket.emit("errorMsg", "First move must be 7-H");
      return;
    }

    suitPile.push(card);
  } else {

    // 🧠 RULE 2: If suit not started → only 7 allowed
    if (suitPile.length === 0) {
      if (rank !== "7") {
        socket.emit("errorMsg", "Only 7 can start a suit");
        return;
      }

      suitPile.push(card);
    } else {
      // 🧠 RULE 3: Build sequence

      const indices = suitPile.map(c =>
        rankOrder.indexOf(getCardParts(c).rank)
      );

      const min = Math.min(...indices);
      const max = Math.max(...indices);

      const currentIndex = rankOrder.indexOf(rank);

      // allow extending below OR above
      if (currentIndex === min - 1 || currentIndex === max + 1) {
        suitPile.push(card);
      } else {
        socket.emit("errorMsg", "Invalid move");
        return;
      }
    }
  }

  // ✅ remove from hand
  player.hand.splice(cardIndex, 1);


 // 🏁 WIN
if (player.hand.length === 0) {

  // 🎯 Calculate scores
  const results = room.players.map(p => ({
    username: p.username,
    cardsLeft: p.hand.length,
    score: calculateScore(p.hand)
  }));

  // 📊 Sort ascending (lower score = better)
  results.sort((a, b) => a.score - b.score);

  // 🏅 Assign ranks with tie handling
  let rank = 1;

  results.forEach((p, index) => {
    if (index > 0 && p.score === results[index - 1].score) {
      p.rank = results[index - 1].rank; // same rank for tie
    } else {
      p.rank = rank;
    }
    rank = index + 2; // next rank position
  });

  io.to(roomId).emit("gameOver", {
    winner: player.username,
    rankings: results
  });

  delete rooms[roomId];
  return;
}
  // 🔄 next turn
  room.turnIndex =
    (room.turnIndex + 1) % room.players.length;

  emitRoomUpdate(io, roomId, room);
});
};

