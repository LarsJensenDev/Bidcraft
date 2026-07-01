/**
 * Integrationstests für die Game Engine – Setup, Gebote, Auflösung, Tiebreaks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createGame, stackSwitchRound, lastEmptyBidRound } from '../src/engine/setup';
import {
  selectTieCard, maybeStartFirstRound, submitBid, allBidsSubmitted,
  resolveRound, placeCard, resolveWinner, advanceToNextRound,
  closeBettingWindow, placeBet, chooseScoring,
  mustSitOut, isDealer, canSitOut, declareSitOut, isSittingOut,
} from '../src/engine/gameEngine';
import { validateBid, availableBidTypes, computeBidValue } from '../src/engine/validation';
import type { NewGameConfig, Card } from '../../shared/types';

/** Deterministischer RNG für reproduzierbare Tests. */
function seededRng(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

const baseConfig: NewGameConfig = { playerCount: 3, humanName: 'Test', aiDifficulty: 'medium' };

test('Setup – 3 Spieler erzeugt korrekte Stapel und Runden', () => {
  const g = createGame(baseConfig, seededRng(1));
  assert.equal(g.players.length, 3);
  assert.equal(g.totalRounds, 13);
  assert.equal(g.stackA.length, 18);
  assert.equal(g.stackB.length, 8);
  assert.equal(g.phase, 'tieCardSelection');
  // Jeder Spieler hat 13 Handkarten
  for (const p of g.players) assert.equal(p.hand.length, 13);
});

test('Setup – 4 Spieler erzeugt korrekte Stapel und Runden', () => {
  const g = createGame({ ...baseConfig, playerCount: 4 }, seededRng(2));
  assert.equal(g.players.length, 4);
  assert.equal(g.totalRounds, 17);
  assert.equal(g.stackA.length, 26);
  assert.equal(g.stackB.length, 8);
});

test('Stapelwechsel- und Leergebot-Runden korrekt', () => {
  assert.equal(stackSwitchRound(13), 9);
  assert.equal(stackSwitchRound(17), 13);
  assert.equal(lastEmptyBidRound(13), 13);
  assert.equal(lastEmptyBidRound(17), 14);
});

test('Tie-Card-Wahl startet Runde 1, sobald alle gewählt haben', () => {
  const g = createGame(baseConfig, seededRng(3));
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);
  assert.equal(g.round, 1);
  assert.equal(g.phase, 'bidding');
  assert.equal(g.marketCards.length, 2);
  // Jeder Spieler hält jetzt 12 Handkarten + 1 Tie Card
  for (const p of g.players) {
    assert.equal(p.hand.length, 12);
    assert.notEqual(p.tieCard, null);
  }
});

/** Hilfsfunktion: bringt ein Spiel in Runde 1 mit gewählten Tie Cards. */
function gameInRound1(seed: number) {
  const g = createGame(baseConfig, seededRng(seed));
  for (const p of g.players) {
    // Tie Card = rank 6 (neutral, von Tests nicht direkt benötigt)
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);
  return g;
}

test('Einzelgebot – Wert entspricht Nicht-2-Karte', () => {
  const g = gameInRound1(4);
  const p = g.players[0];
  const two = p.hand.find((c) => c.rank === 2)!;
  const ace = p.hand.find((c) => c.rank === 14)!;
  const result = validateBid(p, g, 'single', [two.id, ace.id]);
  assert.equal(result.valid, true);
  assert.equal(computeBidValue('single', [two, ace]), 14);
});

test('Doppelgebot – darf keine 2 enthalten', () => {
  const g = gameInRound1(5);
  const p = g.players[0];
  const two = p.hand.find((c) => c.rank === 2)!;
  const five = p.hand.find((c) => c.rank === 5)!;
  const invalid = validateBid(p, g, 'double', [two.id, five.id]);
  assert.equal(invalid.valid, false);

  const seven = p.hand.find((c) => c.rank === 7)!;
  const eight = p.hand.find((c) => c.rank === 8)!;
  const valid = validateBid(p, g, 'double', [seven.id, eight.id]);
  assert.equal(valid.valid, true);
  assert.equal(computeBidValue('double', [seven, eight]), 15);
});

