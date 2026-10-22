# Kontosesjon og feedytelse

## Endret atferd

Hjem viser innlogget innhold når Supabase har levert en sesjon. Åtte sekunders venting gir en forklaring og mulighet til å prøve gjenoppretting igjen, ikke en gjesteside. Supabase kan sende `INITIAL_SESSION` med null også ved en mislykket gjenoppretting; appen bekrefter derfor et tomt startsvar med `getSession` utenfor auth-callbackens lås. Nyere innlogging, tokenfornyelse eller eksplisitt utlogging har forrang over gamle startsvar og retry-resultater. Appen gir aldri tilgang basert på lokalt profilnavn eller en ubekreftet registrering.

Feeden bruker 20 innlegg per side og henter ett ekstra for å avgjøre om neste side finnes. Markøren bruker både `created_at` og `id`, slik at innlegg med samme tidsstempel ikke blir borte. Listen virtualiseres, og store ruteobjekter og kartmotorer lastes først når brukeren åpner rutekartet. Kommentarer hentes fortsatt ved åpning. Forespørsler avbrytes når en skjerm forlates eller filteret endres.

Etter databaseoppdateringen bruker Hjem ett `vyro_feed`-kall og ett `vyro_turf_events`-kall, før eventuelle brukerhandlinger. Før hadde hvert innlegg tre egne reaksjonskall, i tillegg til henting av innlegg, følgerliste og sonehendelser: opptil 94 kall for 30 innlegg. `vyro_feed` returnerer reaksjoner samlet og utelater rute-JSON. Løpersøk henter følgestatus for maksimalt de 50 profilene som vises.

## Databaseoppdatering

Kjør `supabase/migrations/202610230001_feed_performance.sql` én gang etter de fire eksisterende migreringene. Den legger til to lesefunksjoner og indekser for sidevisning, forfatter, sonehendelser og fremmednøkler. Den flytter eller sletter ingen brukerdata og endrer ikke skrivefunksjoner eller eksisterende RLS-policyer.

Begge funksjonene er `SECURITY INVOKER`, med eksplisitt `search_path` og EXECUTE kun for `authenticated`. Innlogget identitet kommer fra `auth.uid()`, aldri fra et bruker-ID-argument. Følgerpersonvern og bortfall av tilgang etter unfollow gjelder også for reposts og reaksjoner.

Migreringen er **bare testet lokalt**, ikke kjørt i produksjon. Ingen Supabase-administratortilgang eller databaseforbindelse var tilgjengelig i skymiljøet. Indeksopprettelsen skjer i en transaksjon og kan blokkere skriving mens den kjører; planlegg utrulling etter databasens faktiske størrelse og trafikk. Ved store aktive tabeller bør indeksene bygges med `CREATE INDEX CONCURRENTLY` i en tilpasset migrering uten transaksjonsblokk.

Appen faller tilbake til dagens lesinger bare hvis den nye funksjonen mangler (`PGRST202`/`42883`). Tilgangsfeil, tidsavbrudd og nettverksfeil faller ikke tilbake. Den gamle veien har fortsatt separate reaksjonskall og en grense på 1 000 følger-/repost-ID-er. Full forbedring og korrekt feed for større følgerlister krever at migreringen kjøres. Kontorettingen og kartlasting ved behov virker også før migreringen.

Etter utrulling, kontroller funksjonene i en testkonto, følger-/repost-fanen, neste side, kartåpning og unfollow. Test at en annen konto og en anonym klient fortsatt nektes private data. Ingen produksjonsdata eller testkontoer ble opprettet under utviklingen.

## Verifikasjon og kapasitet

Fra `mobile`:

```sh
npm run typecheck
CI=1 npm run lint -- --no-cache
CI=1 npm test -- --ci
node scripts/test-database.cjs
node scripts/test-turf-database.cjs
node scripts/test-feed-database.cjs
npm run export:web -- --max-workers 2
```

Den nye PGlite-testen oppretter 10 120 innlegg, 1 501 følgerelasjoner og 1 000 sonehendelser i minnet. Den verifiserer RLS, anonymnekt, ingen privat aktivitetsrute i svarene, 20-elementers sidevisning, like tidsstempler, serverens sidegrense og at unfollow fjerner tilgang. De to målte lokale kjøringene brukte 13–17 ms på første side; dette er enkeltforespørsler i PGlite, ikke en måling av Supabase eller samtidige brukere.

Før større lansering må kapasiteten måles i et eget testprosjekt med representative ruter, følgergrafer, reaksjonsmengder og samtidige klienter. Følg særlig p95/p99 svartid, feilandeler, CPU, minne, databaseforbindelser, trege spørringer og låseventing. Eksakt opptelling av likerklikk kan fortsatt bli dyrt på svært populære innlegg; mål dette før eventuelle vedlikeholdte tellere innføres. Dimensjonering av Supabase, SMTP og fysisk mobiltesting gjenstår. Endringene lover ikke en bestemt maksimal brukermengde.
