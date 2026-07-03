/**
 * Bidcraft – Übersetzungstabellen (i18n)
 *
 * Dependency-freie Lösung: eine flache Key→Text-Tabelle je Sprache.
 * Platzhalter im Text werden als {name} geschrieben und zur Laufzeit ersetzt
 * (siehe stores/locale.ts → t()).
 *
 * `de` ist die kanonische Form; `en` und `es` müssen exakt dieselben Keys haben
 * (per TypeScript erzwungen über den Typ `Messages`).
 */

export type Locale = 'de' | 'en' | 'es'

export const LOCALES: Locale[] = ['de', 'en', 'es']

/** Anzeigename je Sprache (immer in der jeweiligen Sprache selbst). */
export const LOCALE_LABELS: Record<Locale, string> = {
  de: 'Deutsch',
  en: 'English',
  es: 'Español',
}

/** Kurzcode für den Umschalter. */
export const LOCALE_SHORT: Record<Locale, string> = {
  de: 'DE',
  en: 'EN',
  es: 'ES',
}

const de = {
  // Allgemein / Kopfzeile
  'app.title': 'Bidcraft',
  'header.round': 'Runde {current} / {total}',
  'header.remaining': '(noch {n})',
  'lang.aria': 'Sprache wählen',

  'common.defaultName': 'Du',
  'common.aiName': 'KI {n}',
  'common.you': '(Du)',
  'common.ok': 'OK',

  // Phasen (Statusleiste)
  'phase.setup': 'Spielaufbau',
  'phase.tieCardSelection': 'Tie-Card wählen',
  'phase.bidding': 'Bieten',
  'phase.resolution': 'Auflösung',
  'phase.cardPlacement': 'Karte platzieren',
  'phase.bettingWindow': 'Wettfenster',
  'phase.scoring': 'Wertung',
  'phase.finished': 'Spielende',

  // Setup
  'setup.title': 'Neues Spiel',
  'setup.yourName': 'Dein Name',
  'setup.playerCount': 'Spieleranzahl',
  'setup.players3': '3 Spieler',
  'setup.players4': '4 Spieler',
  'setup.aiDifficulty': 'KI-Schwierigkeit',
  'setup.easy': 'Leicht',
  'setup.medium': 'Mittel',
  'setup.hard': 'Schwer',
  'setup.start': 'Spiel starten',

  // Tie-Card
  'tie.title': 'Tie-Card wählen',
  'tie.desc': 'Wähle eine Karte als Tie-Card. Sie bleibt verdeckt und entscheidet Gleichstände.',

  // Wettfenster
  'betting.title': 'Wettfenster',
  'betting.question': 'Die erste Spielhälfte ist beendet. Möchtest du auf deinen eigenen Sieg wetten?',
  'betting.note': 'Wenn du gewinnst, verdoppelst du deine Siegpunkte. Wenn du verlierst, verlierst du die Siegpunkte des Gewinners.',
  'betting.yes': 'Ja, ich wette!',
  'betting.no': 'Nein, danke',
  'betting.continue': 'Weiter',

  // Bieten
  'bidding.title': 'Runde {n} — Bieten',
  'bidding.dealerTitle': 'Du bist in dieser Runde Kartengeber.',
  'bidding.dealerQuestion': 'Möchtest du mitbieten oder diese Runde aussetzen?',
  'bidding.bidAlong': 'Mitbieten',
  'bidding.sitOut': 'Aussetzen',
  'bidding.tieCardLast': 'Tie Card (letzte Karte)',
  'bidding.forcedTwo': 'Letzte Handkarte: 2 wird allein ausgespielt',
  'bidding.selected': 'Ausgewählt: {n} / {max} Karten',
  'bidding.submit': 'Gebot abgeben',
  'bid.single': 'Einzelgebot',
  'bid.double': 'Doppelgebot',
  'bid.empty': 'Leergebot',
  'bid.invalid': 'Ungültiges Gebot.',

  // Kartenplatzierung
  'placement.title': 'Karte platzieren',
  'placement.instruction': 'Wähle eine Marktkarte und ziehe sie ins Deck oder zu den Einzelkarten:',
  'placement.asSingle': 'Als Einzelkarte',
  'placement.confirm': 'Bestätigen',
  'placement.aiPlacing': 'KI platziert Karte…',

  // Wertung (Panel)
  'scoring.calculating': 'Wertung wird berechnet…',

  // Auflösungs-Overlay
  'resolution.round': 'Runde {n}',
  'resolution.wins': '{name} gewinnt!',
  'resolution.noWinner': 'Keine Gewinner — alle Leergebote',
  'resolution.sitout': 'aussetzt',

  // Endwertung (Tabelle)
  'score.title': 'Spielende – Ergebnisse',
  'score.col.player': 'Spieler',
  'score.col.deck': 'Deck',
  'score.col.singles': 'Singles',
  'score.col.penalty': 'Strafe',
  'score.col.raw': 'Rohpunkte',
  'score.col.victory': 'Siegpunkte',
  'score.col.final': 'Endpunkte',
  'score.col.bet': 'Wette',
  'score.betWon': '✓ gewonnen',
  'score.betLost': '✗ verloren',
  'score.breakdownTitle': 'Decks & Einzelkarten',
  'score.breakdownHint': 'Zum Nachvollziehen der Wertung.',
  'score.playAgain': 'Nochmal spielen',

  // Gegnerübersicht
  'opp.dealer': 'Geber',
  'opp.hand': 'Hand',
  'opp.singles': 'Singles',
  'opp.double': '2x',
  'opp.empty': '0x',
  'opp.discard': 'Abwurf ({n}):',

  // Board-Bereiche
  'market.title': 'Marktkarten',
  'singles.title': 'Einzelkarten',

  // Kartenränge (Bube/Dame/König/As)
  'rank.11': 'J',
  'rank.12': 'D',
  'rank.13': 'K',
  'rank.14': 'A',
}