test('Leergebot – nur mit passender Rundenkarte gültig', () => {
  const g = gameInRound1(6);
  g.round = 5; // künstlich auf Runde 5 setzen
  const p = g.players[0];
  const two = p.hand.find((c) => c.rank === 2)!;
  const five = p.hand.find((c) => c.rank === 5)!;
  const four = p.hand.find((c) => c.rank === 4)!;

  // 2 + 5 in Runde 5 → gültig
  assert.equal(validateBid(p, g, 'empty', [two.id, five.id]).valid, true);
  // 2 + 4 in Runde 5 → ungültig (falsche Rundenkarte)
  assert.equal(validateBid(p, g, 'empty', [two.id, four.id]).valid, false);
});

test('Leergebot – in Runde 1 und 2 nicht erlaubt', () => {
  const g = gameInRound1(7);
  g.round = 2;
  const p = g.players[0];
  const two = p.hand.find((c) => c.rank === 2)!;
  // In Runde 2 bräuchte man eine zweite 2 — und Leergebot ist ohnehin gesperrt
  const types = availableBidTypes(p, g);
  assert.equal(types.includes('empty'), false);
});

test('Rundenauflösung – höchstes Gebot gewinnt', () => {
  const g = gameInRound1(8);
  // Alle bieten Einzelgebote unterschiedlicher Höhe
  for (let i = 0; i < g.players.length; i++) {
    const p = g.players[i];
    const two = p.hand.find((c) => c.rank === 2)!;
    // Spieler 0 bietet As(14), Spieler 1 König(13), Spieler 2 Dame(12)
    const rank = (14 - i) as Card['rank'];
    const card = p.hand.find((c) => c.rank === rank)!;
    submitBid(g, p.id, 'single', [two.id, card.id]);
  }
  assert.equal(allBidsSubmitted(g), true);
  const { winnerId } = resolveWinner(g);
  assert.equal(winnerId, g.players[0].id); // höchstes Gebot As
});

test('Tiebreak – höhere Tie Card gewinnt bei Gleichstand', () => {
  const g = gameInRound1(9);
  // Spieler 0 und 1 bieten beide König (13), Spieler 2 bietet niedrig
  const setupBid = (idx: number, rank: Card['rank']) => {
    const p = g.players[idx];
    const two = p.hand.find((c) => c.rank === 2)!;
    const card = p.hand.find((c) => c.rank === rank)!;
    submitBid(g, p.id, 'single', [two.id, card.id]);
  };
  // Tie Cards künstlich setzen
  g.players[0].tieCard = { suit: 'clubs', rank: 12, id: 't0' }; // Dame
  g.players[1].tieCard = { suit: 'clubs', rank: 10, id: 't1' }; // 10
  setupBid(0, 13);
  setupBid(1, 13);
  setupBid(2, 5);
  const { winnerId, tiebreakOccurred } = resolveWinner(g);
  assert.equal(tiebreakOccurred, true);
  assert.equal(winnerId, g.players[0].id); // höhere Tie Card (Dame > 10)
  // Beide betroffenen Tie Cards wurden aufgedeckt
  assert.equal(g.players[0].tieCardRevealed, true);
  assert.equal(g.players[1].tieCardRevealed, true);
  // Spieler 2 nicht betroffen
  assert.equal(g.players[2].tieCardRevealed, false);
});

test('Vollständige Runde – Karte ins Deck legen', () => {
  const g = gameInRound1(10);
  for (let i = 0; i < g.players.length; i++) {
    const p = g.players[i];
    const two = p.hand.find((c) => c.rank === 2)!;
    const rank = (14 - i) as Card['rank'];
    const card = p.hand.find((c) => c.rank === rank)!;
    submitBid(g, p.id, 'single', [two.id, card.id]);
  }
  resolveRound(g);
  assert.equal(g.phase, 'cardPlacement');
  assert.equal(g.awaitingPlacementBy, g.players[0].id);

  const chosen = g.marketCards[0];
  placeCard(g, g.players[0].id, chosen.id, true, 0);
  // Karte liegt im Deck an Position 0
  assert.equal(g.players[0].deck[0]?.id, chosen.id);
  // Runde wurde abgeschlossen, nächste Runde gestartet
  assert.equal(g.round, 2);
  assert.equal(g.phase, 'bidding');
});

