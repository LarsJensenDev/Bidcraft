/**
 * Bidcraft – Wertungslogik
 *
 * Deck-Raster Positionen:
 *   0 = oben-links    1 = oben-rechts
 *   2 = unten-links   3 = unten-rechts
 *
 * High Mode:
 *   Pro Reihe:  Farbwert(links) × Zahlenwert(rechts)
 *   Pro Spalte: Farbwert(oben)  × Zahlenwert(unten)
 * Low Mode: wie High, aber Farb- und Zahlenwerte invertiert.
 * Spread Mode: |Zahldiff| × 5 pro Reihe und Spalte.
 */

import type { Card, Suit, Rank, ScoringMode, PlayerState, FinalScore } from '../../../shared/types';

/** Farbwert im High Mode */
export const HIGH_SUIT_VALUE: Record<Suit, number> = {
  diamonds: 1, // Karo
  hearts: 2,   // Herz
  spades: 3,   // Pik
  clubs: 4,    // Kreuz
};

/** Farbwert im Low Mode (invertiert) */
export const LOW_SUIT_VALUE: Record<Suit, number> = {
  diamonds: 4,
  hearts: 3,
  spades: 2,
  clubs: 1,
};

/** Multiplikator pro Reihe/Spalte im Spread Mode. */
export const SPREAD_FACTOR = 5;

/** Zahlenwert High = rank selbst (2..14) */
export function highRankValue(rank: Rank): number {
  return rank;
}

/** Zahlenwert Low = invertiert: 2→14, 3→13, ..., 14→2. Formel: 16 - rank */
export function lowRankValue(rank: Rank): number {
  return 16 - rank;
}

function suitValue(suit: Suit, mode: ScoringMode): number {
  if (mode === 'low') return LOW_SUIT_VALUE[suit];
  return HIGH_SUIT_VALUE[suit]; // high (spread nutzt keine Farbwerte)
}

function rankValue(rank: Rank, mode: ScoringMode): number {
  return mode === 'low' ? lowRankValue(rank) : highRankValue(rank);
}

/**
 * Bewertet ein Deck (2x2-Raster mit bis zu 4 Karten) in einem gegebenen Modus.
 * Fehlende Positionen (null) führen dazu, dass die betroffenen Reihen-/Spaltenprodukte entfallen.
 */
export function scoreDeck(deck: (Card | null)[], mode: ScoringMode): number {
  const tl = deck[0]; // oben-links
  const tr = deck[1]; // oben-rechts
  const bl = deck[2]; // unten-links
  const br = deck[3]; // unten-rechts

  if (mode === 'spread') {
    return scoreSpread(tl, tr, bl, br);
  }
  return scoreHighLow(tl, tr, bl, br, mode);
}

function scoreHighLow(
  tl: Card | null, tr: Card | null,
  bl: Card | null, br: Card | null,
  mode: ScoringMode,
): number {
  let total = 0;

  // Reihen: Farbwert(links) × Zahlenwert(rechts)
  // Reihe 1: tl (links), tr (rechts)
  if (tl && tr) {
    total += suitValue(tl.suit, mode) * rankValue(tr.rank, mode);
  }
  // Reihe 2: bl (links), br (rechts)
  if (bl && br) {
    total += suitValue(bl.suit, mode) * rankValue(br.rank, mode);
  }

  // Spalten: Farbwert(oben) × Zahlenwert(unten)
  // Spalte 1: tl (oben), bl (unten)
  if (tl && bl) {
    total += suitValue(tl.suit, mode) * rankValue(bl.rank, mode);
  }
  // Spalte 2: tr (oben), br (unten)
  if (tr && br) {
    total += suitValue(tr.suit, mode) * rankValue(br.rank, mode);
  }

  return total;
}

function scoreSpread(
  tl: Card | null, tr: Card | null,
  bl: Card | null, br: Card | null,
): number {
  let total = 0;

  // Reihen: |Zahldiff| × 5
  if (tl && tr) total += Math.abs(tl.rank - tr.rank) * SPREAD_FACTOR;
  if (bl && br) total += Math.abs(bl.rank - br.rank) * SPREAD_FACTOR;
  // Spalten: |Zahldiff| × 5
  if (tl && bl) total += Math.abs(tl.rank - bl.rank) * SPREAD_FACTOR;
  if (tr && br) total += Math.abs(tr.rank - br.rank) * SPREAD_FACTOR;

  return total;
}

/** Wertung der Einzelkarten: doppelter Zahlenwert je Karte (modusunabhängig). */
export function scoreSingles(singles: Card[]): number {
  return singles.reduce((sum, c) => sum + c.rank * 2, 0);
}

/**
 * Bestimmt den besten Wertungsmodus für ein Deck und gibt Modus + Punktzahl zurück.
 * Nützlich für KI und für eine "Auto"-Empfehlung.
 */
export function bestScoringMode(deck: (Card | null)[]): { mode: ScoringMode; score: number } {
  const modes: ScoringMode[] = ['high', 'low', 'spread'];
  let best: { mode: ScoringMode; score: number } = { mode: 'high', score: -Infinity };
  for (const mode of modes) {
    const score = scoreDeck(deck, mode);
    if (score > best.score) best = { mode, score };
  }
  return best;
}

/**
 * Berechnet die vollständige Endwertung für alle Spieler.
 * - Jeder Spieler nutzt seinen gewählten scoringMode (oder den besten, falls null).
 * - drawPenalty = drawnCards × 10.
 * - victoryPoints = rawScore - schwächster rawScore.
 * - Wette: gewonnen → victoryPoints × 2; verloren → victoryPoints - victoryPoints(Sieger).
 */
export function computeFinalScores(players: PlayerState[]): Record<string, FinalScore> {
  // 1. Rohpunktzahlen
  const partial: Record<string, FinalScore> = {};
  for (const p of players) {
    const mode = p.scoringMode ?? bestScoringMode(p.deck).mode;
    const deckScore = scoreDeck(p.deck, mode);
    const singlesScore = scoreSingles(p.singles);
    const drawPenalty = p.drawnCards * 10;
    const rawScore = deckScore + singlesScore - drawPenalty;
    partial[p.id] = {
      playerId: p.id,
      deckScore,
      singlesScore,
      drawPenalty,
      rawScore,
      victoryPoints: 0,
      finalPoints: 0,
      betWon: null,
    };
  }

  // 2. Siegpunkte = rawScore - schwächste rawScore
  const minRaw = Math.min(...players.map((p) => partial[p.id].rawScore));
  for (const p of players) {
    partial[p.id].victoryPoints = partial[p.id].rawScore - minRaw;
  }

  // 3. Sieger ermitteln (höchste Siegpunkte)
  let winnerId = players[0].id;
  for (const p of players) {
    if (partial[p.id].victoryPoints > partial[winnerId].victoryPoints) {
      winnerId = p.id;
    }
  }
  const winnerVP = partial[winnerId].victoryPoints;

  // 4. Wette auflösen
  for (const p of players) {
    const sc = partial[p.id];
    if (!p.hasBet) {
      sc.finalPoints = sc.victoryPoints;
      sc.betWon = null;
    } else if (p.id === winnerId) {
      // Wette gewonnen → verdoppeln
      sc.finalPoints = sc.victoryPoints * 2;
      sc.betWon = true;
    } else {
      // Wette verloren → Punkte des Siegers abziehen
      sc.finalPoints = sc.victoryPoints - winnerVP;
      sc.betWon = false;
    }
  }

  return partial;
}
