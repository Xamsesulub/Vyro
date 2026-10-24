# Mapbox-oppsett

Fra 24. oktober 2026 gjelder dette bare **web-forhåndsvisningen**. iPhone bruker Apple Maps uten Mapbox-konto/nøkkel. Android er utsatt; se [kartplattformene](map-provider-options.md).

1. Opprett konto på https://account.mapbox.com/auth/signup/ og bekreft e-posten.
2. Åpne https://account.mapbox.com/access-tokens/ . Opprett en public token kalt VYRO, med standard offentlige lesetilganger. Nøkkelen starter med pk., aldri sk.
3. Legg inn EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.… i mobile/.env.local. Behold Supabase-variablene. Filen skal ikke committes.
4. Restart Expo med `npx expo start --clear`. For lokal statisk webvisning på 8101: kjør `npm run export:web` fra mobile og last siden på nytt.
5. Web bruker Mapbox GL JS. Native Mapbox-pakke/plugin er fjernet. iPhone bruker `react-native-maps` med Apple MapKit og må bygges på nytt etter byttet. iOS-bygg krever Mac eller EAS. Ingen skybygg eller betalte kontoendringer er utført.

Webnøkkelen kan begrenses til websidens tillatte URL-er. Ta med http://127.0.0.1:8101 og eventuelle andre faktiske utviklingsadresser. Secret tokens skal ikke legges i EXPO_PUBLIC-variabler. Kostnader for web-forhåndsvisningen følger Mapbox-avtalen. iOS krever ingen Mapbox-nøkkel.

Standard bruker veikartet i dagslys. Satellitt og Hybrid bruker Mapbox Standard Satellite, med kartnavn/veier henholdsvis av og på. GPS-opptaket fra Henos, route/breakBefore, Supabase og private økter er uendret. Mapbox får data som er nødvendige for kartvisning. Appens ruter tegnes som lokale GeoJSON-lag, uten ruting-/map-matching-opplasting.

Mangler nøkkelen, vises en ærlig tomtilstand uten CARTO-fallback eller falskt kart. Nøkkel, ekte kartfliser, labels, zoom, feilhåndtering og native bygg må verifiseres når brukeren har opprettet kontoen. Automatiske geometritester sjekker koordinatrekkefølge og pausegrenser.

Kilder: https://docs.mapbox.com/help/dive-deeper/access-tokens/ , https://github.com/rnmapbox/maps/blob/main/plugin/install.md , https://docs.mapbox.com/map-styles/guides/standard-styles/

## Satellitt og drabart rutepanel

Web bruker `mapbox://styles/mapbox/standard-satellite` for begge fotografiske karttyper. Satellitt/Hybrid-bytte oppdaterer bare veier/navn og gjenbruker bildene. 2D/3D er et separat valg. Gyldig Mapbox-token med tilgang til bilder/fliser er nødvendig på web; iOS bruker Apples egne karttyper.

Rutepanelet har et merket håndtak for drag eller trykk og kan minimeres for å frigjøre kartet. Kartets kameramarg tilpasses panelets synlige høyde, og kartknappene legges i en rad på lave skjermer. Se `testing.md` for lokal berørings-/WebGL-test og avgrensningen mot ekte satellittbilder og fysisk mobil. Den offentlige testlenken er ikke oppdatert fra dette miljøet.

## Diagnostiser manglende satellittbilder

Stilbeskrivelsen, kildebeskrivelsen (TileJSON) og selve bildeflisene er separate forespørsler. HTTP 200 for stilen betyr derfor ikke at fotografiene virker. Målingene som fulgte `ef3d26c`, viste 200 for beskrivelsene og **429 for bildeflisene**, også i en separat leseforespørsel. Når bildene mangler, kan ruten og noen kartlag fortsatt tegnes. Samme kartleverandør som en annen app gir ikke automatisk samme kontotilgang, kvoter eller stilvalg.

Kjør på maskinen der VYROs offentlige Mapbox-nøkkel er konfigurert, fra `mobile`:

```bash
npm run map:check
```

Skriptet bruker prosjektets ignorerte `.env.local`/Expo-miljø, gjør opptil fire lesende forespørsler og prøver **én faktisk JPEG-flis over Oslo**, uten brukerens GPS/rute. Det skriver ikke token, URL med token eller svartekster. Eventuelle tallfestede ventetider og rate-limit-headere tas med i feilsvaret. Ingen automatiske nye forsøk utføres. Det stopper ved første feil og returnerer feilkode. Det kan ikke kontrollere Mapbox-kontoens fakturering eller brukshistorikk.

For URL-begrensede webnøkler settes `VYRO_MAP_CHECK_ORIGIN` til den faktiske appadressen før kommandoen (for eksempel `http://localhost:8101`). Skriptet sender denne som Origin/Referer. Bruk riktig verdi for publisert nettsted; en localhost-test beviser ikke at den publiserte adressen er tillatt.

- `satellite-image: 200, ok: true`: én bildeflis ble levert som JPEG. Kontroller deretter fotografiene visuelt i appen og på telefonen.
- `429 / rate-limited`: vent og undersøk bruksgrenser, varsler og eventuell blokkering i den aktuelle [Mapbox-kontoen](https://account.mapbox.com/). 429 alene beviser ikke at en betaling eller oppgradering er nødvendig. Ved vedvarende 429 må kontotilgangen avklares med Mapbox; stilbytte løser ikke en avvist bildeforespørsel.
- `401/403 / access-denied`: kontroller token, offentlige lesetilganger og tillatte URL-er. Ikke erstatt brukerens nøkkel med en demo-/tredjepartsnøkkel.
- `missing-public-token`: legg prosjektets offentlige nøkkel i det lokale miljøet. Ingen nettverkskall er utført.
- `network-or-invalid-response`: kontroller nettverk/proxy. Dette er ikke bevis for en Mapbox-kontogrense.

Ved kartfeil viser appen «Prøv kartet på nytt». 429 gir 30 sekunders ventetid før ett brukerinitiert forsøk; ingen bakgrunnsløkke sender nye forespørsler. Forsøket laster kartmotoren/kildene på nytt og beholder kartutsnitt og gjeldende rute. Andre kartlag kan fortsatt velges. En vellykket stilinnlasting skjuler ikke en bildefeil. Dette retter gjenopprettingen i appen, men opphever ingen begrensning hos leverandøren.
