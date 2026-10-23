# Leveranseplan

## Innlogging og skytilkobling, 23. oktober 2026

Denne PC-en er koblet til eksisterende VYRO-prosjekt i Supabase. URL og offentlig nøkkel ligger i Git-ignorert `mobile/.env.local`. Backend kjører i skyen og er ikke avhengig av den gamle PC-en. Ingen ny database eller migrering er opprettet.

Innlogging/registrering har umiddelbar ventestatus, sperre mot doble trykk, lokal validering, norske feilmeldinger og feilhåndtering ved utlogging. Registrering skiller mellom en faktisk sesjon og venting på e-postbekreftelse. Bekreftelse kan sendes på nytt. Glemt passord og valg av nytt passord er implementert, med PKCE for nye flyter og støtte for eldre tokenlenker. Callback-lenker er konfigurert for localhost:8081 og mobilappen.

Konto-skjermen forhåndslastes. Ubetinget lasting av Mapbox ved oppstart er fjernet. Nettverksforsøk får 12 sekunders tidsgrense uten ekstra gjentakelse av brukerskrivinger. Sen sesjonsgjenoppretting blokkerer ikke inngangen til innlogging i mer enn 8 sekunder. Dette er tiltak mot treghet, ikke et målt løfte om responstid på alle enheter.

68 apptester, 73 lokale databasekontroller, typecheck, lint og eksport for web/Android/iOS består. Live Auth svarer, og anonym lesing av alle 11 tabeller avvises. Brukeren bekreftet vellykket innlogging på denne PC-en etter omstart: «Jeg kommer inn». Supabase godtok en forespørsel om testmail for gjenoppretting; full e-postflyt og fysisk enhetstest gjenstår. Egen SMTP er ikke konfigurert: registrering for allmenn bruk krever e-postleverandør før lansering. Kontosletting/eksport, tobrukertest og fysisk GPS ligger fortsatt i planen.

## Kartvisning på ny PC, 23. oktober 2026

