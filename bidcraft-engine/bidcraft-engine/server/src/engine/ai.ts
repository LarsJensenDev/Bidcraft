/**
 * Bidcraft – KI-Entscheidungen
 *
 * Zwei Entscheidungen pro Runde:
 *  1. decideBid:        Welche Gebotsart + welche Karten? (Wie hoch biete ich?)
 *  2. decidePlacement:  Welche ersteigerte Marktkarte und an welchen Deck-Platz?
 *
 * Beide Entscheidungen bauen auf einer gemeinsamen Bewertungsfunktion auf:
 * dem *erwarteten besten Deckwert* (expectedBestDeckScore). Diese schätzt den
 * Endwert eines (auch unvollständigen) Decks, indem leere Plätze mit
 * Durchschnittskarten aufgefüllt werden – so kann die KI auch früh sinnvoll
 * planen, lange bevor das Deck voll ist.
 *
 * Die KI ist bewusst rein heuristisch (kein vollständiges Min-Max), aber
 * deutlich stärker als naives "höchste Karte zuerst": Sie bewertet, *wie viel*
 * ihr eine Marktkarte bringt, bietet nur so hoch wie der Gewinn es rechtfertigt,
 * schont hohe Handkarten für lohnende Runden und platziert ersteigerte Karten
 * an der wertmaximierenden Position.
 */

import type {
  Card, Suit, Rank, BidType, ScoringMode, PlayerState, GameState,
} from '../../../shared/types';
import {
  HIGH_SUIT_VALUE, LOW_SUIT_VALUE, SPREAD_FACTOR,
  highRankValue, lowRankValue, scoreSingles,
} from './scoring';
import { availableBidTypes } from './validation';

const MODES: ScoringMode[] = ['high', 'low', 'spread'];

// --- Erwartungswerte für noch leere Deck-Plätze ----------------------------
// Beim Auffüllen eines unvollständigen Decks nehmen wir an, dass künftige
// Karten "durchschnittlich" sind. So bekommt eine teilbesetzte Reihe/Spalte
// schon Wert zugeschrieben (Potenzial), statt erst beim Vollwerden zu zählen.
const EXP_SUIT_VALUE = 2.5; // Mittel der Farbwerte (1..4) – in high wie low gleich
const EXP_RANK_VALUE = 8;   // Mittlerer Rangwert (high: 2..14, low: 16-rank) ≈ 8
const EXP_RANK = 8;         // Mittlerer Rohrang für Spread-Differenzen

function suitValueFor(suit: Suit, mode: ScoringMode): number {
  return mode === 'low' ? LOW_SUIT_VALUE[suit] : HIGH_SUIT_VALUE[suit];
}

function rankValueFor(rank: Rank, mode: ScoringMode): number {
  return mode === 'low' ? lowRankValue(rank) : highRankValue(rank);
}

/**
 * Deckwert in einem Modus, wobei leere Plätze (null) mit Erwartungswerten
 * aufgefüllt werden. Für ein volles Deck identisch zu scoreDeck().
 *
 * Raster:  0=TL 1=TR / 2=BL 3=BR
 * High/Low:  Reihen suit(links)×rank(rechts), Spalten suit(oben)×rank(unten)
 * Spread:    |rankDiff| × 5 je Reihe und Spalte
 */
function expectedModeScore(deck: (Card | null)[], mode: ScoringMode): number {
  if (mode === 'spread') {
    const rk = (c: Card | null) => (c ? c.rank : EXP_RANK);
    return SPREAD_FACTOR * (
      Math.abs(rk(deck[0]) - rk(deck[1])) +
      Math.abs(rk(deck[2]) - rk(deck[3])) +
      Math.abs(rk(deck[0]) - rk(deck[2])) +
      Math.abs(rk(deck[1]) - rk(deck[3]))
    );
  }
  const sv = (c: Card | null) => (c ? suitValueFor(c.suit, mode) : EXP_SUIT_VALUE);
  const rv = (c: Card | null) => (c ? rankValueFor(c.rank, mode) : EXP_RANK_VALUE);
  return (
    sv(deck[0]) * rv(deck[1]) + // Reihe 1
    sv(deck[2]) * rv(deck[3]) + // Reihe 2
    sv(deck[0]) * rv(deck[2]) + // Spalte 1
    sv(deck[1]) * rv(deck[3])   // Spalte 2
  );
}

/** Bester erwarteter Deckwert über alle drei Wertungsmodi. */
function expectedBestDeckScore(deck: (Card | null)[]): number {
  let best = -Infinity;
  for (const mode of MODES) {
    const s = expectedModeScore(deck, mode);
    if (s > best) best = s;
  }
  return best;
}

/**
 * Beste Platzierung einer Karte ins Deck: die freie Position, die den
 * erwarteten besten Deckwert maximiert. null, wenn das Deck voll ist.
 */
