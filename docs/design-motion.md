# VYRO: identitet og bevegelse

20. oktober 2026. Beholder lys bakgrunn, kartflaten, fem hovedfaner og tydelige treningskontroller. Denne endringen legger til et eget visuelt uttrykk og korte interaksjoner, ikke nye sosiale funksjoner eller påstått Strava-paritet.

## Referanser som faktisk er undersøkt

- [Kokonut UI](https://kokonutui.com/): komponenthierarki og tydelig respons i interaksjoner. Webkomponentene er ikke installert i mobilappen.
- [Motion: accessibility](https://motion.dev/docs/react-accessibility): støtte for redusert bevegelse; innholdet skal fortsatt fungere uten animasjon.
- [Anime.js: SVG createDrawable](https://animejs.com/documentation/svg/createdrawable/): prinsippet med å tegne opp en linje. VYRO-grafikken er egen SVG og bruker ikke Anime.js.
- [Reanimated 4](https://docs.swmansion.com/react-native-reanimated/docs/animations/withTiming/) og [Expo 58](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/): implementasjon med delte verdier, animerte SVG-egenskaper og systemets motion-innstilling.

Ingen nye animasjonsbiblioteker eller nedlastede designassets. Illustrasjonen er en abstrakt bevegelseslinje, ikke et kart eller et simulert GPS-opptak.

## Implementert

- Åpning: navy flate, lime signatur og VYRO-ordmerke. Linjen tegnes på 420 ms, åpningen tones bort og fjernes innen 660 ms etter klar app. Ingen nettverkskall eller venting på animasjonen før navigasjon. Pointer-events av. Utelates ved gjenopptatt økt og redusert bevegelse. Spilles ikke ved hvert fanebytte.
- Onboarding og utlogget start: større typografisk hierarki, egen linjeillustrasjon, én tydelig primærhandling og direkte kartinngang. Ingen oppdiktede brukerantall, streaks eller premier.
- Entréer: 10 px / 320 ms, maksimalt 60 ms ekstra forsinkelse i startinnholdet. Ingen permanente looper.
- Knapper: kort trykkrespons og kontrollert retur med fjær. Store treningsknapper krympes ikke.
- Navigasjon: diskret valgt bakgrunn og 180 ms respons; samme faner og etiketter.
- Profil: animert fremdriftslinje basert på de eksisterende verdiene. Eksempeldata merkes fortsatt.
- Oppsummering: endelig sjekkmerke og en tydelig avslutning. Simulering får eksplisitt tekst om simulering, ikke en påstått ekte prestasjon.
- Alle nye dekorative SVG-er er skjult fra skjermleseren. Fremskritt har progressbar-rolle og prosentverdi. Systemets reduserte bevegelse respekteres.

## Bevis og grenser

REA før endring viste utlogget hjem med to knapper og stor ubrukt flate. Etterkontroll bestod onboarding, hjem, profil, simulering, pause, full omlasting av pauset økt, oppsummering og lokal lagring ved 390 × 844. Onboarding, hjem og profil ble også kontrollert ved 320 × 640 med redusert bevegelse. Begge scenarioene hadde null page-errors og console-hendelser. Evidens: `evidence/rea-motion-after.json`, `evidence/rea-motion-reduced.json` og `evidence/motion-home.png`. Typecheck, lint uten cache, 47 tester i 11 suiter og web-export bestod. REA-kontroll av nettleser beviser ikke bildefrekvens eller native SVG-/Reanimated-oppførsel på telefon. Fysisk Android/iOS-test gjenstår.

GPS-algoritmen, Supabase-reglene, delingspersonvernet og kartmotoren endres ikke av denne designrunden. Ingen nye bakgrunnsoppgaver, opplastinger eller ekte økter opprettes av visuell QA.
