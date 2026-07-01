/**
 * Bidcraft – Spielvorbereitung
 * Erzeugt Kartensätze, teilt Handkarten aus, baut die Markt-Stapel.
 */

import type {
  Card, Suit, Rank, PlayerState, GameState, NewGameConfig, AIProfile, AIDifficulty,
} from '../../../shared/types';

const SUITS: Suit[] = ['diamonds', 'hearts', 'spades', 'clubs'];
const RANKS: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];

/** Erzeugt ein vollständiges 52-Karten-Deck mit eindeutigen IDs. */
export function createDeck(tag: string): Card[] {
  const deck: Card[] = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      deck.push({ suit, rank, id: `${suit}-${rank}-${tag}` });
    }
  }
  return deck;
}

/** Fisher-Yates-Shuffle (mutiert nicht das Original). */
export function shuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Erzeugt die 13 Handkarten eines Spielers aus Kartensatz 1:
 * je eine Karte 2–A in beliebiger Farbe.
 * Wir verteilen die Farben zufällig, da die Farbe der Handkarten ("Geld")
 * für die Gebotsmechanik irrelevant ist (nur der Zahlenwert zählt).
 */
export function createHand(playerTag: string, rng: () => number = Math.random): Card[] {
  const hand: Card[] = [];
  for (const rank of RANKS) {
    const suit = SUITS[Math.floor(rng() * SUITS.length)];
    hand.push({ suit, rank, id: `hand-${playerTag}-${rank}` });
  }
  return hand;
}

const AI_PROFILES: Record<AIDifficulty, AIProfile> = {
  easy: {
    difficulty: 'easy',
    lookahead: 0,
    bluffProbability: 0.0,
    economyDiscipline: 0.3,
    randomness: 0.4,
  },
  medium: {
    difficulty: 'medium',
    lookahead: 1,
    bluffProbability: 0.15,
    economyDiscipline: 0.7,
    randomness: 0.15,
  },
  hard: {
    difficulty: 'hard',
    lookahead: 3,
    bluffProbability: 0.3,
    economyDiscipline: 0.95,
    randomness: 0.05,
  },
};

export function getAIProfile(difficulty: AIDifficulty): AIProfile {
  return { ...AI_PROFILES[difficulty] };
}

/**
 * Erzeugt einen Spieler mit ausgeteilten Handkarten.
 * Die Tie Card wird noch NICHT gewählt (passiert in der tieCardSelection-Phase).
 */
function createPlayer(
  index: number,
  isHuman: boolean,
  name: string,
  difficulty: AIDifficulty,
  rng: () => number,
): PlayerState {
  return {
    id: `p${index}`,
    name,
    isHuman,
    hand: createHand(`p${index}`, rng),
    tieCard: null,
    tieCardRevealed: false,
    deck: [null, null, null, null],
    singles: [],
    discard: [],
    doubleBidsUsed: 0,
    emptyBidsUsed: 0,
    drawnCards: 0,
    hasBet: false,
    scoringMode: null,
    aiProfile: isHuman ? null : getAIProfile(difficulty),
  };
}

/**
 * Initialisiert einen neuen Spielzustand.
 * 3 Spieler: 13 Runden, Stapel A=18, B=8 (26 Karten Kartensatz 2)
 * 4 Spieler: 17 Runden, Stapel A=26, B=8 (34 Karten Kartensatz 2)
 */
export function createGame(config: NewGameConfig, rng: () => number = Math.random): GameState {
  const { playerCount, humanName, aiDifficulty } = config;

  const players: PlayerState[] = [];
  // Spieler 0 ist der Mensch
  players.push(createPlayer(0, true, humanName || 'Du', aiDifficulty, rng));
  for (let i = 1; i < playerCount; i++) {
    players.push(createPlayer(i, false, `KI ${i}`, aiDifficulty, rng));
  }

  const totalRounds = playerCount === 3 ? 13 : 17;
  const stackASize = playerCount === 3 ? 18 : 26;
  const stackBSize = 8;

  // Kartensatz 2 mischen und aufteilen
  const set2 = shuffle(createDeck('s2'), rng);
  const stackA = set2.slice(0, stackASize);
  const stackB = set2.slice(stackASize, stackASize + stackBSize);

  // Der Kartengeber der ersten Runde wird zufällig bestimmt (danach wandert die
  // Rolle im Uhrzeigersinn weiter). Die Ziehung erfolgt bewusst NACH dem Mischen,
  // damit der Zufallsstrom für Hände und Stapel unverändert bleibt.
  const dealerIndex = Math.floor(rng() * players.length);

  return {
    players,
    round: 0, // wird auf 1 gesetzt, sobald die erste Runde startet
    totalRounds,
    phase: 'tieCardSelection',
    dealerIndex,
    marketCards: [],
    stackA,
    stackB,
    currentBids: {},
    bettingWindowOpen: false,
    bettingOffered: false,
    awaitingPlacementBy: null,
    cardToPlace: null,
    history: [],
    finalScores: null,
  };
}

/**
 * Nach welcher Runde der Stapelwechsel (zweite Spielphase) stattfindet.
 * 3 Spieler: nach Runde 9; 4 Spieler: nach Runde 13.
 */
export function stackSwitchRound(totalRounds: number): number {
  return totalRounds === 13 ? 9 : 13;
}

/**
 * Letzte Runde, in der ein Leergebot möglich ist.
 * 3 Spieler: Runde 13; 4 Spieler: Runde 14.
 * (Begrenzt durch höchste Rundenkarte A=14, und Verfügbarkeit von Stapel A.)
 */
export function lastEmptyBidRound(totalRounds: number): number {
  return totalRounds === 13 ? 13 : 14;
}