function bestDeckPlacement(
  deck: (Card | null)[],
  card: Card,
): { position: number; score: number } | null {
  let best: { position: number; score: number } | null = null;
  for (let p = 0; p < 4; p++) {
    if (deck[p] !== null) continue;
    const trial = [...deck];
    trial[p] = card;
    const score = expectedBestDeckScore(trial);
    if (!best || score > best.score) best = { position: p, score };
  }
  return best;
}

export interface AiPlacementDecision {
  cardId: string;
  asDeck: boolean;
  position?: number;
}

/**
 * Wählt aus den ausliegenden Marktkarten die beste und platziert sie.
 *
 * Strategie: Das Deck wird bevorzugt aufgefüllt. Solange noch ein Deck-Platz
 * frei ist, wandert die Karte immer ins Deck – und zwar diejenige Marktkarte
 * an der Position, die den erwarteten Deckwert maximiert. Erst wenn das Deck
 * voll ist, werden Einzelkarten gesammelt (dann die höchstwertige Marktkarte,
 * Rang × 2).
 */
export function decidePlacement(state: GameState, player: PlayerState): AiPlacementDecision {
  const market = state.marketCards;
  const hasFreeSlot = player.deck.some((slot) => slot === null);

  // 1. Deck noch nicht voll → auffüllen. Beste Karte+Position nach Deckwert.
  if (hasFreeSlot) {
    let best: { decision: AiPlacementDecision; value: number } | null = null;
    for (const card of market) {
      const deckPlace = bestDeckPlacement(player.deck, card);
      if (!deckPlace) continue;
      if (!best || deckPlace.score > best.value) {
        best = {
          decision: { cardId: card.id, asDeck: true, position: deckPlace.position },
          value: deckPlace.score,
        };
      }
    }
    if (best) return best.decision;
  }

  // 2. Deck voll (oder keine Deck-Platzierung möglich) → wertvollste Einzelkarte.
  let bestSingle: { decision: AiPlacementDecision; value: number } | null = null;
  for (const card of market) {
    const value = card.rank * 2;
    if (!bestSingle || value > bestSingle.value) {
      bestSingle = { decision: { cardId: card.id, asDeck: false }, value };
    }
  }

  // Fallback (sollte nicht auftreten, da nur bei vorhandenen Marktkarten gerufen).
  return bestSingle?.decision ?? { cardId: market[0]?.id ?? '', asDeck: false };
}

// --- Gebots-Entscheidung ----------------------------------------------------

export interface AiBidDecision {
  type: BidType;
  cardIds: string[];
}

/** Standardprofil-Parameter, falls ein KI-Spieler kein Profil hat. */
const DEFAULT_ECONOMY = 0.7;
const DEFAULT_RANDOMNESS = 0.15;
const DEFAULT_BLUFF = 0.15;

// Kalibrierungskonstanten der Gebots-Heuristik.
const DESIRE_K = 30;          // Sättigung: Gewinnwert→Begehren (winValue/(winValue+K))
const EXP_COMP_MAX = 12;      // Max. erwartetes Konkurrenzgebot (Rangskala)
const LOGISTIC_BASE = 2.2;    // Steilheit der Gewinnwahrscheinlichkeit
const LOGISTIC_RAND = 4;      // Aufweichung durch Zufallsanteil des Profils
const COST_SCALE = 0.8;       // Umrechnung "geopferter Rang" → Punkteinheiten
const DOUBLE_PENALTY = 4;     // Zusatzkosten für ein Doppelgebot (knappe Ressource)

interface BidCandidate {
  type: BidType;
  cardIds: string[];
  value: number;       // Gebotswert
  committed: number[]; // Ränge der dauerhaft abgeworfenen Karten
}

/**
 * Strategische Gebotsentscheidung.
 *
 * Vorgehen:
 *  1. winValue = wie viel mir die beste der zwei Marktkarten (optimal platziert)
 *     einbringt. Bestimmt Begehren und erwartete Konkurrenz.
 *  2. Für jedes mögliche Gebot wird ein Erwartungswert geschätzt:
 *        EV = P(gewinnen | Gebotswert) × winValue − Opportunitätskosten
 *     - P(gewinnen) steigt logistisch mit dem Gebotswert relativ zur erwarteten
 *       Konkurrenz (die wiederum mit der Kartenqualität steigt).
 *     - Opportunitätskosten = Wert der dauerhaft abgeworfenen Karten als künftige
 *       Bietmacht; spät im Spiel (wenige Restrunden) sinken sie, da Karten ohnehin
 *       bald verloren gehen. Skaliert mit economyDiscipline des Profils.
 *  3. Das Gebot mit dem höchsten EV wird gewählt. Ein Leergebot (EV ≈ 0) dient
 *     als "aussteigen und alles behalten"-Option, wenn sich kein Gebot lohnt.
 *
 * Erzwungene Endspielgebote (letzte 2 / Tie Card) werden NICHT hier behandelt –
 * die Engine erkennt sie via getForcedBid und überschreibt jedes Gebot.
 */
