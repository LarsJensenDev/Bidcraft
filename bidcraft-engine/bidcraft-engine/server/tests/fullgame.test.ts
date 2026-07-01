/**
 * Smoke-Test: Spielt eine vollständige Partie automatisiert durch
 * und prüft, dass am Ende valide Endergebnisse vorliegen.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/engine/setup';
import {
  selectTieCard, maybeStartFirstRound, submitBid, allBidsSubmitted,
  resolveRound, placeCard, placeBet, closeBettingWindow, chooseScoring,
  getForcedBid, submitForcedBidIfAny,
  canSitOut, declareSitOut,
} from '../src/engine/gameEngine';
import { availableBidTypes, buildBid } from '../src/engine/validation';
import type { GameState, PlayerState, NewGameConfig, ScoringMode } from '../../shared/types';

function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

/** Wählt für einen Spieler ein simples gültiges Gebot (greedy: niedrigste Karte). */
function autoBid(g: GameState, p: PlayerState): void {
  // Im Smoke-Test setzt der Kartengeber immer aus (Normalfall laut Regel).
  if (canSitOut(g, p.id)) {
    declareSitOut(g, p.id);
    return;
  }

  // Erzwungene Endspiel-Gebote (vorletzte 2 / letzte Tie Card) zuerst.
  if (submitForcedBidIfAny(g, p.id)) return;

  const types = availableBidTypes(p, g);
  const two = p.hand.find((c) => c.rank === 2);
  const nonTwos = p.hand.filter((c) => c.rank !== 2).sort((a, b) => a.rank - b.rank);

  // Bevorzugt Einzelgebot mit niedrigster Karte (Ressourcenschonung)
  if (types.includes('single') && two && nonTwos.length > 0) {
    submitBid(g, p.id, 'single', [two.id, nonTwos[0].id]);
    return;
  }
  // Sonst Doppelgebot mit den zwei niedrigsten
  if (types.includes('double') && nonTwos.length >= 2) {
    submitBid(g, p.id, 'double', [nonTwos[0].id, nonTwos[1].id]);
    return;
  }
  // Notfall: irgendzwei Karten (vorletzte Runde etc.)
  const cards = p.hand.slice(0, 2);
  if (cards.length === 2) {
    // Als single behandeln, wenn eine 2 dabei ist
    submitBid(g, p.id, 'single', [cards[0].id, cards[1].id]);
  }
}

function playFullGame(playerCount: 3 | 4, seed: number): GameState {
  const config: NewGameConfig = { playerCount, humanName: 'Test', aiDifficulty: 'easy' };
  const g = createGame(config, seededRng(seed));

  // Tie Cards wählen (rank 6, neutral)
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6) ?? p.hand[0];
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);

  let safety = 0;
  while (g.phase !== 'finished' && safety < 500) {
    safety++;

    if (g.phase === 'bidding') {
      for (const p of g.players) {
        if (g.currentBids[p.id] === null) autoBid(g, p);
      }
      if (allBidsSubmitted(g)) {
        resolveRound(g);
      }
    } else if (g.phase === 'cardPlacement') {
      const pid = g.awaitingPlacementBy!;
      const card = g.marketCards[0];
      const player = g.players.find((pp) => pp.id === pid)!;
      // Lege ins Deck, wenn noch Platz, sonst als Einzelkarte
      const freePos = player.deck.findIndex((slot) => slot === null);
      if (freePos !== -1) {
        placeCard(g, pid, card.id, true, freePos);
      } else {
        placeCard(g, pid, card.id, false);
      }
    } else if (g.phase === 'bettingWindow') {
      // Niemand wettet im Smoke-Test
      closeBettingWindow(g);
    } else if (g.phase === 'scoring') {
      const modes: ScoringMode[] = ['high', 'low', 'spread'];
      for (const p of g.players) {
        if (p.scoringMode === null) {
          // Wähle den besten Modus automatisch
          chooseScoring(g, p.id, modes[0]);
        }
      }
    }
  }

  assert.ok(safety < 500, 'Spiel sollte ohne Endlosschleife terminieren');
  return g;
}

test('Vollständige 3-Spieler-Partie terminiert mit Endwertung', () => {
  const g = playFullGame(3, 42);
  assert.equal(g.phase, 'finished');
  assert.notEqual(g.finalScores, null);
  assert.equal(g.round, 13);
  // Jeder Spieler hat ein Endergebnis
  for (const p of g.players) {
    assert.ok(g.finalScores![p.id] !== undefined);
  }
  // Genau ein Spieler hat 0 Siegpunkte (der schwächste)
  const vps = g.players.map((p) => g.finalScores![p.id].victoryPoints);
  assert.equal(Math.min(...vps), 0);
});

test('Vollständige 4-Spieler-Partie terminiert mit Endwertung', () => {
  const g = playFullGame(4, 7);
  assert.equal(g.phase, 'finished');
  assert.notEqual(g.finalScores, null);
  assert.equal(g.round, 17);
  for (const p of g.players) {
    assert.ok(g.finalScores![p.id] !== undefined);
  }
});

test('Mehrere Seeds – Partien terminieren stabil', () => {
  for (const seed of [1, 2, 3, 100, 999]) {
    const g3 = playFullGame(3, seed);
    assert.equal(g3.phase, 'finished');
    const g4 = playFullGame(4, seed);
    assert.equal(g4.phase, 'finished');
  }
});

test('Deck enthält nie mehr als 4 Karten', () => {
  const g = playFullGame(4, 55);
  for (const p of g.players) {
    const filled = p.deck.filter((c) => c !== null).length;
    assert.ok(filled <= 4, `Deck von ${p.id} hat ${filled} Karten`);
  }
});
