/**
 * Bidcraft – Game Engine
 * Steuert Rundenablauf, Gebotsauflösung, Tiebreaks und Phasenübergänge.
 */

import type {
  Card, Bid, BidType, PlayerState, GameState, RoundResult, ScoringMode,
} from '../../../shared/types';
import { buildBid, computeBidValue } from './validation';
import { stackSwitchRound } from './setup';
import { computeFinalScores } from './scoring';

/**
 * Gibt zurück, ob ein Spieler in der aktuellen Runde Kartengeber ist.
 * Im 4-Spieler-Modus setzt der Kartengeber in dieser Runde aus (bietet nicht mit).
 */
export function isDealer(state: GameState, playerId: string): boolean {
  return state.players[state.dealerIndex]?.id === playerId;
}

/**
 * Gibt zurück, ob ein Spieler in dieser Runde das Recht hat auszusetzen.
 * Im 4-Spieler-Modus steht dieses Recht nur dem Kartengeber zu – außer in der
 * letzten Runde: dort bietet auch der Kartengeber obligatorisch mit, damit den
 * 13 Handkarten je Spieler genau 13 obligatorische Bietrunden gegenüberstehen.
 */
export function canSitOut(state: GameState, playerId: string): boolean {
  return (
    state.players.length === 4 &&
    isDealer(state, playerId) &&
    state.round < state.totalRounds
  );
}

/**
 * Der Kartengeber erklärt, dass er in dieser Runde aussetzen möchte.
 * Setzt ein Sitout-Gebot (Wert 0) für ihn und schließt ihn von der Auflösung aus.
 * Gibt false zurück, wenn der Spieler kein Recht hat auszusetzen.
 */
export function declareSitOut(state: GameState, playerId: string): boolean {
  if (!canSitOut(state, playerId)) return false;
  state.currentBids[playerId] = { type: 'empty', cards: [], value: 0 };
  return true;
}

/**
 * Prüft, ob ein Spieler in dieser Runde als Sitout markiert ist.
 */
export function isSittingOut(state: GameState, playerId: string): boolean {
  const bid = state.currentBids[playerId];
  return bid !== null && bid.cards.length === 0 && bid.value === 0 && bid.type === 'empty';
}

/**
 * @deprecated Umbenannt zu canSitOut. Nur für Rückwärtskompatibilität.
 */
export function mustSitOut(state: GameState, playerId: string): boolean {
  return canSitOut(state, playerId);
}


/**
 * Ermittelt das erzwungene Endspiel-Gebot eines Spielers, falls zutreffend.
 *
 * Regel: Die vorletzte gespielte Karte ist immer die 2 (mit Augenwert 2),
 * die letzte Karte ist immer die Tie Card.
 *
 * - Hat der Spieler nur noch die 2 auf der Hand → erzwungenes Gebot mit der 2
 *   (Wert 2, die 2 wird diesmal abgeworfen, nicht zurückgenommen).
 * - Hat der Spieler keine Handkarten mehr, aber eine Tie Card → die Tie Card
 *   wird als letztes Gebot gespielt (regulärer Augenwert).
 *
 * Gibt null zurück, wenn kein erzwungenes Gebot vorliegt (normaler Spielverlauf).
 */
export function getForcedBid(player: PlayerState): {
  type: BidType;
  cards: Card[];
  value: number;
  isTieCardPlay: boolean;
} | null {
  const twos = player.hand.filter((c) => c.rank === 2);

  // Fall 1: Nur noch die 2 auf der Hand (vorletzte Runde).
  if (player.hand.length === 1 && twos.length === 1) {
    const two = twos[0];
    return { type: 'single', cards: [two], value: 2, isTieCardPlay: false };
  }

  // Fall 2: Keine Handkarten mehr, aber Tie Card vorhanden (letzte Runde).
  if (player.hand.length === 0 && player.tieCard) {
    return {
      type: 'single',
      cards: [player.tieCard],
      value: player.tieCard.rank,
      isTieCardPlay: true,
    };
  }

  return null;
}