/** Alle Sprachtabellen müssen dieselben Keys wie `de` haben. */
export type MessageKey = keyof typeof de
export type Messages = Record<MessageKey, string>

const en: Messages = {
  'app.title': 'Bidcraft',
  'header.round': 'Round {current} / {total}',
  'header.remaining': '({n} left)',
  'lang.aria': 'Select language',

  'common.defaultName': 'You',
  'common.aiName': 'AI {n}',
  'common.you': '(You)',
  'common.ok': 'OK',

  'phase.setup': 'Setup',
  'phase.tieCardSelection': 'Choose tie card',
  'phase.bidding': 'Bidding',
  'phase.resolution': 'Resolution',
  'phase.cardPlacement': 'Place card',
  'phase.bettingWindow': 'Betting window',
  'phase.scoring': 'Scoring',
  'phase.finished': 'Game over',

  'setup.title': 'New Game',
  'setup.yourName': 'Your name',
  'setup.playerCount': 'Number of players',
  'setup.players3': '3 players',
  'setup.players4': '4 players',
  'setup.aiDifficulty': 'AI difficulty',
  'setup.easy': 'Easy',
  'setup.medium': 'Medium',
  'setup.hard': 'Hard',
  'setup.start': 'Start game',

  'tie.title': 'Choose tie card',
  'tie.desc': 'Pick a card as your tie card. It stays face down and decides ties.',

  'betting.title': 'Betting window',
  'betting.question': 'The first half is over. Do you want to bet on your own victory?',
  'betting.note': 'If you win, you double your victory points. If you lose, you lose the winner’s victory points.',
  'betting.yes': 'Yes, I bet!',
  'betting.no': 'No, thanks',
  'betting.continue': 'Continue',

  'bidding.title': 'Round {n} — Bidding',
  'bidding.dealerTitle': 'You are the dealer this round.',
  'bidding.dealerQuestion': 'Do you want to bid or sit this round out?',
  'bidding.bidAlong': 'Bid',
  'bidding.sitOut': 'Sit out',
  'bidding.tieCardLast': 'Tie card (last card)',
  'bidding.forcedTwo': 'Last hand card: the 2 is played on its own',
  'bidding.selected': 'Selected: {n} / {max} cards',
  'bidding.submit': 'Submit bid',
  'bid.single': 'Single bid',
  'bid.double': 'Double bid',
  'bid.empty': 'Empty bid',
  'bid.invalid': 'Invalid bid.',

  'placement.title': 'Place card',
  'placement.instruction': 'Pick a market card and drag it into your deck or to your singles:',
  'placement.asSingle': 'As single card',
  'placement.confirm': 'Confirm',
  'placement.aiPlacing': 'AI is placing a card…',

  'scoring.calculating': 'Calculating scores…',

  'resolution.round': 'Round {n}',
  'resolution.wins': '{name} wins!',
  'resolution.noWinner': 'No winner — all empty bids',
  'resolution.sitout': 'sits out',

  'score.title': 'Game over – Results',
  'score.col.player': 'Player',
  'score.col.deck': 'Deck',
  'score.col.singles': 'Singles',
  'score.col.penalty': 'Penalty',
  'score.col.raw': 'Raw points',
  'score.col.victory': 'Victory points',
  'score.col.final': 'Final points',
  'score.col.bet': 'Bet',
  'score.betWon': '✓ won',
  'score.betLost': '✗ lost',
  'score.breakdownTitle': 'Decks & single cards',
  'score.breakdownHint': 'To follow how the score is made up.',
  'score.playAgain': 'Play again',

  'opp.dealer': 'Dealer',
  'opp.hand': 'Hand',
  'opp.singles': 'Singles',
  'opp.double': '2x',
  'opp.empty': '0x',
  'opp.discard': 'Discard ({n}):',

  'market.title': 'Market cards',
  'singles.title': 'Single cards',

  'rank.11': 'J',
  'rank.12': 'Q',
  'rank.13': 'K',
  'rank.14': 'A',
}

