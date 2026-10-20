# Testing

## Kartbasert opptak, 20. oktober 2026

- 52 Jest-tester består. Ny lagringstest dekker valgt sone, blokkert bytte under opptak, pause/gjenoppretting, kobling til lagret økt og fjerning ved simulering.
- REA: 390×844 aktiv/pauset simulering; 320×640 med redusert bevegelse: start, forstørre/krympe, pause, fortsett, minimer, tilbake til opptak og fullfør. Ingen page-errors eller console-feil. Se `evidence/rea-recording-recqa.json` og `evidence/rea-recording-smallqa.json`.
- Isolert lokal fixture: «Løp denne løypa» åpner opptaksforberedelse med valgt sone og kart. Ingen produksjonsdata skrevet. Se `evidence/rea-recording-zoneqa.json`.
- Kartlogo/kildehenvisning flyttes over målingspanelet. Kartknapper skjules i forstørret visning etter visuell kontroll.
- Sluttkontroll: typecheck, lint uten cache og web-export består. REA `evidence/rea-recording-final.json` bekrefter forstørre/krympe/pause etter siste justering, uten console- eller page-errors. Skjermbilde: `evidence/recording-map.png`.
- Fysisk GPS, blå posisjon på telefon og native kartlayout er ikke verifisert på enhet. Krever development build. REA-simulering er kun UI-test og beviser ikke faktisk GPS-nøyaktighet.

## Voksende soner, 20. oktober 2026

- Typecheck, lint uten cache, 51 tester i 12 Jest-suiter og web-export bestått.
- `node scripts/test-database.cjs`: 38 eksisterende kontroller bestått.
- `node scripts/test-turf-database.cjs`: 35 kontroller mot alle fire migreringene i isolert PGlite. Tester anonymnekt, RPC-only eierskap, simulering, feil retning, snarvei, unøyaktighet, tregere forsøk, for kort utvidelse, overtakelse, nytt tidsmål, uendret opprinnelig prefiks, idempotent retry, kvitterings-RLS, gammel revisjon, gammel kortløype, lik tid, full ny løype og eierstyrt tilbaketrekking.
- `scripts/turf-ui-fixture.cjs` på separat loopback-port avleder alle Supabase-kall til isolert PGlite og markerer siden «LOKAL TEST · INGEN EKTE GPS». Den inngår ikke i appbygget.
- REA `evidence/rea-growing-turf.json`: utvidelsesvalg, avkrysning for deling, server-RPC, vinnerresultat, ny eier/lengde/tid i listen og overtakelsesmelding i Hjem bestått ved 390 × 844, uten page-errors/console-hendelser. Skjermbilde: `evidence/growing-turf.png`.
- Ingen ekte økter eller testsoner publisert. Fysisk iOS/Android, GPS-støy på sløyfer/parallelle veier, samtidige forbindelser og to ekte kontoer er fortsatt utestet.
- Produksjonsmigrering 004 aktivert etter eksplisitt godkjenning. Ni skrivebeskyttede etterkontroller bekreftet 3 RLS-tabeller, 4 policies, RPC-tilgang kun for innloggede, ingen direkte klientoppdatering av eierskap eller innsetting av hendelser, ingen anonym rutelesing og 0 testsoner. Normalisert funksjonskode har samme MD5 som den testede lokale versjonen. Se `evidence/supabase-turf-verification.json`.

## Identitet og bevegelse, siste kontroll 20. oktober 2026

- Typecheck, lint uten cache, 47 Jest-tester i 11 suiter og web-export bestått.
- REA ved 390 × 844: onboarding, hjem, profil, start/pause av simulering, full omlasting mens pauset, oppsummering og lokal lagring bestått. Ingen ekte GPS eller opplasting brukt.
- REA ved 320 × 640 med redusert bevegelse: onboarding, hjem og profil bestått. Innhold rulles på smal skjerm; navigasjon og onboardingens startknapp forblir tilgjengelige.
- Begge scenarioer hadde null page-errors og console-hendelser. Se `evidence/rea-motion-after.json`, `evidence/rea-motion-reduced.json` og `evidence/motion-home.png`.
- Fysisk Android/iOS-test av oppstart, redusert bevegelse, SVG-animasjon og bildefrekvens gjenstår. Innlogget feed og fremdrift med ekte konto er ikke ende-til-ende-verifisert i denne visuelle runden.

## Innlogging og sosial database, siste kontroll 20. oktober 2026

