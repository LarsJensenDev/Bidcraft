/**
 * Bidcraft – Gebotsvalidierung und Gebotswertberechnung
 */

import type { Card, Bid, BidType, PlayerState, GameState } from '../../../shared/types';
import { lastEmptyBidRound } from './setup';

export interface BidValidationResult {
  valid: boolean;
  reason?: string;
}

/** Findet eine Karte mit gegebenem Rang in der Hand (erste Übereinstimmung). */
function findByRank(hand: Card[], rank: number): Card | undefined {
  return hand.find((c) => c.rank === rank);
}

/** Anzahl der Karten mit Rang 2 (Platzhalter) in der Hand. */
function countTwos(hand: Card[]): number {
  return hand.filter((c) => c.rank === 2).length;
}

/**
 * Berechnet den Gebotswert anhand der Gebotsart und Karten.
 * single: Zahlenwert der Nicht-2-Karte
 * double: Summe beider Kartenwerte
 * empty:  0
 */
export function computeBidValue(type: BidType, cards: Card[]): number {
  switch (type) {
    case 'single': {
      // Eine Karte ist die 2 (Platzhalter), die andere ist das echte Gebot.
      const real = cards.find((c) => c.rank !== 2);
      // Sonderfall letzte Runden: Wenn beide Karten 2 sind (vorletzte Runde),
      // oder die einzige Karte die 2 ist, zählt der Wert 2.
      if (!real) return 2;
      return real.rank;
    }
    case 'double':
      return cards.reduce((sum, c) => sum + c.rank, 0);
    case 'empty':
      return 0;
  }
}

/**
 * Validiert ein Gebot gegen die aktuellen Handkarten und die Spielregeln.
 *
 * @param player   Der bietende Spieler
 * @param state    Aktueller Spielzustand
 * @param type     Gebotsart
 * @param cardIds  IDs der zwei ausgespielten Karten
 */
export function validateBid(
  player: PlayerState,
  state: GameState,
  type: BidType,
  cardIds: string[],
): BidValidationResult {
  // Genau 2 Karten müssen ausgespielt werden
  if (cardIds.length !== 2) {
    return { valid: false, reason: 'Es müssen genau 2 Karten ausgespielt werden.' };
  }

  // Karten müssen in der Hand sein
  const cards: Card[] = [];
  for (const id of cardIds) {
    const card = player.hand.find((c) => c.id === id);
    if (!card) {
      return { valid: false, reason: `Karte ${id} ist nicht in der Hand.` };
    }
    cards.push(card);
  }

  // Doppelte Karten-ID verboten
  if (cardIds[0] === cardIds[1]) {
    return { valid: false, reason: 'Dieselbe Karte kann nicht zweimal gespielt werden.' };
  }

  const twos = cards.filter((c) => c.rank === 2);
  const nonTwos = cards.filter((c) => c.rank !== 2);

  switch (type) {
    case 'single': {
      // Einzelgebot: genau eine 2 (Platzhalter) + eine beliebige andere Karte.
      // Ausnahme vorletzte Runde: zwei 2en sind nur dann erlaubt, wenn der
      // Spieler keine andere Karte mehr hat (Sonderfall letzte Karten).
      if (twos.length === 1 && nonTwos.length === 1) {
        return { valid: true };
      }
      // Sonderfall: vorletzte Runde, beide Karten sind 2 (kann nur passieren,
      // wenn nur noch 2 + Tie Card übrig — Tie Card wird separat behandelt).
      if (twos.length === 2) {
        return { valid: true };
      }
      return {
        valid: false,
        reason: 'Einzelgebot erfordert die Platzhalter-2 plus eine weitere Karte.',
      };
    }

    case 'double': {
      // Doppelgebot: keine der beiden Karten darf die 2 sein.
      if (twos.length > 0) {
        return {
          valid: false,
          reason: 'Beim Doppelgebot darf keine Karte die Platzhalter-2 sein.',
        };
      }
      return { valid: true };
    }

    case 'empty': {
      // Leergebot: eine 2 + die Karte mit Augenwert = aktuelle Rundenzahl.
      if (twos.length !== 1) {
        return {
          valid: false,
          reason: 'Leergebot erfordert die Platzhalter-2.',
        };
      }
      const other = nonTwos[0];
      if (!other || other.rank !== state.round) {
        return {
          valid: false,
          reason: `Leergebot in Runde ${state.round} erfordert eine Karte mit Wert ${state.round}.`,
        };
      }
      // Rundenfenster: ab Runde 3 bis lastEmptyBidRound
      if (state.round < 3 || state.round > lastEmptyBidRound(state.totalRounds)) {
        return {
          valid: false,
          reason: `Leergebot ist in Runde ${state.round} nicht erlaubt.`,
        };
      }
      return { valid: true };
    }
  }
}

/**
 * Liefert alle gültigen Gebotsoptionen für einen Spieler in der aktuellen Runde.
 * Wird von der KI und für die UI-Hinweise genutzt.
 */
export function availableBidTypes(player: PlayerState, state: GameState): BidType[] {
  const types: BidType[] = [];
  const hasTwo = player.hand.some((c) => c.rank === 2);
  const nonTwos = player.hand.filter((c) => c.rank !== 2);

  // Einzelgebot: 2 + mind. eine andere Karte
  if (hasTwo && nonTwos.length >= 1) {
    types.push('single');
  }
  // Doppelgebot: mind. 2 Nicht-2-Karten
  if (nonTwos.length >= 2) {
    types.push('double');
  }
  // Leergebot: 2 + Rundenkarte vorhanden, im gültigen Rundenfenster
  if (
    hasTwo &&
    state.round >= 3 &&
    state.round <= lastEmptyBidRound(state.totalRounds) &&
    player.hand.some((c) => c.rank === state.round)
  ) {
    types.push('empty');
  }

  return types;
}

/** Hilfsfunktion: baut ein Bid-Objekt aus Typ und Karten-IDs. */
export function buildBid(player: PlayerState, type: BidType, cardIds: string[]): Bid {
  const cards = cardIds
    .map((id) => player.hand.find((c) => c.id === id))
    .filter((c): c is Card => c !== undefined);
  return {
    type,
    cards,
    value: computeBidValue(type, cards),
  };
}
