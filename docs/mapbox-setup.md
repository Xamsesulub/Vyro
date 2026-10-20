# Mapbox-oppsett

1. Opprett konto på https://account.mapbox.com/auth/signup/ og bekreft e-posten.
2. Åpne https://account.mapbox.com/access-tokens/ . Opprett en public token kalt VYRO, med standard offentlige lesetilganger. Nøkkelen starter med pk., aldri sk.
3. Legg inn EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.… i mobile/.env.local. Behold Supabase-variablene. Filen skal ikke committes.
4. Restart Expo med `npx expo start --clear`. For lokal statisk webvisning på 8101: kjør `npm run export:web` fra mobile og last siden på nytt.
5. Web bruker Mapbox GL JS. Mobil bruker @rnmapbox/maps med Expo config-plugin. Mobilen må få et nytt development build; Expo Go har ikke Mapbox-modulen. Android kan bygges med `npx expo run:android` når Android-verktøyene er satt opp. iOS krever Mac eller EAS. Ingen skybygg eller betalte kontoendringer er utført.

Bruk separate nøkler for web og native ved publisering. Webnøkkelen kan begrenses til websidens tillatte URL-er. Ta med http://127.0.0.1:8101 og eventuelle andre faktiske utviklingsadresser; URL-begrensede webnøkler skal ikke gjenbrukes i native uten å kontrollere støtten. Secret tokens skal ikke legges i EXPO_PUBLIC-variabler. Kostnader følger Mapbox-avtalen; kartlastinger på web og mobilbruk beregnes forskjellig.

Kartet bruker en felles Standard-stil i dagslys med 3D-objekter av og diskrete etiketter. GPS-opptaket fra Henos, route/breakBefore, Supabase og private økter er uendret. Mapbox får data som er nødvendige for kartvisning. Appens ruter tegnes som lokale GeoJSON-lag, uten ruting-/map-matching-opplasting.

Mangler nøkkelen, vises en ærlig tomtilstand uten CARTO-fallback eller falskt kart. Nøkkel, ekte kartfliser, labels, zoom, feilhåndtering og native bygg må verifiseres når brukeren har opprettet kontoen. Automatiske geometritester sjekker koordinatrekkefølge og pausegrenser.

Kilder: https://docs.mapbox.com/help/dive-deeper/access-tokens/ , https://github.com/rnmapbox/maps/blob/main/plugin/install.md , https://docs.mapbox.com/map-styles/guides/standard-styles/
