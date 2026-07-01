/**
 * Tests für die strategische KI (Gebote + Platzierung).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideBid, decidePlacement } from '../src/engine/ai';
import { getAIProfile } from '../src/engine/setup';
import type { Card, Suit, Rank, PlayerState, GameState } from '../../shared/types';

const card = (suit: Suit, rank: Rank, tag = 'm'): Card => ({ suit, rank, id: `${suit}-${rank}-${tag}` });

/** Voller Handsatz 2..14 (eine Karte je Rang), wie zu Spielbeginn. */
function fullHand(): Card[] {
  const ranks: Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  return ranks.map((r) => ({ suit: 'hearts' as Suit, rank: r, id: `hand-${r}` }));
}

function makeAi(deck: (Card | null)[], hand: Card[]): PlayerState {
  return {
    id: 'ai', name: 'KI', isHuman: false, hand, tieCard: null, tieCardRevealed: false,
    deck, singles: [], discard: [], doubleBidsUsed: 0, emptyBidsUsed: 0,
    drawnCards: 0, hasBet: false, scoringMode: null, aiProfile: getAIProfile('medium'),
  };
}

function makeState(ai: PlayerState, marketCards: Card[], round = 5): GameState {
  return {
    players: [ai, makeAi([null, null, null, null], fullHand()), makeAi([null, null, null, null], fullHand())],
    round, totalRounds: 13, phase: 'bidding', dealerIndex: 0,
    marketCards, stackA: [], stackB: [], currentBids: {},
    bettingWindowOpen: false, bettingOffered: false,
    awaitingPlacementBy: null, cardToPlace: null, history: [], finalScores: null,
  };
}

function bidValueOf(decision: { type: string; cardIds: string[] }, hand: Card[]): number {
  const cards = decision.cardIds.map((id) => hand.find((c) => c.id === id)!);
  if (decision.type === 'empty') return 0;
  if (decision.type === 'double') return cards.reduce((s, c) => s + c.rank, 0);
  const real = cards.find((c) => c.rank !== 2);
  return real ? real.rank : 2;
}

test('decidePlacement wählt die wertvollere Marktkarte', () => {
  const ai = makeAi([null, null, null, null], fullHand());
  const state = makeState(ai, [card('clubs', 14), card('diamonds', 3)]);
  const decision = decidePlacement(state, ai);
  assert.equal(decision.cardId, 'clubs-14-m');
  assert.equal(decision.asDeck, true);
  assert.ok(decision.position! >= 0 && decision.position! <= 3);
});

test('decidePlacement legt bei vollem Deck als Einzelkarte ab', () => {
  const deck = [card('clubs', 5, 'd'), card('spades', 11, 'd'), card('clubs', 9, 'd'), card('hearts', 13, 'd')];
  const ai = makeAi(deck, fullHand());
  const state = makeState(ai, [card('clubs', 14)]);
  const decision = decidePlacement(state, ai);
  assert.equal(decision.asDeck, false);
  assert.equal(decision.cardId, 'clubs-14-m');
});

test('decideBid liefert ein regelkonformes Gebot', () => {
  const ai = makeAi([null, null, null, null], fullHand());
  const state = makeState(ai, [card('clubs', 14), card('spades', 12)]);
  const decision = decideBid(state, ai, () => 0.5);

  const cards = decision.cardIds.map((id) => ai.hand.find((c) => c.id === id));
  assert.ok(cards.every((c) => c !== undefined), 'alle Karten stammen aus der Hand');
  const ranks = cards.map((c) => c!.rank);
  if (decision.type === 'single') {
    assert.equal(ranks.filter((r) => r === 2).length, 1);
    assert.equal(ranks.filter((r) => r !== 2).length, 1);
  } else if (decision.type === 'double') {
    assert.equal(ranks.filter((r) => r === 2).length, 0);
    assert.equal(ranks.length, 2);
  }
});

test('decideBid bietet für wertvolle Karten mindestens so hoch wie für mittelmäßige', () => {
  const premiumAi = makeAi([null, null, null, null], fullHand());
  const premium = makeState(premiumAi, [card('clubs', 14), card('clubs', 13)]);
  const premiumBid = bidValueOf(decideBid(premium, premiumAi, () => 0.5), premiumAi.hand);

  const weakAi = makeAi([null, null, null, null], fullHand());
  const weak = makeState(weakAi, [card('spades', 8), card('hearts', 7)]);
  const weakBid = bidValueOf(decideBid(weak, weakAi, () => 0.5), weakAi.hand);

  assert.ok(premiumBid >= weakBid, `premium(${premiumBid}) >= weak(${weakBid})`);
  assert.ok(premiumBid > 0, 'für wertvolle Karten wird ernsthaft geboten');
});