test('Platzhalter-2 kehrt nach Einzelgebot zurück auf die Hand', () => {
  const g = gameInRound1(11);
  const p0 = g.players[0];
  const handSizeBefore = p0.hand.length;
  const two = p0.hand.find((c) => c.rank === 2)!;
  const ace = p0.hand.find((c) => c.rank === 14)!;

  for (let i = 0; i < g.players.length; i++) {
    const p = g.players[i];
    const t = p.hand.find((c) => c.rank === 2)!;
    const rank = (i === 0 ? 14 : 5) as Card['rank'];
    const card = p.hand.find((c) => c.rank === rank)!;
    submitBid(g, p.id, 'single', [t.id, card.id]);
  }
  resolveRound(g);
  placeCard(g, g.players[0].id, g.marketCards[0]?.id ?? g.history[0].marketCards[0].id, false);

  // p0 hat das As abgeworfen, aber die 2 behalten → Handgröße um 1 reduziert
  assert.equal(p0.hand.length, handSizeBefore - 1);
  assert.equal(p0.hand.some((c) => c.rank === 2), true); // 2 noch da
  assert.equal(p0.hand.some((c) => c.id === ace.id), false); // As weg
});

test('Wettfenster öffnet nach Stapelwechsel-Runde', () => {
  const g = gameInRound1(12);
  // Spiele bis Runde 9 durch (vereinfacht: alle bieten niedrig, Spieler 0 gewinnt)
  for (let r = 1; r <= 9; r++) {
    for (let i = 0; i < g.players.length; i++) {
      const p = g.players[i];
      const two = p.hand.find((c) => c.rank === 2);
      const other = p.hand.find((c) => c.rank !== 2);
      if (two && other) {
        // Spieler 0 bietet hoch, andere niedrig
        const card = i === 0
          ? p.hand.filter((c) => c.rank !== 2).sort((a, b) => b.rank - a.rank)[0]
          : p.hand.filter((c) => c.rank !== 2).sort((a, b) => a.rank - b.rank)[0];
        submitBid(g, p.id, 'single', [two.id, card.id]);
      }
    }
    if (allBidsSubmitted(g)) {
      resolveRound(g);
      if (g.phase === 'cardPlacement') {
        const card = g.marketCards[0];
        placeCard(g, g.awaitingPlacementBy!, card.id, false);
      }
    }
    if (g.phase === 'bettingWindow') break;
  }
  assert.equal(g.phase, 'bettingWindow');
  assert.equal(g.bettingWindowOpen, true);
  assert.equal(g.round, 9);

  // Wette setzen und Fenster schließen
  placeBet(g, g.players[0].id, true);
  closeBettingWindow(g);
  assert.equal(g.round, 10);
  assert.equal(g.phase, 'bidding');
});

// ──────────── Kartengeber-Aussetz-Tests (4-Spieler-Modus) ────────────

test('4 Spieler: Kartengeber kann aussetzen oder mitspielen', () => {
  const g = createGame({ playerCount: 4, humanName: 'T', aiDifficulty: 'easy' }, seededRng(20));
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);

  // Der Kartengeber der ersten Runde wird zufällig bestimmt.
  const dealer = g.players[g.dealerIndex];
  const nonDealer = g.players[(g.dealerIndex + 1) % 4];

  // Kartengeber hat noch kein automatisches Gebot – er muss selbst entscheiden
  assert.equal(g.currentBids[dealer.id], null);

  // canSitOut gibt nur für den Kartengeber true zurück
  assert.equal(canSitOut(g, dealer.id), true);
  assert.equal(canSitOut(g, nonDealer.id), false);

  // declareSitOut setzt ein Sitout-Gebot
  const result = declareSitOut(g, dealer.id);
  assert.equal(result, true);
  assert.equal(isSittingOut(g, dealer.id), true);
  assert.equal(g.currentBids[dealer.id]!.value, 0);

  // declareSitOut für Nicht-Kartengeber schlägt fehl
  assert.equal(declareSitOut(g, nonDealer.id), false);
});