/** Tie Card eines Spielers aus der Hand wählen und zur Seite legen. */
export function selectTieCard(state: GameState, playerId: string, cardId: string): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Spieler ${playerId} nicht gefunden.`);
  if (player.tieCard) throw new Error('Tie Card wurde bereits gewählt.');
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx === -1) throw new Error('Tie-Card-Karte nicht in der Hand.');
  player.tieCard = player.hand.splice(idx, 1)[0];
}

/** Prüft, ob alle Spieler ihre Tie Card gewählt haben, und startet ggf. Runde 1. */
export function maybeStartFirstRound(state: GameState): void {
  if (state.phase !== 'tieCardSelection') return;
  if (state.players.every((p) => p.tieCard !== null)) {
    state.round = 1;
    state.phase = 'bidding';
    dealMarketCards(state);
  }
}

/** Deckt 2 Karten vom aktuellen Stapel auf und legt sie als Marktkarten aus. */
export function dealMarketCards(state: GameState): void {
  const useStackB = state.round > stackSwitchRound(state.totalRounds);
  const stack = useStackB ? state.stackB : state.stackA;
  const cards: Card[] = [];
  for (let i = 0; i < 2 && stack.length > 0; i++) {
    cards.push(stack.shift()!);
  }
  state.marketCards = cards;
  state.currentBids = {};
  // Alle Spieler starten ohne Gebot – auch der Kartengeber.
  // Im 4-Spieler-Modus kann der Kartengeber via declareSitOut() aussetzen
  // oder normal mitspielen (submitBid wie alle anderen).
  for (const p of state.players) {
    state.currentBids[p.id] = null;
  }
}

/** Registriert das Gebot eines Spielers (verdeckt). */
export function submitBid(
  state: GameState,
  playerId: string,
  type: BidType,
  cardIds: string[],
): void {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) throw new Error(`Spieler ${playerId} nicht gefunden.`);

  // Erzwungenes Endspiel-Gebot hat Vorrang (vorletzte 2 / letzte Tie Card).
  const forced = getForcedBid(player);
  if (forced) {
    state.currentBids[playerId] = {
      type: forced.type,
      cards: forced.cards,
      value: forced.value,
    };
    return;
  }

  state.currentBids[playerId] = buildBid(player, type, cardIds);
}

/** Registriert automatisch das erzwungene Gebot, falls eines vorliegt. */
export function submitForcedBidIfAny(state: GameState, playerId: string): boolean {
  const player = state.players.find((p) => p.id === playerId);
  if (!player) return false;
  const forced = getForcedBid(player);
  if (!forced) return false;
  state.currentBids[playerId] = {
    type: forced.type,
    cards: forced.cards,
    value: forced.value,
  };
  return true;
}

/** Sind alle Gebote der aktuellen Runde abgegeben? */
export function allBidsSubmitted(state: GameState): boolean {
  return state.players.every((p) => state.currentBids[p.id] !== null);
}

/**
 * Position relativ zum Kartengeber (für Tiebreak nach Sitzposition).
 * Kartengeber = 0, dann im Uhrzeigersinn aufsteigend.
 */
function seatDistance(state: GameState, playerIndex: number): number {
  const n = state.players.length;
  return (playerIndex - state.dealerIndex + n) % n;
}

/**
 * Ermittelt den Gewinner der Bietrunde.
 * 1. Höchster Gebotswert.
 * 2. Bei Gleichstand: höhere Tie Card (nur betroffene Spieler aufdecken).
 * 3. Bei gleicher Tie Card: geringste Sitzdistanz zum Kartengeber.
 */
export function resolveWinner(state: GameState): {
  winnerId: string | null;
  tiebreakOccurred: boolean;
} {
  // Spieler mit echten Geboten (Leergebote zählen als 0 und gewinnen praktisch nie,
  // können aber bei allen-Leergeboten den Höchstwert 0 teilen).
  // Spieler, die ausgesetzt haben (sitout-Gebot mit leerer cards-Liste),
  // werden von der Auflösung ausgeschlossen.
  const entries = state.players
    .map((p, idx) => ({ player: p, idx, bid: state.currentBids[p.id]! }))
    .filter((e) => !isSittingOut(state, e.player.id));

  const maxValue = entries.length > 0
    ? Math.max(...entries.map((e) => e.bid.value))
    : 0;
  const topBidders = entries.filter((e) => e.bid.value === maxValue);

  // Wenn der Höchstwert 0 ist (alle Leergebote), gibt es keinen Gewinner.
  if (maxValue === 0) {
    return { winnerId: null, tiebreakOccurred: false };
  }

  if (topBidders.length === 1) {
    return { winnerId: topBidders[0].player.id, tiebreakOccurred: false };
  }

  // Tiebreak nötig: Tie Cards der betroffenen Spieler aufdecken
  let tiebreakOccurred = true;
  for (const e of topBidders) {
    e.player.tieCardRevealed = true;
  }

  const maxTie = Math.max(...topBidders.map((e) => e.player.tieCard?.rank ?? 0));
  const tieWinners = topBidders.filter((e) => (e.player.tieCard?.rank ?? 0) === maxTie);

  if (tieWinners.length === 1) {
    return { winnerId: tieWinners[0].player.id, tiebreakOccurred };
  }

  // Gleiche Tie Card → Sitzposition entscheidet (geringste Distanz zum Kartengeber)
  tieWinners.sort((a, b) => seatDistance(state, a.idx) - seatDistance(state, b.idx));
  return { winnerId: tieWinners[0].player.id, tiebreakOccurred };
}

/**
 * Verarbeitet die Kartenabwürfe nach Aufdeckung der Gebote.
 * - 2 (Platzhalter) kommt zurück auf die Hand (außer sie wurde als echte vorletzte Karte gespielt).
 * - Leergebot: beide Karten zurück auf die Hand.
 * - Sonst: gespielte Karten wandern auf den Abwurfstapel.
 *
 * Hinweis: Die "vorletzte Karte ist die 2 mit Wert 2" wird dadurch abgebildet,
 * dass ein Einzelgebot mit zwei 2en bzw. die letzte verbleibende 2 nicht zurückkommt,
 * wenn der Spieler sonst keine Karten mehr hätte. Wir behandeln das über handleCardReturn.
 */
function processBidCards(state: GameState, player: PlayerState, bid: Bid): void {
  if (bid.type === 'empty') {
    // Beide Karten zurück auf die Hand — nichts abwerfen.
    return;
  }

  // Sonderfall: Tie-Card-Play (letzte Runde). Die Karte ist die Tie Card,
  // nicht in der Hand. Sie wird abgeworfen.
  if (player.tieCard && bid.cards.length === 1 && bid.cards[0].id === player.tieCard.id) {
    player.discard.push(player.tieCard);
    player.tieCard = null;
    return;
  }

  if (bid.type === 'single') {
    // Sonderfall: erzwungenes Gebot mit nur einer Karte (die finale 2).
    if (bid.cards.length === 1) {
      const card = bid.cards[0];
      removeFromHand(player, card.id);
      player.discard.push(card);
      return;
    }

    // Eine Karte ist die 2 (zurück), die andere wird abgeworfen.
    const real = bid.cards.find((c) => c.rank !== 2);
    const two = bid.cards.find((c) => c.rank === 2);

    if (!real && two) {
      // Beide Karten 2 (vorletzte Runde): eine 2 wird abgeworfen.
      removeFromHand(player, two.id);
      player.discard.push(two);
      return;
    }

    if (real) {
      removeFromHand(player, real.id);
      player.discard.push(real);
    }
    // Die 2 bleibt auf der Hand (nicht entfernen).
    return;
  }

  if (bid.type === 'double') {
    // Beide Nicht-2-Karten werden abgeworfen.
    for (const c of bid.cards) {
      removeFromHand(player, c.id);
      player.discard.push(c);
    }
    player.doubleBidsUsed++;
    return;
  }
}

function removeFromHand(player: PlayerState, cardId: string): void {
  const idx = player.hand.findIndex((c) => c.id === cardId);
  if (idx !== -1) player.hand.splice(idx, 1);
}

/** Markiert ein Leergebot in der Statistik. */
function trackEmptyBid(player: PlayerState, bid: Bid): void {
  if (bid.type === 'empty') player.emptyBidsUsed++;
}

/**
 * Löst die aktuelle Bietrunde auf:
 * - ermittelt den Gewinner,
 * - verarbeitet Kartenabwürfe,
 * - bereitet die Kartenplatzierung des Gewinners vor.
 * Gibt das RoundResult zurück.
 */
export function resolveRound(state: GameState): RoundResult {
  const { winnerId, tiebreakOccurred } = resolveWinner(state);

  // Gebote für die Historie kopieren
  const bidsCopy: Record<string, Bid> = {};
  for (const p of state.players) {
    bidsCopy[p.id] = state.currentBids[p.id]!;
  }

  // Kartenabwürfe verarbeiten
  for (const p of state.players) {
    const bid = state.currentBids[p.id]!;
    trackEmptyBid(p, bid);
    processBidCards(state, p, bid);
  }

  const result: RoundResult = {
    round: state.round,
    marketCards: [...state.marketCards],
    bids: bidsCopy,
    winnerId,
    tiebreakOccurred,
    takenCard: null,
  };

  if (winnerId) {
    // Gewinner muss eine der Marktkarten wählen und platzieren.
    state.awaitingPlacementBy = winnerId;
    state.phase = 'cardPlacement';
  } else {
    // Keine Gewinner (alle Leergebote) — beide Marktkarten aussortieren.
    state.marketCards = [];
    finishRound(state, result);
  }

  state.history.push(result);
  return result;
}

/**
 * Der Gewinner wählt eine Marktkarte und legt sie ins Deck (Position) oder als Einzelkarte.
 * @param chosenCardId  Welche der zwei Marktkarten genommen wird
 * @param asDeck        true → ins Deck, false → Einzelkarte
 * @param position      Deck-Position 0-3 (nur bei asDeck)
 */
export function placeCard(
  state: GameState,
  playerId: string,
  chosenCardId: string,
  asDeck: boolean,
  position?: number,
): void {
  if (state.awaitingPlacementBy !== playerId) {
    throw new Error('Dieser Spieler ist nicht am Zug zum Platzieren.');
  }
  const player = state.players.find((p) => p.id === playerId)!;
  const chosen = state.marketCards.find((c) => c.id === chosenCardId);
  if (!chosen) throw new Error('Gewählte Karte liegt nicht aus.');

  if (asDeck) {
    if (position === undefined || position < 0 || position > 3) {
      throw new Error('Ungültige Deck-Position.');
    }
    if (player.deck[position] !== null) {
      throw new Error('Deck-Position ist bereits belegt.');
    }
    player.deck[position] = chosen;
  } else {
    player.singles.push(chosen);
  }

  // Die nicht gewählte Marktkarte wird aussortiert.
  state.marketCards = [];
  state.awaitingPlacementBy = null;

  const lastResult = state.history[state.history.length - 1];
  if (lastResult) lastResult.takenCard = chosen;

  finishRound(state, lastResult);
}

/**
 * Schließt eine Runde ab: Nachziehen prüfen, Kartengeber wechseln,
 * Phasenübergänge (Wettfenster, Spielende) handhaben, nächste Runde starten.
 */
function finishRound(state: GameState, _result: RoundResult): void {
  // Nachziehen: Spieler, die ihre letzte Handkarte (Tie Card) ausgespielt haben
  // und für Folgerunden Karten brauchen, ziehen aus dem Abwurf nach.
  // (Vereinfachte Umsetzung: siehe handleDrawing.)
  handleDrawing(state);

  // Kartengeber wechselt im Uhrzeigersinn.
  state.dealerIndex = (state.dealerIndex + 1) % state.players.length;

  // Spielende?
  if (state.round >= state.totalRounds) {
    state.phase = 'scoring';
    return;
  }

  // Stapelwechsel + Wettfenster nach der entsprechenden Runde?
  const switchRound = stackSwitchRound(state.totalRounds);
  if (state.round === switchRound && !state.bettingOffered) {
    state.bettingWindowOpen = true;
    state.bettingOffered = true;
    state.phase = 'bettingWindow';
    // Runde wird erst nach Abschluss des Wettfensters erhöht.
    return;
  }

  // Nächste Runde starten.
  advanceToNextRound(state);
}

/** Startet die nächste Runde (erhöht Rundenzähler, teilt Marktkarten aus). */
export function advanceToNextRound(state: GameState): void {
  state.round++;
  state.phase = 'bidding';
  dealMarketCards(state);
}

/** Schließt das Wettfenster und startet die zweite Spielphase. */
export function closeBettingWindow(state: GameState): void {
  state.bettingWindowOpen = false;
  advanceToNextRound(state);
}

/** Setzt die Wette eines Spielers. */
export function placeBet(state: GameState, playerId: string, bet: boolean): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.hasBet = bet;
}

/**
 * Nachzieh-Logik (Notlösung, keine Vorratshaltung):
 * Ein Doppelgebot kostet dauerhaft 2 Karten – die zweite Karte darf NICHT
 * sofort wieder nachgezogen werden. Ein Spieler spielt seine Karten in der
 * erzwungenen Reihenfolge aus (echte Karten → Platzhalter-2 → Tie Card).
 *
 * Erst wenn er ALLE Karten inklusive der Tie Card ausgespielt hat, aber noch
 * Bietrunden vor ihm liegen (z. B. weil er ein Doppelgebot ohne Leergebot
 * abgegeben hat), gleicht er sein Defizit aus, indem er die niedrigste Karte
 * aus seinem Abwurfstapel zurückholt. Pro Runde eine Karte; reicht das nicht,
 * greift die Logik in der nächsten Runde erneut. Jede nachgezogene Karte:
 * drawnCards++ (−10 Punkte in der Endwertung).
 *
 * Diese Bedingung ist unabhängig von der Rundennummer und funktioniert damit
 * auch im 4-Spieler-Modus, in dem sich der Kartenverbrauch durch das Aussetzen
 * des Kartengebers gegenüber der Rundennummer verschiebt.
 */
function handleDrawing(state: GameState): void {
  // Nach der letzten Runde folgt keine Bietrunde mehr → nie nachziehen.
  if (state.round >= state.totalRounds) return;

  for (const player of state.players) {
    if (player.hand.length === 0 && player.tieCard === null && player.discard.length > 0) {
      drawLowestCards(player, 1);
    }
  }
}

/** Zieht die n niedrigsten Karten (nach Rang) aus dem Abwurf zurück auf die Hand. */
function drawLowestCards(player: PlayerState, n: number): void {
  // Abwurf nach Rang aufsteigend sortieren.
  player.discard.sort((a, b) => a.rank - b.rank);
  const drawn = player.discard.splice(0, Math.min(n, player.discard.length));
  player.hand.push(...drawn);
  player.drawnCards += drawn.length;
}

/** Wählt den Wertungsmodus eines Spielers und löst ggf. die Endwertung aus. */
export function chooseScoring(state: GameState, playerId: string, mode: ScoringMode): void {
  const player = state.players.find((p) => p.id === playerId)!;
  player.scoringMode = mode;

  // Wenn alle Spieler einen Modus gewählt haben → Endwertung.
  if (state.players.every((p) => p.scoringMode !== null)) {
    state.finalScores = computeFinalScores(state.players);
    state.phase = 'finished';
  }
}
