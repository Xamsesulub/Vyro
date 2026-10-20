# VYRO-designsystem

Marineblå `#11182C`, lime `#B2FF78`, lavendel `#B7A4FF`, korall `#FF8D79`. Hvit bakgrunn `#FFFFFF` er standard fra 20. oktober 2026; mørkt tema er et valgfritt alternativ. Lime-knapper bruker mørk tekst. Mørkere grønn brukes til lenker og aktiv navigasjon i lyst tema for lesbarhet.

Systemfont følger plattformen og krever ingen fontnedlasting. Overskrifter: 26–28 px, brødtekst: 14–16. Treningsverdier bruker store tabulære tall. Aktivitetsfeed og innstillinger bruker rader og skillelinjer. Vanlig sidepadding er 20 px, maksimal innholdsbredde 680 px. Ingen dekorative mål-ringer eller overskrifts-etiketter.

Hovednavigasjon: Hjem, Kart, Registrer, Grupper, Du. Fremgang, Aktiviteter og Mer ligger under Du. Under en aktiv økt skjules hovedmenyen; Pause og Fortsett er faste og kart er valgfritt. Grupper har Utfordringer og Klubber, med tydelig tomtilstand inntil backend er implementert. Se `strava-feature-map.md` for avgrensning mot Strava.

Kort vises uten inngangsanimasjon. Vanlige knapper har kort trykkfeedback som følger redusert bevegelse. Treningsskjermen prioriterer distanse, aktiv tid og snittempo før kartet. Start/pause/fortsett ligger fast nederst i en 76 px høy knapp, uten skalering ved trykk. Avslutt vises separat etter pause. Kartet er kompakt og kan skjules. Kontroller har tilgjengelighetsroller og beskrivende etiketter. Enkeltkolonne, tekstskalering og små telefoner inngår i manuell testplan; tilgjengelighet er ikke ferdig godkjent.

Logoen kombinerer en avrundet ramme og en stigende bevegelseslinje. `mobile/scripts/generate-brand.ps1` genererer PNG-assets fra original geometri. Ikke generert fra tredjeparts varemerker. Splash må sjekkes i en faktisk release-build.
