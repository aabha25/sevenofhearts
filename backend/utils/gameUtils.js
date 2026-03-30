export const createGrid = () =>
  Array.from({ length: 5 }, () => Array(5).fill(0));

export const isGameOver = (grid) =>
  grid.every(row => row.every(cell => cell === 1));

export const createDeck = () => {
  const suits = ["H", "D", "C", "S"];
  const ranks = [
    "A","2","3","4","5","6","7",
    "8","9","10","J","Q","K"
  ];

  const deck = [];

  for (const suit of suits) {
    for (const rank of ranks) {
      deck.push(`${rank}-${suit}`);
    }
  }

  return deck;
};

export const shuffleDeck = (deck) => {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
};