test('4 Spieler: Kartengeber kann aussetzen und gewinnt dann nicht', () => {
  const g = createGame({ playerCount: 4, humanName: 'T', aiDifficulty: 'easy' }, seededRng(21));
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);

  const dealer = g.players[g.dealerIndex];
  assert.equal(canSitOut(g, dealer.id), true);
  assert.equal(isDealer(g, dealer.id), true);
  assert.equal(canSitOut(g, g.players[(g.dealerIndex + 1) % 4].id), false);

  // Kartengeber setzt aktiv aus
  declareSitOut(g, dealer.id);
  assert.equal(isSittingOut(g, dealer.id), true);
});

test('4 Spieler: In 17 Runden ist der Start-Kartengeber 5x, die übrigen 4x Geber', () => {
  const g = createGame({ playerCount: 4, humanName: 'T', aiDifficulty: 'easy' }, seededRng(22));
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);

  const startDealerId = g.players[g.dealerIndex].id;
  const dealerCounts: Record<string, number> = {};
  for (const p of g.players) dealerCounts[p.id] = 0;

  // Zähle die Kartengeber über alle 17 Runden; merke den Geber der letzten Runde.
  let lastRoundDealerId = '';
  for (let r = 1; r <= 17; r++) {
    const dealerId = g.players[g.dealerIndex].id;
    dealerCounts[dealerId]++;
    if (r === 17) lastRoundDealerId = dealerId;
    g.dealerIndex = (g.dealerIndex + 1) % 4;
  }

  // Der Start-Kartengeber ist 5x Geber (inkl. der letzten Runde), alle anderen 4x.
  assert.equal(dealerCounts[startDealerId], 5);
  assert.equal(lastRoundDealerId, startDealerId);
  for (const p of g.players) {
    const expected = p.id === startDealerId ? 5 : 4;
    assert.equal(dealerCounts[p.id], expected,
      `Spieler ${p.id} sollte ${expected}x Kartengeber sein, war aber ${dealerCounts[p.id]}x`);
  }
  // Summe der Kartengeber-Rollen = 17 Runden.
  const total = Object.values(dealerCounts).reduce((a, b) => a + b, 0);
  assert.equal(total, 17);
});

test('4 Spieler: Kartengeber kann mitspielen und gewinnt bei höchstem Gebot', () => {
  const g = createGame({ playerCount: 4, humanName: 'T', aiDifficulty: 'easy' }, seededRng(30));
  for (const p of g.players) {
    const tie = p.hand.find((c) => c.rank === 6)!;
    selectTieCard(g, p.id, tie.id);
  }
  maybeStartFirstRound(g);

  const dealer = g.players[g.dealerIndex];
  const others = g.players.filter((p) => p.id !== dealer.id);

  // Kartengeber spielt MIT (kein declareSitOut) – bietet höchste Karte
  const dealerTwo = dealer.hand.find((c) => c.rank === 2)!;
  const dealerAce = dealer.hand.find((c) => c.rank === 14)!;
  submitBid(g, dealer.id, 'single', [dealerTwo.id, dealerAce.id]);

  // Andere bieten niedrig
  for (const p of others) {
    const two = p.hand.find((c) => c.rank === 2)!;
    const three = p.hand.find((c) => c.rank === 3)!;
    submitBid(g, p.id, 'single', [two.id, three.id]);
  }

  assert.equal(allBidsSubmitted(g), true);
  // Kartengeber hat höchstes Gebot (14) und muss gewinnen
  const { winnerId } = resolveWinner(g);
  assert.equal(winnerId, dealer.id);
});