Typecheck, lint og web-eksport består. 22 app-tester og 24 lokale PostgreSQL/PGlite-påstander består. REA bekrefter innloggings-/registreringsskjermene og kontokrav ved direkte navigering til deling og GPS. Se `analysis/auth-social-review.md`.

Migreringen er ikke kjørt i Supabase; live følging/deling mellom to kontoer og fysisk GPS-test gjenstår. Ingen test-e-poster eller treningsdata er sendt til andre. Eldre testnotater nedenfor beskriver tidligere prototypeversjoner.

## Automatiske kontroller

Kjør fra `mobile`: `npm run typecheck`, `npm run lint`, `npm test` og `npm run export:web`. Jest dekker simulatorens overganger, pause/resume, tid og distanse, ukeberegning, privat og idempotent lagring samt gjenoppretting.

Dette verifiserer ikke ekte GPS, native kart, batteribruk, bakgrunnsopptak eller Supabase-policyer. Disse funksjonene er ikke implementert i første fase.

## Utført 19. oktober 2026

- TypeScript: bestått.
- ESLint: bestått, ingen feil eller advarsler.
- Jest: 2 suites / 10 tester bestått. Inkluderer vedvarende lagringsfeil uten rekursiv skriveløkke.
- Expo Doctor: 20 av 20 kontroller bestått.
- Web-eksport: bestått.
- `expo export --platform all`: bestått for web og Hermes-pakker til både Android og iOS. Dette er JavaScript/bytecode-pakking, ikke APK/IPA eller enhetstest. Hermes feilet først i sandkassens temp-mappe; samme kode pakket riktig utenfor sandkassen.
- Nettlesertest ved 390 × 844: onboarding, hjem, simulatorstart/pause/avslutt, lagring, gjenåpning etter reload, fremgang og valg av diagramdag er kontrollert.
- Siste bygg: fellesskapets lokale påmelding/heiarop samt profilens lys/mørk-bryter er kontrollert i nettleseren.
- Appikonet er visuelt kontrollert. Splash er konfigurert, men ikke validert i native release-build.
- Fysisk iOS/Android-test er ikke utført.
- npm audit: 57 varslede pakker; se `security.md`. Ingen tvungne SDK-nedgraderinger er brukt.

Windows-sandkassen blokkerte først Jest sin `realpath`-operasjon. Testene bestod utenfor sandkassen. Dette krevde ingen endring i testlogikken.

## Manuell akseptansetest på telefon

Etter UX-forenklingen: kontroller Tren ved 390 × 844 og 320 × 640. Under en aktiv økt skal distanse, aktiv tid, snittempo og Pause være synlige uten rulling. Rull innholdet og bekreft at Pause blir stående nederst. Pause/Fortsett skal beholde samme plassering; Avslutt vises separat etter pause. Prøv også stor systemskrift og skjul/vis eksempelkart. Fysisk enhetskontroll gjenstår.

Kontrollert i nettleseren etter forenklingen: aktiv økt ved 320 × 640 viser alle tre målinger og Pause uten rulling. Knappen blir stående ved rulling og byttes til Fortsett på samme sted. Skjul kart og pauset visning er kontrollert ved 390 × 844. Typecheck, lint, 10 tester og web-eksport består. Disse skjermkontrollene erstatter ikke native testing eller test med stor systemskrift.

1. Start appen på en liten Android-telefon og en iPhone. Kontroller onboarding, tilbakeknapper, valgfritt navn, aktivitet og mål.
2. Åpne alle fem faner. Test med stor skrift, VoiceOver/TalkBack og redusert bevegelse. Kontroller kontrast og at kontroller ikke skjules bak systemnavigasjon.
3. Start simulering. Vent minst 10 sekunder. Pause: tid og distanse skal stå stille. Fortsett: kun aktiv tid teller.
4. Send appen i bakgrunnen og åpne igjen. Økten skal være pauset. Avslutt appen og åpne på nytt: lokalt øktbilde skal kunne fortsettes.
5. Avslutt via pause, endre navn og notater, lagre. Økten skal være privat og merket simulering. Åpne den fra historikken. Last appen på nytt og kontroller persistens.
6. Prøv forkasting og sletting, både avbryt og bekreft. Kontroller at øvrige økter beholdes.
7. Slå av eksempeldata. Hjem/fremgang/historikk skal bare vise egne simuleringer. Bytt lys/mørk modus, ukemål og foretrukne aktiviteter.
8. Trykk på diagrammets søyler. Meld på/av demo-utfordringen og gi/angre heiarop. Ingenting skal sendes til andre.
9. Verifiser Apple Maps/Google Maps, panorering og markører på telefon. Web viser kun ruteillustrasjon. Ingen lokasjonstillatelse skal etterspørres.
10. Bekreft appikon og splash i en faktisk native release-build. Expo Go er ikke nok for splash-validering.

