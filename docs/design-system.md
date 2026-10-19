# VYRO-designsystem

Marineblå `#11182C`, lime `#B2FF78`, lavendel `#B7A4FF`, korall `#FF8D79`. Mørk bakgrunn `#0B1120`; lyst tema `#F4F5FA`. Lime-knapper bruker mørk tekst. Lyst tema bruker mørkere grønn til lenker og aktiv navigasjon for lesbarhet.

Systemfont følger plattformen og krever ingen fontnedlasting. Display: 36–46 px, overskrifter: 24–30, brødtekst: 14–17, etiketter: 10–12. Treningsverdier bruker tabulære tall. Kort har 24 px radius og 22 px indre avstand. Vanlig sidepadding er 24 px, maksimal innholdsbredde 680 px.

Kort vises uten inngangsanimasjon. Vanlige knapper har kort trykkfeedback som følger redusert bevegelse. Treningsskjermen prioriterer distanse, aktiv tid og snittempo før kartet. Start/pause/fortsett ligger fast nederst i en 76 px høy knapp, uten skalering ved trykk. Avslutt vises separat etter pause. Kartet er kompakt og kan skjules. Kontroller har tilgjengelighetsroller og beskrivende etiketter. Enkeltkolonne, tekstskalering og små telefoner inngår i manuell testplan; tilgjengelighet er ikke ferdig godkjent.

Logoen kombinerer en avrundet ramme og en stigende bevegelseslinje. `mobile/scripts/generate-brand.ps1` genererer PNG-assets fra original geometri. Ikke generert fra tredjeparts varemerker. Splash må sjekkes i en faktisk release-build.
