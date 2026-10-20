# Sikkerhet og personvernstatus

Prototypen har ingen autentisering, secrets, posisjonstillatelser eller treningsopplasting. Eksempelprofiler er fiktive. Alle lagrede simuleringer er private. Fellesskapets knapper endrer bare lokal demotilstand.

AsyncStorage er ikke kryptert og skal ikke brukes til autentiseringstokens eller sensitive GPS-historikker. Før ekte opptak: sikker tokenlagring, gjennomgått lokal datahåndtering, eierbasert RLS, samtykkeflyter og slette-/eksportfunksjoner.

Før lansering må teamet avklare behandlingsansvar, databehandleravtaler, regionvalg, lagringstid, rettighetsforespørsler og aldersgrenser. Dette dokumentet er en teknisk status, ingen juridisk godkjenning.

Kartleverandørens plattformoppsett, Google Maps-nøkkelrestriksjoner og vilkår må verifiseres før distribusjon. Ingen slik konto er opprettet her.

## Avhengighetskontroll 19. oktober 2026

`npm audit` rapporterte 57 varslede pakker (26 moderate, 31 høye, ingen kritiske), inkludert videreførte varsler i Expo/Metro/Jest-kjeden. Underliggende meldinger omfatter `braces`, `node-forge`, `sprintf-js` og `uuid`. Audit foreslår blant annet inkompatible nedgraderinger av Expo og React Native; `audit fix --force` er derfor ikke brukt. Dette er et åpent punkt før release, ikke en sikkerhetsgodkjent avhengighetskjede. Expo Doctor sin kompatibilitetssjekk erstatter ikke en sårbarhetsvurdering.

## Posisjon (20. oktober 2026)

Appen ber nå om posisjonstillatelse i forgrunnen (`expo-location`), men bare når brukeren trykker «Vis min posisjon» eller starter en GPS-økt. Bakgrunnsposisjon er eksplisitt av i `app.json`. Koordinater skrives ikke til AsyncStorage: aktiv rute holdes i minnet, og lagrede GPS-økter har bare tid og distanse. På web hentes Leaflet fra unpkg og kartfliser fra CARTO/OpenStreetMap, så disse tjenestene ser IP-adresse og kartutsnitt.
