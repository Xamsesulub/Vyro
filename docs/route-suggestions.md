# Ruteforslag fra VYRO-brukere

## Gjeldende retning — 26. oktober 2026

Ruteforslag er et bibliotek over løyper brukerne uttrykkelig deler fra egne gjennomførte GPS-turer. Ekstern beregning med openrouteservice/HeiGIT er avviklet. Ingen ruter genereres automatisk, og ingen private turer deles automatisk.

## Brukerflyt

- Kart → Ruteforslag: velg sted eller «Nær meg». Søket viser inntil 20 delte løyper innen 15 km fra valgt område, sortert etter nærhet. Valgfritt filter for sport/lengde; «Alle lengder» er standard. Et tomt søk sier at området ikke har passende bidrag.
- «Bidra med en løype»: velg en egen GPS-tur (løping, gange eller fottur), se forhåndsvisningen, angi et offentlig løypenavn og sted/by. Kryss av for deling og trykk «Del løypa med alle». Simuleringer, eksempler, andres turer og private bokmerker er ikke kilder.
- Området innen 500 meter fra begge endepunkter er skjult. Brudd beholdes, også der en linje ellers kunne krysset skjermet område. Bare den synlige linjen sendes sammen med navn, sted, sport og en privat idempotensreferanse. Tid, tempo, notater og original GPS-linje følger ikke med.
- Den synlige løypa må være 500 m–50 km. Lengden beregnes på nytt på serveren uten å telle hull. Fullføring og GPS-kilde kontrolleres i appen; serveren validerer kilde/format/lengde. Dette er ikke kryptografisk bevis for at en telefon faktisk løp turen: en modifisert klient kan lyve om GPS-opprinnelse.
- Løypa blir tilgjengelig for innloggede VYRO-brukere. Stedsnavnet er brukerens etikett; geografisk søk bruker den delte linjens koordinater.
- «Løyper du har delt» → løype → «Trekk tilbake deling» → bekreft. Serveren fjerner den delte kopien, tilhørende bokmerker og likhetsdata. Den private treningsøkten beholdes. Tidligere nedlastede kopier hos andre kan ikke tilbakekalles; appen fjerner egen cache når serveren bekrefter at løypa er borte.
- Andre kan se, lagre privat og følge linjen under eget GPS-opptak. Ingen treningsresultater, turf-poeng eller svingvarsler oppstår fra et ruteforslag.

## Duplikater

PostgreSQL sampler den delte linjen omtrent hver 35. meter. En rute avvises hvis minst 90 % av punktene i **begge retninger** ligger innen 45 meter fra den andre rutens punkter. Det håndterer motsatt retning, annen start på en rundtur, ulik GPS-frekvens og små posisjonsavvik. En global transaksjonslås gjør kontroll/innsetting atomisk; kvittering per eier/tur gjør gjentatt innsending etter nettbrudd idempotent.

Dette er en romlig toleranse, ikke perfekt løypeidentifikasjon. Parallelle stier svært nær hverandre kan regnes som like. Må sjekkes med flere virkelige turer før toleransen justeres. Indekser støtter punkt-/områdesøk; samtidig innsending og stor geografisk katalog er ikke lasttestet mot produksjon.

## Backend og drift

Ny migrering: `202610260002_community_routes.sql`. Den ble aktivert i eksisterende prosjekt `diviitenhbidwrcpmkxr` med `db query --file`, etter isolerte tester. CLI-migreringshistorikken er fortsatt ikke avstemt: **ikke kjør gamle migreringer eller hele db push**.

- `route_suggestions` utvides med community-kilde, bidragsyter, sted og omtrentlig sentrum. RLS gir innloggede lesetilgang til delte ruter.
- `route_contributions` knytter eier/lokal økt til offentlig løype; bare eieren får lese sine kvitteringer.
- `route_similarity_points` brukes bare internt av serveren.
- RPC: `search_community_routes`, `contribute_route`, `withdraw_route`. Autentisering kreves; klienter får ikke direkte skrive til rutetabellene. Høyst 10 nye bidrag/døgn og 100 aktive bidrag per konto.
- Gammel Edge `route-suggestions` returnerer HTTP 410 med oppdateringsbeskjed. Den inneholder ingen leverandør- eller service-role-nøkkel og gjør ingen eksterne kall. Nye klienter bruker PostgreSQL-RPC direkte.
- `ORS_API_KEY` og begge ORS-kvoteinnstillingene er fjernet fra Supabase og lokal ignorert serverfil. HeiGIT-kontoen/nøkkelen hos leverandøren er ikke slettet eller rotert.
- Gammel Cron-jobb er deaktivert via `cron.alter_job`. Gamle genererings-RPC-er avviser alle kall. Historiske cache-/kvotetabeller og 14 tidligere genererte ruter er bevart uten ny bruk.
- De 2 eksisterende private bokmerkene er bevart. Bare deres eiere får lese de tilhørende gamle forslagene. Ingen gamle forslag vises i fellesskapssøket eller kan bokmerkes av nye brukere.
- Første versjon av migreringen med sletting ble avvist av automatisk godkjenning og **ble ikke kjørt**. Den aktiverte revisjonen bevarer eksisterende data.
- Vanlig stedssøk og bakgrunnskart er uendret: Apple på iOS, eksisterende webkart. Dette er separate funksjoner fra den fjernede rutegeneratoren.

## Verifisering og neste kontroll

Se [testing](testing.md). Innlogget localhost-søk etter Oslo viser ekte tomtilstand; bidragssiden viser ingen GPS-turer på denne nettleseren. Ingen virkelig tur eller syntetisk GPS-bidrag er publisert under kontrollen.

Før bruk på iPhone: bygg og installer ny preview (den installerte appen oppdateres ikke av Git-push). Test å dele en faktisk, egnet GPS-tur med samtykke, gjenfinne den fra en annen konto, avvise samme/motsatt rute, trekke tilbake og bekrefte at originaløkten fortsatt er privat. Kontroller kartgap, tastatur, store tekststørrelser og VoiceOver fysisk.
