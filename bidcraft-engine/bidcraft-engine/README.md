# Bidcraft – Game Engine (Phase 1)

Headless, vollständig getestete Spiellogik für Bidcraft. Keine UI, kein Server-HTTP –
nur die reine Engine mit Unit- und Integrationstests.

## Struktur

```
bidcraft/
├── shared/
│   └── types.ts              # Geteilte Typdefinitionen (Card, GameState, Bid, …)
└── server/
    ├── src/engine/
    │   ├── setup.ts          # Kartensätze, Austeilen, Stapelaufteilung
    │   ├── scoring.ts        # High/Low/Spread + Endwertung + Wette
    │   ├── validation.ts     # Gebotsvalidierung, Gebotswertberechnung
    │   └── gameEngine.ts     # Rundenablauf, Tiebreaks, Phasen, Endspiel
    └── tests/
        ├── scoring.test.ts   # 12 Tests gegen Anleitungsbeispiele
        ├── engine.test.ts    # 13 Tests: Setup, Gebote, Auflösung, Tiebreaks
        └── fullgame.test.ts  # 4 Smoke-Tests: vollständige Partien
```

## Tests ausführen

Die Engine nutzt Node's eingebauten Test-Runner (`node:test`) über `tsx` –
kein zusätzliches Test-Framework nötig.

```bash
cd server
tsx --test tests/*.test.ts
```

Aktueller Stand: **29 Tests, alle grün.**

## Was die Engine abbildet

**Vollständige Regelumsetzung:**
- 3-Spieler-Modus (13 Runden, Stapel 18+8) und 4-Spieler-Modus (17 Runden, Stapel 26+8)
- Tie-Card-Wahl zu Spielbeginn (eine der 13 Handkarten)
- Drei Gebotsarten: Einzelgebot, Doppelgebot, Leergebot – mit voller Validierung
- Platzhalter-2-Mechanik (kommt nach Einzelgebot zurück)
- Leergebot-Rundenbindung (2 + Rundenkarte, nur Runden 3–13/14)
- Tiebreak über Tie Card (nur betroffene Spieler aufgedeckt) → Sitzposition
- Erzwungenes Endspiel: vorletzte Karte = 2 (Wert 2), letzte Karte = Tie Card
- 2×2-Deck-Platzierung + Einzelkarten
- Nachzieh-Logik mit −10 Punkten pro Karte
- Halbzeit-Wette nach Stapelwechsel
- Endwertung: High/Low/Spread, Einzelkarten ×2, Siegpunkte, Wettauflösung

**Verifiziert gegen die Anleitungsbeispiele:**
- High Mode: 171 Punkte ✓
- Low Mode: 148 Punkte ✓
- Spread Mode: 190 Punkte ✓
- Einzelkarten- und Wettberechnung ✓

## Wichtige API (für Phase 3 / Server-Anbindung)

```typescript
import { createGame } from './src/engine/setup';
import {
  selectTieCard, maybeStartFirstRound,
  submitBid, submitForcedBidIfAny, allBidsSubmitted,
  resolveRound, placeCard,
  placeBet, closeBettingWindow, chooseScoring,
} from './src/engine/gameEngine';
import { availableBidTypes, validateBid } from './src/engine/validation';

// Neues Spiel
const game = createGame({ playerCount: 3, humanName: 'Du', aiDifficulty: 'medium' });

// Tie Cards wählen → Runde 1 startet automatisch
selectTieCard(game, 'p0', cardId);
maybeStartFirstRound(game);

// Gebot abgeben (verdeckt), dann auflösen wenn alle abgegeben haben
submitBid(game, 'p0', 'single', [twoId, aceId]);
if (allBidsSubmitted(game)) resolveRound(game);

// Gewinner platziert Karte
placeCard(game, winnerId, chosenCardId, /*asDeck*/ true, /*position*/ 0);
```

## Nächste Schritte

- **Phase 2:** Statische Vue-3-UI (Spielbrett, Hand, Deck-Raster) mit Mock-Daten
- **Phase 3:** Express-REST-Endpunkte + Frontend-Anbindung
- **Phase 4:** KI-Entscheidungslogik (Bewertungsfunktion, Schwierigkeitsgrade)
- **Phase 5:** Animationen, Local-Storage-Persistenz, Endwertungs-Visualisierung