Tomt kart på denne maskinen skyldtes manglende `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. Brukerens offentlige Mapbox-nøkkel er nå lagt i Git-ignorert `mobile/.env.local`. Mapbox Standard-stilen svarer HTTP 200 med localhost som Origin/Referer. Ingen alternativ kartleverandør eller testnøkkel er satt inn. Visuell kontroll av kartfliser i nettleseren og native kart gjenstår.

To løse tekstnoder på kartskjermen er fjernet. Tekst, kartpaneler, søk og tomtilstand bruker nå lesbare tekstfarger på sine faste lyse flater også når appens lagrede tema er mørkt. Typecheck, lint, 52 tester og web-eksport består; visuell kontroll og ekte kartlasting på denne maskinen gjenstår.

## Lokal oppdatering fra fork, 23. oktober 2026

Denne PC-en er oppdatert fra `9b1a569` til `ae17eed` («Todays work») i `Xamsesulub/Vyro`, tre commits frem. Lokal `main` følger nå `fork/main`; den opprinnelige `origin` er beholdt. Lokale designkrav er flettet inn, og tidligere lokale endringer ligger også i en navngitt Git-stash. Appkoden er identisk med forkens commit.

Avhengigheter er installert. Ved fork-oppdateringen bestod typecheck, lint, 52 tester i 12 suiter og web-eksport på Windows. Lokal konfigurasjon fulgte ikke med Git; Mapbox og Supabase er senere konfigurert på denne maskinen. Ingen backend-migrering eller fysisk GPS-test er utført i denne oppdateringen. Se `testing.md` for kontrollens avgrensning.

## Kartbasert opptak, 20. oktober 2026

Aktiv økt viser Mapbox fra start, flytende tid/tempo/distanse og stor Pause-knapp. Pauset økt har Fortsett og Fullfør. Navy, lime og lavender skiller VYRO fra referansen. Målinger kan forstørres, og økten kan minimeres til kartfanen. Kartkontroller skjules ved forstørrede målinger for å unngå overlapp på små skjermer.

Valgt konkurransesone følger med fra «Løp denne løypa», tegnes lilla og beholdes ved pause/gjenoppretting. Den lagrede GPS-økten beholder sone-ID for senere eksplisitt innsending. Ingen automatisk publisering eller overtakelse. Simulering og bytte til annen aktivitet fjerner sonevalget. Henos sin GPS-beregning og Supabase-regler er beholdt. Dette er visuell løypeveiledning, ikke svingvarsler.

## Voksende soner, 20. oktober 2026

Appflyt og PostgreSQL-migrering 004 implementerer overtakelse med valgfri utvidelse. Neste utfordrer må slå hele den nye løypa. Revisjonslås, idempotent kvittering, serverberegning, personvernforhåndsvisning og sonehendelser i feed er testet lokalt. Produksjonsmigrering 004 er aktiv etter eksplisitt godkjenning og vellykket etterkontroll. Fysisk GPS/antijuks og to ekte kontoer er ikke verifisert. Se `social-and-turf.md` for oppdatert regel og presis status; dette erstatter tidligere merknader om at utvidelser ikke er definert.

## Identitet og bevegelse, 20. oktober 2026

Egen linjeillustrasjon, tydeligere start/onboarding, kort åpningssignatur, diskret fanerespons, fremdriftslinje og avslutning av økt er implementert med Reanimated. Kokonut UI, Motion og Anime.js er inspirasjonskilder; ingen nye web-animasjonsbiblioteker er installert. Strava-strukturen, kartet, Henos sitt GPS-opptak og Supabase beholdes. REA-scenarioer og 47 tester består; fysisk native kontroll gjenstår. Se `design-motion.md`.

Siste produktendring: aktivitetsbasert sosial feed og turf-konkurranser er prioritert. Lokal UI og kandidatregler finnes; ekte flerbrukerfunksjon krever Auth/backend og verifiserte GPS-opptak. Ekte kartfliser er lagt til. Se `social-and-turf.md` for presis status.

20. oktober 2026: Lys utforming og Strava-lignende hovedstruktur implementeres. Fremgang samles under Du, og Grupper får Utfordringer/Klubber. Full funksjonslikhet er ikke levert. Funksjonskart og backend-/GPS-avhengigheter står i `strava-feature-map.md`; disse erstatter tidligere idéer om egne motivasjons- og AI-funksjoner som prioritet.

1. **Fundament:** Expo, TypeScript, Router, Zustand, Reanimated, semantiske temaer, lint og tester. Implementert.
2. **Visuell prototype:** onboarding, fem faner, eksempelhistorikk, simuleringsflyt, lokale innstillinger, diagrammer, ikon og splash. Implementert; telefon- og tilgjengelighetstest gjenstår før fasen godkjennes.
3. **Backend:** Supabase-klient og innloggingsskjerm implementert. Migrering for profiler, følgerelasjoner, økter, innlegg, likes, kommentarer og reposts med RLS er lokalt testet og rullet ut i Supabase 20. oktober 2026. Se `live-social-setup.md`. Kontosletting og eksport gjenstår.
4. **Tracking:** Første Expo Location-opptaker for løping i forgrunnen med filtrering, pause og lokalt utkast er implementert. Bakgrunnskjøring og offline sky-kø gjenstår. Krever faktiske enhetstester.
5. **Analyse:** statistikk fra ekte opptak, personlige rekorder, mer fleksible mål og splittider.
6. **Sosialt:** følgefunksjon, kommentarer, klubber, utfordringer, blokkering, rapportering og moderering.
7. **Intelligent:** lisensierte rutetjenester, AI-trener og valgfrie integrasjoner etter stabil grunnfunksjonalitet.
8. **Lansering:** sikkerhetsgjennomgang, ytelse, personvern, tilgjengelighet, E2E og butikkoppsett.

Ikke bland simulerte og ekte økter ved migrering. Prototypeøkter skal ikke oppgraderes til ekte treningsopptak.

UX-prioritet: enkel trening først. Målinger og pause skal være umiddelbart tilgjengelige. Hjem og fellesskap er forenklet med kortere innhold og færre dekorative flater. Ingen nye funksjoner før grunnflyten er behagelig å bruke.

REA-basert nettleserkontroll er startet via CLI. Startvisningen for trening er skilt fra aktive målinger, og fellesskapet bruker enklere seksjoner. Se `docs/analysis/README.md` for evidens og avgrensning; dette er fortsatt en prototype med simulering.


## Integrert 20. oktober: Henos sitt kart

Henos sitt GPS-opptak og LiveMap er flettet inn med lyst design og eksisterende Supabase-innlogging, følgerforhold og deling. Private ruter og pausegrenser beholdes lokalt og ved eksplisitt deling. Neste validering er en fysisk løpetur og deling mellom to innloggede brukere. Turf har fortsatt ingen serververifisert konkurranselogikk.

## Mapbox klargjort, 20. oktober 2026

Kartvisningen bruker nå @rnmapbox/maps på native og Mapbox GL JS 3 på web, med en felles lys Standard-stil. Henos sitt GPS-opptak og Supabase-funksjonene er beholdt. CARTO-fallback er fjernet. Manglende nøkkel gir en tydelig tomtilstand. Oppsett: docs/mapbox-setup.md. Aktivering og visuell kontroll med ekte Mapbox-konto gjenstår.

Kartskjermen er nå en full kartflate med flytende filter, rute-/posisjonsknapper og kompakt turfpanel. Kontrastlinje med hvit kant, stier/veinavn/POI og høydekurver i Mapbox Standard. Turf er fortsatt tydelig merket eksempel; ingen Strava-varmekart eller reelle konkurranser er lagt til.

## Kartkontroller, 20. oktober 2026

Blå posisjonsmarkør med hvit kant og blå glød viser fersk, tillatt GPS-posisjon også når kartet panoreres. Gløden er visuell, ikke en målt nøyaktighetsradius. Samme LocationWatcher benyttes; ingen ny opplasting. Kartet har stedsøk (midlertidige Mapbox Geocoding-resultater), lokalt lagrede rute-ID-er, lengdefilter, Standard/Satellitt/Hybrid, høydekurver, POI, 2D/3D og nord opp. Private GPS-ruter er bare synlige for den lokale øktens innloggede eier; eksempler er fortsatt merket. Supabase og opptaksalgoritmen er beholdt.

Stravas varmekart, vinterkart, underlags-/vanskelighetsdata og automatiske ruteanbefalinger er ikke implementert. Turf-konkurranse trenger fortsatt serververifisering. Kartet er en VYRO-implementering med referansens bruksmønstre, ikke full funksjonsparitet.

## Kartytelse og sikkerhet, 20. oktober 2026

Kartmotoren forhåndslastes på web og worker-ressurser varmes opp. Første kamera starter ved rutens utsnitt. Høydekurver er av som standard og lastes ved valg; terreng lastes ved 3D. POI, høydekurver og 3D endres uten full kartstil-rekonstruksjon på web; native bruker StyleImport og separate kildelag. Standard/satellitt-bytte bytter fortsatt basemap. Hash-navngitte preview-assets får immutable caching. Ingen dokumentert prosentvis forbedring på fysisk telefon ennå.

Native sesjoner flyttes fra AsyncStorage til SecureStore. Testet sikkerhetsmigrering 202610200002 er aktiv i Supabase etter eksplisitt brukergodkjenning. Rutevalidering, private skrivemengdetellere og atomiske per-bruker-grenser er lagt til. Uavklarte sikkerhetskrav før lansering er samlet i docs/security.md.

## Personvern og kryptering, 20. oktober 2026

GPS-ruter/utkast og lokale sosiale kopier lagres med AES-GCM, med kontrollert migrering fra klartekst. Native bruker SecureStore-nøkkel; web bruker ikke-eksporterbar IndexedDB-nøkkel. Nye delinger viser en rute skjermet 500 m rundt start og slutt og har følgerpublikum som standard. Publisering på nytt oppdaterer kart og publikum atomisk. SQL-migrering 202610200003 er testet lokalt og aktivert i produksjon etter eksplisitt godkjenning 20. oktober. Eksisterende publiserte kart endres ikke automatisk. UUID-varselet er rettet; tre avhengighetsadvisories uten tilgjengelig patch gjenstår. Fysisk native test og enhetens gjenopprettingsatferd gjenstår.

23. oktober 2026: Den eldre committen `9b1a569` fikk låsefilretting og bestod installasjon, typecheck, lint, 19 tester og web-eksport før fork-oppdateringen. Se historisk lokal oppstart i `testing.md`.
