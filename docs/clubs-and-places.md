# Klubber og stedsbilder

Implementert 23. oktober 2026 etter brukerens nye produktønske. Native Expo SDK 58, TypeScript og eksisterende Supabase-klient beholdes. `expo-image-picker` og `expo-image-manipulator` er installert med versjoner valgt av Expo. Nytt native bygg kreves for modulene og norsk bildebibliotek-tekst. Kamera/mikrofontilgang legges ikke til.

## Flyter

- Hjem: VYRO til venstre, opprett innlegg og personsøk til høyre. «Del treningsøkt» bruker eksisterende private GPS-delingsflyt. «Del bilde av et sted» åpner egen bildevelger/tekst/publikum-flyt.
- Klubber: velg Privat (standard) eller Åpen ved oppretting. Åpne klubber vises for innloggede brukere og har direkte Bli med. Private klubber krever invitasjon og aksept. Eier finner personer ved navn/brukernavn og inviterer i appen, eller bytter synlighet etter bekreftelse. Det sendes ingen e-post/SMS eller pushvarsling. Medlemmer kan forlate; eier kan fjerne andre eller slette klubben etter bekreftelse.
- Du: Finn venner åpner samme søk og følgefunksjon. Fane og konto er felles med resten av appen.
- Innstillinger → Varsler og opptak: Av/Tale/Vibrasjon per kilometer og native bakgrunnsopptak. Bakgrunnsvalget kan ikke endres mens en økt er aktiv. Kart og kontrollknapper prioriteres på Tren.

## Backend

Åpne klubber (`202610240003_open_clubs.sql`) ble aktivert i Supabase 23. oktober 2026. SQL Editor bekreftet suksess, og åtte lesende etterkontroller bestod: privat standard, RLS, anon-nekt, autentisert innmelding, oppdagelsesfunksjon, beskyttet medlemsliste, ingen direkte klientinnsetting av medlemskap og fortsatt privat bildelagring. Ingen testklubber eller testmedlemmer ble opprettet i den ekte databasen. Migreringen skal ikke kjøres på nytt.

`202610230001_feed_performance.sql` og `202610240001_clubs_places.sql`/`202610240002_place_storage.sql` er kjørt på prosjektet `diviitenhbidwrcpmkxr` etter uttrykkelig godkjenning. SQL Editor bekreftet suksess og seks etterkontroller bestod. Disse filene skal ikke kjøres en gang til på det samme skjemaet. Den separate backup-migreringen `202610230002` er ikke aktivert av denne leveransen.

Klubbtabellene har kun SELECT for klienter; medlemskap endres gjennom avgrensede RPC-er med `auth.uid()`, fast tom `search_path`, eiersjekk og radlås der relevant. Mottaker må godta egen invitasjon; invitasjon gir tilgang til klubbens navn/beskrivelse, ikke medlemslisten. Bare medlemmer ser medlemslisten. Nye tabeller har RLS, rate-limit-trigger for oppretting/invitasjoner og ingen anon-tilgang.

`202610240003_open_clubs.sql` legger til `visibility` med privat standard også for eksisterende klubber. Åpen oppdagelse viser navn, beskrivelse, eier-ID og antall medlemmer; medlemslisten er fortsatt kun for medlemmer. `join_open_club` låser klubbraden og sjekker åpen-status på serveren før innlogget bruker legges til. Eier kan gjøre klubben privat uten å fjerne eksisterende medlemmer. Gamle klienters toargument-kall til `create_club` fortsetter å opprette private klubber. Innmelding er begrenset med eksisterende skriverate-regel. Ingen GPS-/bildefunksjon endrer tilgang ved klubbmedlemskap. Fjerning fra en åpen klubb er ikke en blokkering; personen kan melde seg inn på nytt så lenge klubben er åpen.

`place_posts` er uavhengig av treningsdata. `publish_place` krever opplastet objekt under innlogget eiers UUID og bruker stabilt utkast-ID for trygge forsøk på nytt. Følgere er standard; «Alle i VYRO» gjelder innloggede brukere. Hjem viser egne og fulgte personers innlegg. Det finnes ikke en offentlig bildeoppdagelsesside.

Bucket `place-photos` er privat og tillater JPEG opptil 5 MiB. Klienten skalerer til maks 1600 px, komprimerer og fjerner EXIF/XMP/IPTC/kommentarer. Ingen koordinater fra bildet legges til posten. Lesing skjer med autentisert download, ikke varige offentlige bilde-URL-er. RLS kontrollerer publikum ved nye forespørsler; et bilde noen allerede har lastet ned kan ikke trekkes tilbake fra mottakerens enhet. Overskriving er ikke tillatt. Tilbaketrekking sletter posten før lagringsobjektet, slik at en mislykket objektopprydding ikke gir fortsatt tilgang for andre. Avbrutt publisering kan etterlate et privat objekt hos eieren; automatisk opprydding av slike objekter er ikke implementert.

Feed henter 20 innlegg pluss én markørrad. Den gamle `vyro_feed` er beholdt, og appen faller bare tilbake ved manglende ny RPC. Bilder gjør ingen endring i treningsstatistikk, ruter eller sonekonkurranser. Klubber hentes i sider på 20 med stabil datotid/UUID-markør, både for egne og åpne klubber. Invitasjoner viser inntil 100, medlemslister 200 og personsøk 50 treff.

## Kontroll og videre arbeid

Se [testing](testing.md). Fysiske telefoner og to ekte kontoer mot Storage HTTP er ikke verifisert. Klubbchat, klubbarrangementer, foto-reaksjoner og moderering/blokkering er egne senere oppgaver. Åpne klubber krever fortsatt innlogget konto. Denne leveransen publiserer ikke en ny versjon av den gamle VibeOff/testnettsiden.

API-referanser brukt: [Expo ImagePicker 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagepicker/), [Expo ImageManipulator 58](https://docs.expo.dev/versions/v58.0.0/sdk/imagemanipulator/), [Supabase Storage RLS](https://supabase.com/docs/guides/storage/security/access-control) og [Storage-feilkoder](https://supabase.com/docs/guides/storage/debugging/error-codes).