## Senere tracking-akseptanse

REA CLI 6.7.0: start → pause → fortsett bestod etter siste forenkling ved 390 × 844. Full evidens og skjermbilder er lagret under `docs/analysis/`. Typecheck, lint, 10 tester og web-eksport bestod. Dette gjelder nettleserprototypen, ikke native GPS.

Ekte GPS krever separate fysiske tester: låst skjerm, bakgrunn, unøyaktig signal, nettbrudd, appavbrudd, lavt batteri, pause/resume, filtrering, duplikatfri sync og korrekt distanse mot kjent strekning. Simulatorresultater må aldri rapporteres som GPS-testresultater.

20. oktober 2026: Lys redesign kontrollert med REA MCP ved 390 × 844 og 320 × 640. Hele simuleringsflyten, profil, grupper, treningslogg og innstillinger bestod etter retting av navigasjonsfeil. Typecheck, lint, 11 tester og web-eksport bestod. Se analysis/light-design-review.md for evidens og begrensninger.

20. oktober 2026: Supabase-klient konfigurert. Skrivebeskyttet Auth settings-kontroll returnerte HTTP 200 og godkjente publishable key. Typecheck, lint, 17 tester og web-eksport bestod. Ingen kontoer eller databaseposter ble opprettet; innlogging, RLS og native sesjonsfornyelse er ikke ende-til-ende-verifisert.

Databaseutrulling 20. oktober 2026: SQL Editor rapporterte suksess. Kontroll i produksjonsprosjektet bekreftet 7 tabeller med RLS, 18 policies, ingen anon SELECT-rettigheter, authenticated EXECUTE på publish_workout og aktiv profil-trigger. Skrivebeskyttede REST-kall til alle 7 tabellene returnerte 401/42501 uten brukerinnlogging. To-konto-flyt og fysisk GPS gjenstår.

## Henos-fletting, 20. oktober 2026

Integrert commit 9b1a569 med beholdt lyst design og Supabase-funksjoner. Ruter lagres nå lokalt og sendes med delte GPS-økter. Pausegrenser lagres som breakBefore og vises som separate kartlinjer. Henos sitt LiveMap brukes i opptak, historikk og innlegg. Web har lyse CARTO-fliser; native bruker react-native-maps.

Kontrollert: typecheck, lint, 32 Jest-tester, 24 lokale PostgreSQL/RLS-kontroller og web-export. REA-scenarioene i docs/evidence/rea-henos-merge.json og rea-henos-auth.json fullførte start/pause/oppsummering, kartlasting, registreringsskjerm og innloggingskrav ved GPS-start/deling uten page-errors. Ingen ekte konto eller økt ble opprettet av testene. Fysisk GPS, native kart og deling mellom to ekte brukere er fortsatt ikke ende-til-ende-testet.

## Mapbox-forberedelse

34 Jest-tester bestått, inkludert kartets koordinatrekkefølge, segmentgrenser og turfetiketter. Web-export bestått. REA ev_964fc08bf46b1f6ec87b20ec9c990ec01071bcfdb4e50b90ee0dd31a7d4cb6ba bekrefter tomtilstand uten nøkkel og ingen page-errors; dette er ikke bevis på fungerende Mapbox-fliser. Gyldig token og fysisk native development build gjenstår.

Mapbox aktivert med brukerens offentlige nøkkel 20. oktober: web-export bestått. REA ev_c6ef76f118e6e43c91d663f3240f29832eeded6d2460fe5f3ff2ba5c7572d825 viser ekte bakgrunnskart over Akerselva/Torshov med rute og eieretikett. Ingen page-errors eller kartfeil i kontrollen. Native development build og fysisk GPS er fortsatt ikke kontrollert. Nøkkelen ligger i ignorert .env.local.

Kartskjerm redesign: REA ev_8ae5166331adeed01694237b0ce7c32c995bee888399a20f4ff0030e15aa689a verifiserte 390x844 med ekte Mapbox-kart. Filter, neste turf, utvid/skjul detaljer, hele ruten og navigering til opptak fullført uten page-errors/kartfeil. Skjermbilde i docs/evidence/map-explorer-mobile.png. Typecheck, lint, 34 tester og web-export bestått. Ny posisjonsknapp bruker eksisterende LocationWatcher; faktisk posisjon og native visning ikke fysisk testet. GPS- og Supabase-koden er uendret.

