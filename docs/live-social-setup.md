# Innlogging og sosial database – 20. oktober 2026

## Kode som er implementert

- E-post/passord-registrering, innlogging, utlogging og gjenoppretting av lagret Supabase-sesjon. Registrering krever e-postbekreftelse når dette er aktivert i prosjektet. Bekreft e-posten og logg deretter inn i VYRO igjen.
- Hjem og Løpere krever konto. Ekte feed, navnesøk, følg/slutt å følge, likes, kommentarer, egne reposts og tilbaketrekking bruker Supabase. Eksempelprofilene blandes ikke inn i disse skjermene.
- Publisering skjer gjennom `publish_workout`, som atomisk oppretter en privat serverkopi og et delt innlegg. Gjentatte forsøk med samme lokale økt-ID lager ikke dubletter. Notater lastes ikke opp.
- Innlegget, inkludert hele ruten, kan leses av alle innloggede medlemmer. Dette står ved delingsbekreftelsen. Følger-filteret begrenser feeden, ikke autorisasjonen til et delt innlegg.
- Private serverøkter kan bare leses/slettes av eieren. Publiseringens forfatter hentes fra serverens `auth.uid()`, aldri fra et klientargument. Tilbaketrekking kaskadesletter likes, kommentarer og reposts. Den private serverkopien beholdes.
- Kontoavhengige skjermkomponenter nullstilles ved kontobytte. GPS-økter på enheten filtreres på eier; gamle simuleringer kan ikke deles.
- Første GPS-opptaker for løping bruker Expo Location i forgrunnen, filtrerer dårlige posisjoner/hopp, har pause og lagrer utkast lokalt. Den er separat fra simulatoren. GPS-opptaket skal fysisk testes før produksjonsbruk.

## Utrulling som fortsatt må utføres

Migreringen ble kjørt i prosjektet 20. oktober 2026 via innlogget SQL Editor. Sju tabeller har aktiv RLS og 18 policies. Alle sju REST-endepunktene avviser uinnlogget lesing med HTTP 401 / 42501. Publiseringsfunksjonen tillater authenticated, avviser anon, og profil-triggeren er aktiv. Oppsettsteg 1–2 nedenfor er fullført; ikke kjør migreringen på nytt.

1. Logg inn på Supabase-prosjektet `diviitenhbidwrcpmkxr` i Codex-fanen, eller åpne prosjektets SQL Editor selv.
2. Kjør innholdet i `supabase/migrations/202610200001_social.sql` én gang. Filen kjører i én transaksjon og oppretter syv tabeller, RLS, indekser, profil-trigger og publiseringsfunksjon. Den skal ikke kjøres gjentatte ganger; ved feil rulles transaksjonen tilbake.
3. Kontroller Auth-oppsettet: e-postbekreftelse, riktig Site URL og en fungerende e-postleverandør for produksjon. Innloggingsskjermen støtter bekreftelse via e-post og deretter vanlig passordinnlogging, ikke automatisk sesjon fra lenken.
4. Registrer to reelle testkontoer med egne e-postadresser og bekreft dem. Test følging, publisering av en faktisk GPS-økt, likes, kommentar, repost, tilbaketrekking og kontobytte på separate enheter/nettleserprofiler.

Ingen brukere er opprettet, ingen e-poster er sendt og ingen treningsdata er lastet opp under agentens tester.

## Verifikasjon og begrensninger

`node scripts/test-database.cjs` fra mobile kjører samme migrering i lokal PostgreSQL via PGlite med Supabase-lignende roller og `auth.uid()`. 24 påstander dekker tillatte/avviste operasjoner, private ruter, falsk forfatter, selvfølging, dubletter, ugyldige ruter og kaskadesletting. Dette erstatter ikke kontroll mot ekte Supabase.

GPS-versjonen krever åpen app og påslått skjerm. Den pauser ved bakgrunn eller lange signalhull; utkastet kan gjenopptas nær pausestedet. Det er ikke implementert bakgrunnsopptak, kontinuerlig skysynkronisering eller serververifisert GPS. Et klientfelt med `source=gps` er ikke bevis mot juks og gir aldri turf-eierskap.

Feed viser de 30 nyeste treffene; løpersøk viser opptil 50, og kommentarer opptil 100. Likes og kommentarer oppdateres ved interaksjon/ny innlasting; Realtime er ikke aktivert. Blokkering, moderering, passordgjenoppretting og kontosletting gjenstår før en offentlig lansering. Lokal sletting fjerner bare enhetskopien; trekk tilbake deling fra Hjem for å fjerne publisert kart.

