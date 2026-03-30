import { useState, useEffect } from "react";
import { io } from "socket.io-client";

// ✅ create socket OUTSIDE component (good)
const socket = io("http://10.10.14.65:5000");

export default function App() {
  const [roomId, setRoomId] = useState("");
  const [username, setUsername] = useState("");
  const [joined, setJoined] = useState(false);
  const [room, setRoom] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ SOCKET LISTENERS
  useEffect(() => {
    socket.on("connect", () => {
      console.log("✅ Connected:", socket.id);
    });

    socket.on("roomUpdate", (data) => {
      console.log("📦 ROOM UPDATE:", data);

      setRoom(data);
      setJoined(true);     // ✅ ONLY here
      setLoading(false);   // ✅ stop loading
    });
socket.on("gameOver", (data) => {
  console.log(data);

  if (!data || !data.rankings) {
    alert("Game Over");
  } else {
    const { winner, rankings } = data;

    let message = `🏆 Winner: ${winner}\n\n📊 Rankings:\n`;

    rankings.forEach((p) => {
      message += `${p.rank}. ${p.username} - Score: ${p.score} (Cards: ${p.cardsLeft})\n`;
    });

    alert(message);
  }

  setRoom(null);
  setJoined(false);
  setLoading(false);
});
    socket.on("errorMsg", (msg) => {
      alert(msg);
      setJoined(false);
      setLoading(false);
    });

    return () => {
      socket.off("connect");
      socket.off("roomUpdate");
      socket.off("gameOver");
      socket.off("errorMsg");
    };
  }, []);

  




  // ✅ ACTIONS
  const createRoom = () => {
    if (!roomId || !username) {
      alert("Enter details");
      return;
    }

    setLoading(true); // ✅ show loading
    socket.emit("createRoom", { roomId, username });
  };

  const joinRoom = () => {
    if (!roomId || !username) {
      alert("Enter details");
      return;
    }

    setLoading(true); // ✅ show loading
    socket.emit("joinRoom", { roomId, username });
  };

  const startGame = () => {
    socket.emit("startGame", roomId);
  };

  // const makeMove = (r, c) => {
  //   socket.emit("makeMove", { roomId, row: r, col: c });
  // };
  const suitSymbols = {
  H: "♥",
  D: "♦",
  C: "♣",
  S: "♠"
};

const suitOrder = ["H", "D", "C", "S"];
// const skipTurn = () => {
//   socket.emit("skipTurn", roomId);
// };
const playCard = (card) => {
   if (!canPlayCard(card, room)) {
    alert("Invalid move");   // ✅ only this player sees it
    return;
  }
  socket.emit("playCard", { roomId, card });
};
const canPlayCard = (card, room) => {
  const [rank, suit] = card.split("-");
  const pile = room.pile[suit];

  const rankOrder = [
    "A","2","3","4","5","6","7",
    "8","9","10","J","Q","K"
  ];

  const isFirstMove = Object.values(room.pile)
    .every(arr => arr.length === 0);

  if (isFirstMove) return card === "7-H";

  if (pile.length === 0) return rank === "7";

  const indices = pile.map(c =>
    rankOrder.indexOf(c.split("-")[0])
  );

  const min = Math.min(...indices);
  const max = Math.max(...indices);
  const idx = rankOrder.indexOf(rank);

  return idx === min - 1 || idx === max + 1;
};

useEffect(() => {
  if (!room || !room.started) return;

  const currentPlayer = room.players[room.turnIndex];
  const isMyTurnNow = currentPlayer?.id === socket.id;

  if (!isMyTurnNow) return;

  const myPlayer = room.players.find(p => p.id === socket.id);
  const myHand = myPlayer?.hand || [];

  // 🔍 check if ANY playable card exists
  const hasPlayable = myHand.some(card =>
    canPlayCard(card, room)
  );

  // 🚫 no moves → auto skip
  if (!hasPlayable) {
    //alert("No valid moves → auto skipping");

    // small delay for UX (optional but feels better)
    setTimeout(() => {
      socket.emit("skipTurn", roomId);
    }, 500);
  }

}, [room,roomId]);



  // ✅ BEFORE JOIN SCREEN
  if (!joined) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Sevens</h2>

        <input
          placeholder="Username"
          onChange={(e) => setUsername(e.target.value)}
        />
        <br /><br />

        <input
          placeholder="Room ID"
          onChange={(e) => setRoomId(e.target.value)}
        />
        <br /><br />

        <button onClick={createRoom}>Create Room</button>
        <button onClick={joinRoom} style={{ marginLeft: 10 }}>
          Join Room
        </button>

        {loading && <p>Connecting...</p>}
      </div>
    );
  }

  // ✅ LOADING STATE AFTER JOIN
  if (!room) {
    return <div style={{ padding: 20 }}>Loading room...</div>;
  }

  const currentPlayer = room.players[room.turnIndex];
  const isMyTurn = currentPlayer?.id === socket.id;
  const isHost = room.hostId === socket.id;

  // ✅ GAME UI
  return (
    <div style={{ padding: 20 }}>
      <h2>Room: {roomId}</h2>

      {/* PLAYERS */}
      <h3>Players:</h3>
      <ul>
        {room.players.map((p) => (
          <li key={p.id}>
            {p.username} {p.id === room.hostId && "(Host)"}
          </li>
        ))}
      </ul>

      {/* WAITING */}
      {!room.started && (
        <>
          <h3>Waiting for at least 3 players...</h3>

          {isHost && (
            <button onClick={startGame}>
              Start Game
            </button>
          )}
        </>
      )}

      {/* GAME STATUS */}
      {room.started && (
        <>
          <h3>Turn: {currentPlayer?.username}</h3>
          <h4>
            {isMyTurn ? "Your Turn" : "Wait for your turn"}
          </h4>
        </>
      )}

      {/* YOUR CARDS */}
      <h3>Your Cards:</h3>
<div>
  {room.players
    .find(p => p.id === socket.id)
    ?.hand?.map((card, idx) => (
      <button
  key={idx}
  onClick={() => playCard(card)}
  disabled={!isMyTurn}
  style={{
    marginRight: 8,
    padding: 5,
    cursor: isMyTurn ? "pointer" : "not-allowed",
    opacity:
      isMyTurn ? 1 : 0.5
  }}
>
  {card}
</button>
    ))}
</div>
{/* {room.started && isMyTurn && (
  <button
    onClick={skipTurn}
    style={{
      marginTop: 10,
      padding: 8,
      backgroundColor: "#ffcc00",
      border: "none",
      cursor: "pointer"
    }}
  >
    Skip Turn
  </button>
)} */}
<h3>Piles:</h3>

<div style={{ marginTop: 10 }}>
  {suitOrder.map((suit) => {
    const pile = room.pile?.[suit] || [];

    return (
      <div
        key={suit}
        style={{
          display: "flex",
          alignItems: "center",
          marginBottom: 10
        }}
      >
        {/* Suit Label */}
        <div style={{ width: 40, fontWeight: "bold" }}>
          {suitSymbols[suit]}
        </div>

        {/* Cards */}
        <div style={{ display: "flex", gap: "5px" }}>
          {pile.length === 0 ? (
            <div style={{ opacity: 0.5 }}>
              Empty
            </div>
          ) : (
            pile
              .sort((a, b) => {
                const order = [
                  "A","2","3","4","5","6","7",
                  "8","9","10","J","Q","K"
                ];
                return (
                  order.indexOf(a.split("-")[0]) -
                  order.indexOf(b.split("-")[0])
                );
              })
              .map((card, idx) => (
                <div
                  key={idx}
                  style={{
                    padding: "5px 8px",
                    border: "1px solid black",
                    borderRadius: 4,
                    backgroundColor: "white"
                  }}
                >
                  {card}
                </div>
              ))
          )}
        </div>
      </div>
    );
  })}
</div>
      
    </div>
  );
}