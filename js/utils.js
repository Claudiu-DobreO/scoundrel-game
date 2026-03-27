export const MAX_HEALTH = 20;
export const STORAGE_KEY = 'scoundrel-portfolio-save';

const rankMap = {
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  10: '10',
  11: 'J',
  12: 'Q',
  13: 'K',
  14: 'A',
};

const suitSymbols = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
};

export const createSeededRandom = (seedString) => {
  const xmur3 = (input) => {
    let hash = 1779033703 ^ input.length;

    for (let index = 0; index < input.length; index += 1) {
      hash = Math.imul(hash ^ input.charCodeAt(index), 3432918353);
      hash = (hash << 13) | (hash >>> 19);
    }

    return () => {
      hash = Math.imul(hash ^ (hash >>> 16), 2246822507);
      hash = Math.imul(hash ^ (hash >>> 13), 3266489909);
      hash ^= hash >>> 16;
      return hash >>> 0;
    };
  };

  const mulberry32 = (seedNumber) => () => {
    let value = (seedNumber += 0x6d2b79f5);
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };

  return mulberry32(xmur3(seedString)());
};

export const fisherYatesShuffle = (items, randomFn = Math.random) => {
  const shuffledItems = [...items];

  for (let index = shuffledItems.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(randomFn() * (index + 1));
    [shuffledItems[index], shuffledItems[swapIndex]] = [shuffledItems[swapIndex], shuffledItems[index]];
  }

  return shuffledItems;
};

export const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const getCardLabel = (card) => `${suitSymbols[card.suit]}${rankMap[card.value]}`;

export const getCardType = (card) => {
  if (card.suit === 'diamonds') return 'weapon';
  if (card.suit === 'hearts') return 'potion';
  return 'monster';
};

export const getSuitSymbol = (card) => suitSymbols[card.suit];

export const getValueLabel = (value) => rankMap[value];

export const getCardColorClass = (card) => {
  if (card.suit === 'hearts' || card.suit === 'diamonds') return 'card-red';
  return 'card-black';
};

export const getCardArtPath = (card) => {
  if (card.suit === 'hearts') {
    return 'assets/heart.jpg';
  }

  if (card.suit === 'clubs') {
    if (card.value >= 2 && card.value <= 5) return 'assets/club-1.jpg';
    if (card.value >= 6 && card.value <= 10) return 'assets/club-2.jpg';
    return 'assets/club-3.jpg';
  }

  if (card.suit === 'spades') {
    if (card.value >= 2 && card.value <= 5) return 'assets/spade-1.jpg';
    if (card.value >= 6 && card.value <= 10) return 'assets/spade-2.jpg';
    return 'assets/spade-3.jpg';
  }

  if (card.suit === 'diamonds') {
    if (card.value >= 2 && card.value <= 4) return 'assets/diamond-1.jpg';
    if (card.value >= 5 && card.value <= 7) return 'assets/diamond-2.jpg';
    return 'assets/diamond-3.jpg';
  }

  return '';
};

export const isMonsterCard = (card) => getCardType(card) === 'monster';

export const sumRemainingMonsterValues = (cards) =>
  cards.filter((card) => isMonsterCard(card)).reduce((total, card) => total + card.value, 0);

export const createDeck = () => {
  const suits = ['hearts', 'diamonds', 'clubs', 'spades'];
  const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
  const createdDeck = [];

  values.forEach((rawValue) => {
    suits.forEach((suit) => {
      const value = rawValue === 1 ? 14 : rawValue;
      const isRedSuit = suit === 'hearts' || suit === 'diamonds';
      const isFaceCard = rawValue >= 11 && rawValue <= 13;
      const isAce = rawValue === 1;

      if (isRedSuit && (isFaceCard || isAce)) {
        return;
      }

      if ((suit === 'hearts' || suit === 'diamonds') && value < 2) {
        return;
      }

      createdDeck.push({
        id: `${suit}-${value}`,
        suit,
        value,
      });
    });
  });

  return createdDeck;
};

export const createLogEntry = (message, turn) => ({
  id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  message,
  turn,
});