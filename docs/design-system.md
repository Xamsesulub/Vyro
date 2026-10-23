# VYRO-designsystem

Brukerens hovedprinsipp, presisert 23. oktober 2026: **Ikke gjør VYRO mer komplisert enn nødvendig. Gjør hver funksjon enklere, penere og mer behagelig å bruke.**

GPS- og treningsskjermen prioriteres foran dekorative kort og avanserte animasjoner. Under en økt skal distanse, aktiv tid, tempo og Pause være umiddelbart synlige uten leting eller rulling. Animasjoner skal støtte forståelse og gi tilbakemelding uten å forsinke betjening.

| Verktøy | Rolle i VYRO |
| --- | --- |
| Kokonut UI | Inspirasjon til komponentdesign, kort og interaksjoner. |
| Motion.dev | Inspirasjon til overganger og animasjonsprinsipper. |
| Anime.js | Inspirasjon til mer avanserte visuelle animasjoner når de gjør funksjonen lettere å bruke. |
| React Native Reanimated | Implementering av animasjoner i mobilappen. |
| Codex | Utvikling, integrasjon og testing. |
| REA | Valgfri teknisk analyse av relevante løsninger. |

Kokonut UI, Motion.dev og Anime.js er inspirasjonskilder; de installeres ikke som web-avhengigheter i mobilappen. Strava-referansene brukes fortsatt for bruksmønstre, hierarki og enkle rader, mens VYRO beholder sin egen visuelle identitet. REA er et utviklingsverktøy og er ikke en forutsetning for alle designendringer. Denne presiseringen erstatter det tidligere generelle kravet om REA ved videre redesign.

Marineblå `#11182C`, lime `#B2FF78`, lavendel `#B7A4FF`, korall `#FF8D79`. Hvit bakgrunn `#FFFFFF` er standard fra 20. oktober 2026; mørkt tema er et valgfritt alternativ. Lime-knapper bruker mørk tekst. Mørkere grønn brukes til lenker og aktiv navigasjon i lyst tema for lesbarhet.

Systemfont følger plattformen og krever ingen fontnedlasting. Overskrifter: 26–28 px, brødtekst: 14–16. Treningsverdier bruker store tabulære tall. Aktivitetsfeed og innstillinger bruker rader og skillelinjer. Vanlig sidepadding er 20 px, maksimal innholdsbredde 680 px. Ingen dekorative mål-ringer eller overskrifts-etiketter.

Hovednavigasjon: Hjem, Kart, Registrer, Grupper, Du. Fremgang, Aktiviteter og Mer ligger under Du. Under en aktiv økt skjules hovedmenyen; Pause og Fortsett er faste og kart er valgfritt. Grupper har Utfordringer og Klubber, med tydelig tomtilstand inntil backend er implementert. Se `strava-feature-map.md` for avgrensning mot Strava.

Kort vises uten inngangsanimasjon. Vanlige knapper har kort trykkfeedback som følger redusert bevegelse. Treningsskjermen prioriterer distanse, aktiv tid og snittempo før kartet. Start/pause/fortsett ligger fast nederst i en 76 px høy knapp, uten skalering ved trykk. Avslutt vises separat etter pause. Kartet er kompakt og kan skjules. Kontroller har tilgjengelighetsroller og beskrivende etiketter. Enkeltkolonne, tekstskalering og små telefoner inngår i manuell testplan; tilgjengelighet er ikke ferdig godkjent.

Logoen bruker løperfiguren «Run» fra Tabler Icons sammen med VYRO-ordmerket. Den samme geometrien i `mobile/src/theme/runnerMark.json` brukes i små ikoner, logoen, oppstartsanimasjonen og appikonene. Kilde og MIT-lisens ligger i `mobile/THIRD_PARTY_NOTICES.md`. Kjør `npm run brand:generate` i `mobile` for å gjenskape PNG-filene med Sharp (kun utviklingsavhengighet); PowerShell-skriptet er en snarvei til samme generator. iOS-ikonet er 1024 × 1024 uten alfa, Android-forgrunnen og monokromikonet har transparent bakgrunn og padding innenfor sikker sirkel, og nettleserikonet er 64 × 64. Appikon og splash må også sjekkes i en faktisk release-build.
