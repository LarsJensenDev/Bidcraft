/**
 * Bidcraft – Geteilte Typdefinitionen
 * Werden von Server und Client gemeinsam genutzt.
 */

export type Suit = 'diamonds' | 'hearts' | 'spades' | 'clubs';

/** Rang: 2–10 normal, 11=Bube, 12=Dame, 13=König, 14=As */
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14;

export interface Card {
  suit: Suit;
  rank: Rank;
  /** Eindeutige ID zur Identifikation, z.B. "clubs-14-s2-3" */
  id: string;
}

export type BidType = 'single' | 'double' | 'empty';

export interface Bid {
  type: BidType;
  /** Die zwei ausgespielten Karten (verdeckt bis zur Aufdeckung) */
  cards: Card[];
  /** Berechneter Gebotswert: single = rank von X, double = X+Y, empty = 0 */
  value: number;
}

export type ScoringMode = 'high' | 'low' | 'spread';

/** Position im 2x2-Raster: 0=oben-links, 1=oben-rechts, 2=unten-links, 3=unten-rechts */
export type DeckPosition = 0 | 1 | 2 | 3;

export interface PlayerState {
  id: string;
  name: string;
  isHuman: boolean;
  /** Verbleibende Handkarten (ohne Tie Card) */
  hand: Card[];
  /** Verdeckt abgelegte Tie Card */
  tieCard: Card | null;
  /** Ob die Tie Card bereits öffentlich aufgedeckt wurde (nach einem Tiebreak) */
  tieCardRevealed: boolean;
  /** 2x2-Raster der ans Deck angelegten Karten (null = leere Position) */
  deck: (Card | null)[];
  /** Als Einzelkarten abgelegte Karten */
  singles: Card[];
  /** Eigener Abwurfstapel der Handkarten */
  discard: Card[];
  doubleBidsUsed: number;
  emptyBidsUsed: number;
  /** Anzahl der nachgezogenen Karten (für Strafpunkte) */
  drawnCards: number;
  /** Hat der Spieler auf den eigenen Sieg gewettet */
  hasBet: boolean;
  /** Gewählter Wertungsmodus (am Ende) */
  scoringMode: ScoringMode | null;
  /** Nur bei KI-Spielern gesetzt */
  aiProfile: AIProfile | null;
}

export type AIDifficulty = 'easy' | 'medium' | 'hard';

export interface AIProfile {
  difficulty: AIDifficulty;
  /** Wie viele Runden vorausgeplant wird */
  lookahead: number;
  /** Wahrscheinlichkeit, Bluff-Verschleierung einzusetzen */
  bluffProbability: number;
  /** 0–1: Wie streng die Kartenökonomie gemanagt wird */
  economyDiscipline: number;
  /** Rauschen auf Geboten (0 = deterministisch) */
  randomness: number;
}

export type GamePhase =
  | 'setup'
  | 'tieCardSelection'
  | 'bidding'
  | 'resolution'
  | 'cardPlacement'
  | 'bettingWindow'
  | 'scoring'
  | 'finished';

export interface RoundResult {
  round: number;
  /** Karten, die in dieser Runde ausgelegen haben */
  marketCards: Card[];
  /** Gebote aller Spieler (aufgedeckt) */
  bids: Record<string, Bid>;
  /** Gewinner-Spieler-ID (null bei reiner Leergebot-Runde ohne Gewinner) */
  winnerId: string | null;
  /** Ob ein Tiebreak nötig war */
  tiebreakOccurred: boolean;
  /** Welche Karte der Gewinner genommen hat */
  takenCard: Card | null;
}

export interface GameState {
  /** Spieler in Sitzreihenfolge */
  players: PlayerState[];
  /** Aktuelle Rundennummer (1-basiert) */
  round: number;
  /** Gesamtrundenzahl: 13 (3 Spieler) oder 17 (4 Spieler) */
  totalRounds: number;
  phase: GamePhase;
  /** Index des aktuellen Kartengebers */
  dealerIndex: number;
  /** Die zwei aktuell ausliegenden Marktkarten */
  marketCards: Card[];
  stackA: Card[];
  stackB: Card[];
  /** Gebote der aktuellen Runde, Spieler-ID → Bid */
  currentBids: Record<string, Bid | null>;
  /** Ob das Wettfenster (zweite Spielphase) aktiv ist */
  bettingWindowOpen: boolean;
  /** Ob die Wette in diesem Spiel bereits angeboten wurde */
  bettingOffered: boolean;
  /** Spieler-ID, der gerade eine ersteigerte Karte platzieren muss (oder null) */
  awaitingPlacementBy: string | null;
  /** Die zu platzierende Karte */
  cardToPlace: Card | null;
  /** Verlauf der abgeschlossenen Runden */
  history: RoundResult[];
  /** Endergebnisse (erst nach 'scoring' gesetzt) */
  finalScores: Record<string, FinalScore> | null;
}

export interface FinalScore {
  playerId: string;
  deckScore: number;
  singlesScore: number;
  drawPenalty: number;
  /** Rohpunktzahl = deckScore + singlesScore - drawPenalty */
  rawScore: number;
  /** Siegpunkte = rawScore - schwächste rawScore */
  victoryPoints: number;
  /** Endgültige Punkte nach Auflösung der Wette */
  finalPoints: number;
  betWon: boolean | null;
}

/** Konfiguration für ein neues Spiel */
export interface NewGameConfig {
  playerCount: 3 | 4;
  humanName: string;
  aiDifficulty: AIDifficulty;
}
