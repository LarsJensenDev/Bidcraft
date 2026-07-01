/**
 * Tests für die Wertungslogik – validiert gegen die Beispiele der Spielanleitung.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreDeck, scoreSingles, computeFinalScores, bestScoringMode,
  highRankValue, lowRankValue,
} from '../src/engine/scoring';
import type { Card, Suit, Rank, PlayerState } from '../../shared/types';

const card = (suit: Suit, rank: Rank): Card => ({ suit, rank, id: `${suit}-${rank}` });

test('High Mode – Anleitungsbeispiel ergibt 171', () => {
  // Reihe 1: ♣5 / ♠B(11)   Reihe 2: ♣9 / ♥K(13)
  const deck = [card('clubs', 5), card('spades', 11), card('clubs', 9), card('hearts', 13)];
  assert.equal(scoreDeck(deck, 'high'), 171);
});

test('Low Mode – Anleitungsbeispiel ergibt 148', () => {
  // Reihe 1: ♦7 / ♥5   Reihe 2: ♦4 / ♣8
  const deck = [card('diamonds', 7), card('hearts', 5), card('diamonds', 4), card('clubs', 8)];
  assert.equal(scoreDeck(deck, 'low'), 148);
});

test('Spread Mode – Anleitungsbeispiel ergibt 190', () => {
  // Reihe 1: ♠3 / ♥A(14)   Reihe 2: ♥D(12) / ♦4
  const deck = [card('spades', 3), card('hearts', 14), card('hearts', 12), card('diamonds', 4)];
  assert.equal(scoreDeck(deck, 'spread'), 190);
});

test('Einzelkarten – Herz 6 ergibt 12', () => {
  assert.equal(scoreSingles([card('hearts', 6)]), 12);
});

test('Einzelkarten – mehrere summieren korrekt', () => {
  // Herz6 (12) + Pik10 (20) + Karo A (28) = 60
  assert.equal(scoreSingles([card('hearts', 6), card('spades', 10), card('diamonds', 14)]), 60);
});

test('Rangwert-Inversion: Low 2→14, 14→2', () => {
  assert.equal(lowRankValue(2), 14);
  assert.equal(lowRankValue(14), 2);
  assert.equal(highRankValue(11), 11);
});

test('Unvollständiges Deck (3 Karten) – ein Produkt entfällt', () => {
  // Nur tl, tr, bl gesetzt → Reihe2 (bl,br) und Spalte2 (tr,br) entfallen teilweise
  // tl=♣5, tr=♠B(11), bl=♣9, br=null
  // Reihe1: 4×11=44; Spalte1: 4×9=36; Reihe2 & Spalte2 entfallen (br fehlt)
  const deck = [card('clubs', 5), card('spades', 11), card('clubs', 9), null];
  assert.equal(scoreDeck(deck, 'high'), 44 + 36);
});

test('bestScoringMode wählt den höchsten Wert', () => {
  // Spread-lastiges Deck: große Differenzen
  const deck = [card('spades', 2), card('hearts', 14), card('hearts', 13), card('diamonds', 3)];
  const best = bestScoringMode(deck);
  // Spread: |2-14|*5 + |13-3|*5 + |2-13|*5 + |14-3|*5 = 60+50+55+55 = 220
  assert.equal(best.mode, 'spread');
  assert.equal(best.score, 220);
});

function makePlayer(id: string, deck: (Card | null)[], opts: Partial<PlayerState> = {}): PlayerState {
  return {
    id, name: id, isHuman: false, hand: [], tieCard: null, tieCardRevealed: false,
    deck, singles: [], discard: [], doubleBidsUsed: 0, emptyBidsUsed: 0,
    drawnCards: 0, hasBet: false, scoringMode: null, aiProfile: null,
    ...opts,
  };
}

test('Endwertung – Siegpunkte als Differenz zum schwächsten Spieler', () => {
  // A=220, B=202, C=186 (alle als Einzelkarten-Punkte simuliert über deck=leer + singles)
  // Wir setzen die Werte direkt über scoringMode + bekannte Decks.
  // Einfacher: leere Decks, Punkte über Singles steuern.
  // A: singles-Summe 220 → Karten mit rank-Summe 110 (×2)
  // Stattdessen testen wir die Differenzlogik mit kontrollierten rawScores.
  const a = makePlayer('A', [null, null, null, null], { singles: [card('clubs', 14)], scoringMode: 'high' });
  // singles: 14×2=28 → rawScore 28. Wir brauchen relative Differenzen, also reicht das Prinzip.
  const b = makePlayer('B', [null, null, null, null], { singles: [card('clubs', 7)], scoringMode: 'high' });
  const c = makePlayer('C', [null, null, null, null], { singles: [card('clubs', 2)], scoringMode: 'high' });
  // rawScores: A=28, B=14, C=4. minRaw=4 → VP: A=24, B=10, C=0
  const scores = computeFinalScores([a, b, c]);
  assert.equal(scores['A'].victoryPoints, 24);
  assert.equal(scores['B'].victoryPoints, 10);
  assert.equal(scores['C'].victoryPoints, 0);
});

test('Endwertung – gewonnene Wette verdoppelt Siegpunkte', () => {
  const a = makePlayer('A', [null, null, null, null], { singles: [card('clubs', 14)], scoringMode: 'high', hasBet: true });
  const b = makePlayer('B', [null, null, null, null], { singles: [card('clubs', 7)], scoringMode: 'high' });
  const c = makePlayer('C', [null, null, null, null], { singles: [card('clubs', 2)], scoringMode: 'high' });
  // A führt (VP 24), hat gewettet → finalPoints = 48
  const scores = computeFinalScores([a, b, c]);
  assert.equal(scores['A'].finalPoints, 48);
  assert.equal(scores['A'].betWon, true);
});

test('Endwertung – verlorene Wette zieht Siegerpunkte ab', () => {
  const a = makePlayer('A', [null, null, null, null], { singles: [card('clubs', 14)], scoringMode: 'high' });
  const b = makePlayer('B', [null, null, null, null], { singles: [card('clubs', 7)], scoringMode: 'high', hasBet: true });
  const c = makePlayer('C', [null, null, null, null], { singles: [card('clubs', 2)], scoringMode: 'high' });
  // Sieger A (VP 24). B hat gewettet aber verloren → finalPoints = 10 - 24 = -14
  const scores = computeFinalScores([a, b, c]);
  assert.equal(scores['B'].finalPoints, -14);
  assert.equal(scores['B'].betWon, false);
});

test('Nachziehstrafe – 2 Karten kosten 20 Punkte', () => {
  const a = makePlayer('A', [null, null, null, null], {
    singles: [card('clubs', 14)], scoringMode: 'high', drawnCards: 2,
  });
  const b = makePlayer('B', [null, null, null, null], { singles: [card('clubs', 7)], scoringMode: 'high' });
  // A rawScore = 28 - 20 = 8; B rawScore = 14. minRaw = 8 → VP: A=0, B=6
  const scores = computeFinalScores([a, b]);
  assert.equal(scores['A'].drawPenalty, 20);
  assert.equal(scores['A'].rawScore, 8);
});
