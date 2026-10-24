# Kartleverandør vurdert 24. oktober 2026

Apple Maps er valgt og implementert som kartmotor for iPhone etter brukerens beskjed 24. oktober. iOS er første mobilplattform; Samsung/Android kommer senere. Nettleserforhåndsvisningen beholder Mapbox. Ingen Apple-konto, betalingsavtale eller nøkkel er opprettet.

Apple Developer Program er oppgitt til **99 USD per år** på Apples programside. Dette er medlemskapet for blant annet publisering/TestFlight og den oppgitte MapKit JS-kvoten, ikke en separat pris per kartvisning. Lokal utvikling har egne muligheter med gratis utviklerkonto.

| Plattform | Mulig løsning | Pris og krav |
| --- | --- | --- |
| iPhone | Implementert: native Apple MapKit via React Native Maps | Ingen Mapbox- eller MapKit JS-token. Publisering krever riktig Apple-oppsett. |
| Android | Utsatt, ingen aktiv kartmotor | Apple Maps er ikke native Android-kartmotor i Expo. Leverandør/oppsett velges senere. |
| Nettleser | Beholdt: Mapbox GL JS. MapKit JS er et separat mulig bytte | MapKit JS krever token/oppsett. Apple oppgir 250 000 kartvisninger og 25 000 tjenestekall per dag per Developer Program-medlemskap; mer kapasitet krever kontakt. Dette er ikke implementert. |

Valget er Expo SDK 58-kompatibel `react-native-maps@1.29.11` med standard Apple-provider. `expo-maps` ble vurdert, men SDK 58-kameraets offentlige API har koordinater/zoom uten direkte heading/pitch-styring og tilsvarende fit-to-coordinates med panelmarg. React Native Maps bevarer VYROs eksisterende nord-/3D-/rutekontroller. Det nye native biblioteket krever nytt VYRO-bygg. Pakken støttes i SDK 58 Expo Go; hele appen og bakgrunnsopptak er ikke dermed godkjent der.

Ruter, pausegrenser, markører, følgekamera, tre karttyper, turf-overlegg og geokoding har automatiserte tester. Stedssøk er eksplisitt adresseoppslag via Apples geokoder, uten opplasting av brukerens posisjon; full POI-autofullføring inngår ikke. Høydekurver er skjult på iOS, og 3D er kameravinkel/bygninger der Apple har dekning. Apple Maps er ikke fysisk eller hastighetsmålt her. Native kompilering, satellittbilder, geokoding og GPS må verifiseres på iPhone før beta-godkjenning. Den tidligere Mapbox 429-feilen gjelder fortsatt web-forhåndsvisningen.

Kilder kontrollert:

- [Apple: MapKit JS, plattformstøtte og inkluderte kvoter](https://developer.apple.com/maps/web/)
- [Apple Developer Program: medlemspris og gratis utviklerkonto](https://developer.apple.com/programs/)
- [Apple DTS: native MapKit-kostnad](https://developer.apple.com/forums/thread/127493) — eldre svar fra Apple, vurdert sammen med dagens produktsider.
- [Apple: MapKit JS krever Maps-token](https://developer.apple.com/documentation/mapkitjs/)
- [Expo SDK 58 Maps: iOS-/Android-støtte og oppsett](https://docs.expo.dev/versions/v58.0.0/sdk/maps/)
- [Expo SDK 58 React Native Maps: versjon og Apple-provider](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/)
- [React Native Maps: kamerakontroller](https://github.com/react-native-maps/react-native-maps/blob/master/docs/mapview.md)
- [Expo Location: geokoding](https://docs.expo.dev/versions/v58.0.0/sdk/location/)