const es: Messages = {
  'app.title': 'Bidcraft',
  'header.round': 'Ronda {current} / {total}',
  'header.remaining': '(quedan {n})',
  'lang.aria': 'Seleccionar idioma',

  'common.defaultName': 'Tú',
  'common.aiName': 'IA {n}',
  'common.you': '(Tú)',
  'common.ok': 'OK',

  'phase.setup': 'Preparación',
  'phase.tieCardSelection': 'Elegir carta de desempate',
  'phase.bidding': 'Puja',
  'phase.resolution': 'Resolución',
  'phase.cardPlacement': 'Colocar carta',
  'phase.bettingWindow': 'Ventana de apuesta',
  'phase.scoring': 'Puntuación',
  'phase.finished': 'Fin de la partida',

  'setup.title': 'Nueva partida',
  'setup.yourName': 'Tu nombre',
  'setup.playerCount': 'Número de jugadores',
  'setup.players3': '3 jugadores',
  'setup.players4': '4 jugadores',
  'setup.aiDifficulty': 'Dificultad de la IA',
  'setup.easy': 'Fácil',
  'setup.medium': 'Media',
  'setup.hard': 'Difícil',
  'setup.start': 'Empezar partida',

  'tie.title': 'Elegir carta de desempate',
  'tie.desc': 'Elige una carta como carta de desempate. Permanece boca abajo y decide los empates.',

  'betting.title': 'Ventana de apuesta',
  'betting.question': 'La primera mitad ha terminado. ¿Quieres apostar por tu propia victoria?',
  'betting.note': 'Si ganas, duplicas tus puntos de victoria. Si pierdes, pierdes los puntos de victoria del ganador.',
  'betting.yes': '¡Sí, apuesto!',
  'betting.no': 'No, gracias',
  'betting.continue': 'Continuar',

  'bidding.title': 'Ronda {n} — Puja',
  'bidding.dealerTitle': 'Eres el repartidor en esta ronda.',
  'bidding.dealerQuestion': '¿Quieres pujar o pasar esta ronda?',
  'bidding.bidAlong': 'Pujar',
  'bidding.sitOut': 'Pasar',
  'bidding.tieCardLast': 'Carta de desempate (última carta)',
  'bidding.forcedTwo': 'Última carta en mano: el 2 se juega solo',
  'bidding.selected': 'Seleccionadas: {n} / {max} cartas',
  'bidding.submit': 'Enviar puja',
  'bid.single': 'Puja simple',
  'bid.double': 'Puja doble',
  'bid.empty': 'Puja vacía',
  'bid.invalid': 'Puja no válida.',

  'placement.title': 'Colocar carta',
  'placement.instruction': 'Elige una carta del mercado y arrástrala a tu mazo o a tus cartas sueltas:',
  'placement.asSingle': 'Como carta suelta',
  'placement.confirm': 'Confirmar',
  'placement.aiPlacing': 'La IA está colocando una carta…',

  'scoring.calculating': 'Calculando la puntuación…',

  'resolution.round': 'Ronda {n}',
  'resolution.wins': '¡{name} gana!',
  'resolution.noWinner': 'Sin ganador — todas pujas vacías',
  'resolution.sitout': 'pasa',

  'score.title': 'Fin de la partida – Resultados',
  'score.col.player': 'Jugador',
  'score.col.deck': 'Mazo',
  'score.col.singles': 'Sueltas',
  'score.col.penalty': 'Penalización',
  'score.col.raw': 'Puntos brutos',
  'score.col.victory': 'Puntos de victoria',
  'score.col.final': 'Puntos finales',
  'score.col.bet': 'Apuesta',
  'score.betWon': '✓ ganada',
  'score.betLost': '✗ perdida',
  'score.breakdownTitle': 'Mazos y cartas sueltas',
  'score.breakdownHint': 'Para seguir cómo se compone la puntuación.',
  'score.playAgain': 'Jugar de nuevo',

  'opp.dealer': 'Reparte',
  'opp.hand': 'Mano',
  'opp.singles': 'Sueltas',
  'opp.double': '2x',
  'opp.empty': '0x',
  'opp.discard': 'Descarte ({n}):',

  'market.title': 'Cartas del mercado',
  'singles.title': 'Cartas sueltas',

  'rank.11': 'J',
  'rank.12': 'Q',
  'rank.13': 'K',
  'rank.14': 'A',
}

export const messages: Record<Locale, Messages> = { de, en, es }