## Kartkontroller, 20. oktober 2026

36 Jest-tester bestått. Nye tester skiller faktisk posisjon fra rutespor og kontrollerer kartlag/terreng. Typecheck, Expo lint uten cache og web-export kontrolleres etter endringen. useVisibleWorkouts er memoisiert for å unngå kamerahopp ved UI-oppdateringer. GPS-opptak, pausegrenser og Supabase-opplasting er ikke endret. Native development build, faktisk posisjonstillatelse, bevegelse og GPS på fysisk telefon er fortsatt utestet.

Sluttkontroll: typecheck, Expo lint --no-cache og web-export bestått. REA ev_80504734b3aee61e5d31980d3d714d52d18bd732e6ed92f0684d070da7473f7e fullførte alle 19 steg ved 390x844: bokmerke, lagret-filter, satellitt, 3D, søk Oslo og valg av treff. Ingen page-errors eller kart-/terrengfeil. Evidens: docs/evidence/rea-map-controls.json. Fysisk posisjon var ikke simulert i denne kontrollen og er fortsatt utestet på enhet.

## Kartytelse og sikkerhet — sluttkontroll

- Typecheck, Expo lint --no-cache, 40 Jest-tester og web-export bestått etter kompatible npm-rettinger og SecureStore-installasjon.
- 30 lokale PostgreSQL/RLS-kontroller bestått med begge migreringer, inkludert validering av ekstradata, klientforbud på tellertabell, rate-limit selv etter sletting og serverstyrte tidsstempler.
- REA ev_05d2f28049f88a2b2bd2272d3b77ec746845f5b2c032bfa54a0d2a4e41975d83: alle 19 steg fullført, ingen page-errors eller console errors. Nettverk viser forhåndslastet kartmotor, ingen terrain-v2 ved oppstart og DEM først ved 3D. Standard/satellitt byttes; 3D henter ikke ny standard-stil. Dette er funksjons-/nettverksbevis, ikke en måling av opplevd lastetid på telefon. Se evidence/rea-map-performance-security.json.
- Produksjon: 8 RLS-tabeller, 18 policies og 5 grense-triggere; anonym REST-lesing ga 401; e-post-autobekreftelse av. evidence/supabase-security-verification.json.
- SecureStore tester lang sesjon/migrering, feil ved keychain-skriving og refresh/utlogging i kø. Fysisk native lagring, ny native kartlagstyring og GPS er utestet; et nytt development build kreves.
- npm audit --omit=dev har 50 gjenværende transitive funn. Se docs/security.md og evidence/dependency-audit-summary.json. Ingen --force-nedgraderinger ble kjørt.

## Kryptering og delingspersonvern, 20. oktober 2026

- Lokal PostgreSQL: 38 kontroller, inkludert følgertilgang, tap av tilgang etter unfollow, reaksjons-/kommentarisolasjon og oppdatering av rutekart ved ny deling.
- REA evidence/rea-encrypted-storage.json: onboarding, lagring og full omlasting ved 390×844. Navnet kommer tilbake etter dekryptering; bare kryptert VYRO-lagringsnøkkel finnes i localStorage. Ingen page-errors/console-feil. Ingen ekte konto eller økt opprettet.
- Krypteringsadapter tester verifisert migrering, korrupt data, nøkkelfeil og skriveorden. Store-tester bruker separat lagringsmock; de beviser ikke native kryptering.
- Fysisk test MÅ utføres i nytt native build: migrer eksisterende økt, restart, pause/gjenoppta, lås/lås opp, test mistet nøkkel/reinstallasjon på testdata, og del mellom to kontoer. Android adb er ikke tilgjengelig her; ingen fysisk verifikasjon utført.
- Produksjonsmigrering 003 er aktivert etter eksplisitt godkjenning 20. oktober. SQL Editor bekreftet suksess; seks etterkontroller bekreftet followers-standard, 7 tilgangspolicies, oppdatert RPC, anon EXECUTE=false, authenticated EXECUTE=true og at gammel RPC er fjernet. Gamle innlegg beholder tidligere publikum; ny deling skal oppdatere kartet og publikum uten duplikat.

Sluttkontroll etter endringene: typecheck, lint uten cache, 47 Jest-tester i 11 suiter, 38 lokale databasekontroller og web-export bestått. xcode UUID-override testet med 1000 unike gyldige ID-er. npm audit --omit=dev: 41 treff (22 high, 19 moderate), tre underliggende advisories uten tilgjengelig rettet registry-versjon.