export function decideBid(
  state: GameState,
  player: PlayerState,
  rng: () => number = Math.random,
): AiBidDecision {
  const economy = player.aiProfile?.economyDiscipline ?? DEFAULT_ECONOMY;
  const randomness = player.aiProfile?.randomness ?? DEFAULT_RANDOMNESS;
  const bluff = player.aiProfile?.bluffProbability ?? DEFAULT_BLUFF;

  const two = player.hand.find((c) => c.rank === 2);
  const nonTwos = player.hand.filter((c) => c.rank !== 2);
  const available = availableBidTypes(player, state);

  // 1. Wert eines Sieges in dieser Runde.
  const baseDeck = expectedBestDeckScore(player.deck);
  const takeValue = (card: Card): number => {
    const deckPlace = bestDeckPlacement(player.deck, card);
    const deckVal = deckPlace ? deckPlace.score : -Infinity;
    const singleVal = baseDeck + card.rank * 2;
    return Math.max(deckVal, singleVal) - baseDeck;
  };
  const winValue = Math.max(0, ...state.marketCards.map(takeValue));

  // 2. Begehren und erwartete Konkurrenz (alle sehen dieselben Marktkarten).
  const desire = winValue / (winValue + DESIRE_K); // 0..1
  const stage = state.totalRounds > 0 ? state.round / state.totalRounds : 0;
  const remaining = Math.max(0, state.totalRounds - state.round);
  const opponents = Math.max(1, state.players.length - 1);
  const expComp = desire * EXP_COMP_MAX + (opponents - 1) * 0.8 + stage * 1.5;
  const steepness = LOGISTIC_BASE + randomness * LOGISTIC_RAND;
  const pWin = (value: number) => 1 / (1 + Math.exp(-(value - expComp) / steepness));

  // Opportunitätskosten einer abgeworfenen Karte (künftige Bietmacht).
  const futureValue = (rank: number) =>
    rank * COST_SCALE * economy * (state.totalRounds > 0 ? remaining / state.totalRounds : 0);

  // 3. Mögliche Gebote sammeln.
  const candidates: BidCandidate[] = [];
  if (available.includes('single') && two) {
    for (const c of nonTwos) {
      candidates.push({ type: 'single', cardIds: [two.id, c.id], value: c.rank, committed: [c.rank] });
    }
  }
  if (available.includes('double')) {
    for (let i = 0; i < nonTwos.length; i++) {
      for (let j = i + 1; j < nonTwos.length; j++) {
        const a = nonTwos[i];
        const b = nonTwos[j];
        candidates.push({
          type: 'double',
          cardIds: [a.id, b.id],
          value: a.rank + b.rank,
          committed: [a.rank, b.rank],
        });
      }
    }
  }
  if (available.includes('empty') && two) {
    const roundCard = player.hand.find((c) => c.rank === state.round);
    if (roundCard) {
      candidates.push({ type: 'empty', cardIds: [two.id, roundCard.id], value: 0, committed: [] });
    }
  }

  if (candidates.length === 0) {
    // Keine reguläre Option – minimalstes Einzelgebot, falls möglich.
    if (two && nonTwos.length > 0) {
      const lowest = nonTwos.reduce((a, b) => (a.rank <= b.rank ? a : b));
      return { type: 'single', cardIds: [two.id, lowest.id] };
    }
    return { type: 'empty', cardIds: [] };
  }

  // 4. Erwartungswert je Gebot; bestes wählen.
  let best: { cand: BidCandidate; ev: number } | null = null;
  for (const cand of candidates) {
    const benefit = cand.value > 0 ? pWin(cand.value) * winValue : 0;
    let cost = cand.committed.reduce((sum, r) => sum + futureValue(r), 0);
    if (cand.type === 'double') cost += DOUBLE_PENALTY * economy;
    // Zufallsanteil: erratischeres Spiel bei hoher randomness (easy).
    const noise = (rng() - 0.5) * 2 * randomness * (winValue * 0.5 + 4);
    const ev = benefit - cost + noise;
    if (!best || ev > best.ev) best = { cand, ev };
  }
  let chosen = best!.cand;

  // 5. Gelegentlicher Bluff/Raise: unvorhersehbar etwas höher bieten, wenn die
  //    Runde überhaupt etwas wert ist. Modelliert Verschleierung/Aggression.
  if (winValue > 0 && rng() < bluff) {
    const raises = candidates.filter((c) => c.value > chosen.value);
    if (raises.length > 0) {
      // kleinste echte Erhöhung wählen (nicht gleich die Bietmacht verheizen)
      chosen = raises.reduce((a, b) => (a.value <= b.value ? a : b));
    }
  }

  return { type: chosen.type, cardIds: chosen.cardIds };
}
