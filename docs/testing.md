# Testing

## Felles kontostatus, 23. oktober 2026

- Typecheck, prosjektets `expo lint --no-cache`, 75 Jest-tester i 16 suiter og Expo-webeksport bestått. Den nye tverrskjermtesten og publiseringsskriptet består også eksplisitt ESLint. En bredere `eslint .` viste eksisterende manglende Node/Jest-globals og importvarsler i hjelpefiler/tester; disse er ikke del av Expo-lintens standardomfang.
- Nye tester dekker gjenopprettet sesjon, tokenfornyelse og utlogging på Hjem/profil/innstillinger samtidig, navigasjonsremontering, lokal gjesteprofil, ubekreftet registrering, innlastingsvisning, manglende sesjon i innloggingssvar, avmeldt auth-observer og global sesjon før e-postcallback navigerer.
- Nettleser: isolert demo på localhost:8103 viser «Innlogget» i profil og «Du er innlogget i hele VYRO» på kontosiden. Dette er en fiktiv sesjon, ikke en vellykket innlogging mot Supabase. Demoen er stoppet etter testen.
- Sites-versjon 2 er publisert. Omlasting av den offentlige appen og navigering til profil bekreftet «Gjest · ikke innlogget». Bevis: `evidence/auth-public-guest-2026-10-23.jpg` og `evidence/auth-shared-session-demo-2026-10-23.jpg`.
- Live kontroll: Auth HTTP 200, registrering på og e-postbekreftelse påkrevd. Alle 11 tabeller avviser anonym tilgang med HTTP 401. Ett tilfeldig ugyldig innloggingsforsøk ble avvist på 195 ms. Ingen kontoer, e-poster eller treningsdata ble opprettet.
- Supabase-dashboardet står fortsatt på innlogging. SMTP, offentlige redirect-adresser, mottak av bekreftelse og ekte innlogging på offentlig adresse er ikke ferdig verifisert. Fysisk Android/iOS er utestet.
- VibeOff viser fortsatt «Not published» og krever brukerens konto/«Publish my build». Fem skjermbilder og Live link er klare; ingen video er laget eller lastet opp.

## Offentlig nettversjon, 23. oktober 2026

- Typecheck, lint uten cache, 68 Jest-tester i 15 suiter og Expo-webeksport: bestått. En enkel snarvei til eksisterende simulering er lagt til i AccountGate; backendtilgang og GPS-vilkår er uendret.
- Sites meldte vellykket publisering med offentlig tilgang. HTTP-kontroller uten nettleserøkt returnerte 200 for `/`, `/map` og `/auth/callback`; SPA-fallback er konfigurert.
- Nettlesertest på offentlig adresse: onboarding uten navn/konto, kartfliser med eksempelrute, gjesteknappen, start av simulering, tid/distanse/tempo, pause og fullføring til oppsummering. Ingen GPS-tillatelse eller produksjonsskriving ble brukt.
- VibeOff bekreftet «Saved»; «Live link» ble deretter kontrollert i det gjenåpnede redigeringsskjemaet. Brukerens tekstendringer ble beholdt. Innlegget er ikke publisert.
- Supabase-dashboardet krevde ny innlogging. Redirect- og SMTP-endringer er derfor ikke utført; vellykket konto-innlogging på den nye adressen, e-postlenker og fysisk mobil/GPS er ikke verifisert i denne runden.

## VibeOff-demovisning, 23. oktober 2026

- Nettleserverktøyet fikk tilgang til localhost i denne runden. Fem ekte skjermbilder er kontrollert og lagret i `showcase/vibeoff/`. Kartfliser, rute, lesbare kartpaneler, eksempelinnlegg, fiktive løpere og profilstatistikk ble visuelt kontrollert i appens webeksport.
- Innebygd simulering: start, store målinger og pause kontrollert i UI. Bildet viser aktiv simulering; økten ble deretter satt på pause. Ingen fysisk GPS, produksjonskonto eller produksjonsskriving inngår i denne kontrollen.
- Isolert fixture på localhost:8103 bruker fiktive profiler og omdirigerer Supabase-fetch lokalt; mutasjoner avvises. Brukerens vanlige app og innlogging på localhost:8081 beholdes separat.
- Typecheck og lint uten cache bestått etter fixture-endringen. Appkoden og den tidligere verifiserte eksporten er uendret i denne runden. De 68 apptestene og 73 databasekontrollene fra forrige runde er ikke kjørt på nytt for dokumentasjon og skjermbilder.
- VibeOff svarte HTTP 201 med privat utkast. Fem bilder, bildetekster og hele beskrivelsen av videre arbeid ble bekreftet på gjennomgangssiden og i redigeringsskjemaet. Publisering på brukerens konto gjenstår.

## Innlogging og backend på ny PC, 23. oktober 2026

- Lokal `.env.local` er konfigurert mot eksisterende Supabase-prosjekt med offentlig nøkkel. Git-ignore er kontrollert. Ingen service-role-nøkkel er brukt eller lagret i appen.
- Typecheck og lint uten cache: bestått. Jest: **68 tester i 15 suiter bestått**. Nye tester dekker validering, umiddelbar ventestatus, dobbelttrykk, faktisk sesjon før navigasjon, feil passord, bekreftelse/resending, e-postfeil, passordgjenoppretting, oppdatering av passord, nettverksbrudd, utlogging, tidsavbrudd, avbruddssignal, sen sesjonsgjenoppretting og engangslenker.
- `node scripts/test-database.cjs`: 38 kontroller bestått. `node scripts/test-turf-database.cjs`: 35 kontroller bestått. Isolert PGlite med eksisterende migreringer, uten produksjonsskrivinger.
- `expo export --platform all`: bestått for web og Hermes-pakker til Android/iOS etter siste kodeendring. Dette er ikke et native installasjonsbygg eller fysisk enhetstest. Jest og eksport måtte kjøres utenfor Windows-sandkassen på grunn av filtilgangsfeil; ingen tester ble fjernet eller nedjustert.
- Live `scripts/check-supabase.cjs`: Auth HTTP 200; e-post aktivert, registrering aktivert, bekreftelse påkrevd. Anonyme forespørsler med `limit=0` mot alle 11 tabeller returnerte HTTP 401. Ingen kundeposter ble hentet. Ett tilfeldig ugyldig innloggingsforsøk ble korrekt avvist på **234 ms**; dette måler ikke vellykket innlogging eller skjermens responstid.
- Skrivebeskyttet katalogspørring i dashboardet bekreftet 11 offentlige VYRO-tabeller med RLS. Ingen migrering ble kjørt. Tidligere utrulling gjennom SQL Editor kan forklare tom migreringshistorikk; tabellene finnes.
- Site URL er rettet fra localhost:3000 til `http://localhost:8081/account`. Eksakte callback-adresser `http://localhost:8081/auth/callback` og `vyro://auth/callback` er lagt til og bekreftet i UI. Se `evidence/supabase-auth-redirects-2026-10-23.jpg`.
- Egen SMTP er avslått. Supabase godtok én gjenopprettingsforespørsel til adressen brukeren oppga for e-posttest. Ingen passord ble endret, og ingen ny konto ble opprettet. Mottak og fullføring av lenken er ikke bekreftet.
- Expo er startet på nytt på localhost:8081 med Mapbox og Supabase. Brukeren bekreftet deretter vellykket innlogging med «Jeg kommer inn». Dette er brukerbekreftet live-test; ingen måling av samlet innloggingstid. Automatisk visuell localhost-test var blokkert av nettleserverktøyets URL-policy i denne auth-runden. Senere fikk skjermbilderunden tilgang, som beskrevet over.
- **Gjenstår:** ny bruker med bekreftelsesmail, gjenoppretting gjennom faktisk e-post, deling mellom to ekte kontoer, SMTP for andre mottakere og fysisk Android/iOS/GPS. Appen er ikke erklært ferdig for produksjonslansering.

## Kartfeil på ny PC, 23. oktober 2026

- Før rettingen manglet `mobile/.env.local` og `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN`. `hasMapbox` ble derfor false og viste tomtilstanden uten å starte Mapbox.
- Brukerens offentlige nøkkel er deretter lagt i `mobile/.env.local`, og Git-ignore er bekreftet. Skrivebeskyttet kontroll av Mapbox Standard-stilen returnerte HTTP 200 med `http://localhost:8081` som Origin og Referer. Nøkkelverdien er ikke skrevet i dokumentasjonen. Dette verifiserer tilgang til stilen, ikke selve kartgjengivelsen eller alle kartflisene.
- Expo er startet på nytt med `--clear`. Oppstartsloggen bekrefter at `.env.local` og `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN` er lastet, og serveren lytter på localhost:8081.
- To eksplisitte mellomrom direkte under `View` i kartskjermen er fjernet; disse forklarer React Native Web-varselet om en uventet tekstnode.
- Kartpanelenes faste hvite flater fikk tidligere hvit tekst ved mørkt app-tema. Karttekst og søkefelt bruker nå den lyse palettens tekstfarger, og den lyse tomtilstanden har eksplisitt kontrast. Resten av appens valgte tema beholdes.
- `npm run typecheck`, `npm run lint -- --no-cache`, `npm test -- --watch=false` og `npm run export:web`: bestått. 52 tester i 12 suiter. Metro gjenoppbygde en uleselig cache under eksporten; eksporten fullførte uten kodefeil.
- Ny visuell nettleserkontroll er ikke utført: localhost ble tidligere avvist av nettleserverktøyets URL-policy. Kontroller kartpaneler, søk og knapper i både lyst og mørkt tema etter omlasting. Kontroller også kartfliser med nøkkelen aktivert. Native kart og fysisk GPS er fortsatt utestet.

## Lokal fork-versjon, 23. oktober 2026

- Grunnlag: `ae17eedf9df65ff339a4989fc0ef87de18bcc7f0` i `Xamsesulub/Vyro`, tre commits etter tidligere lokal versjon. Ingen endring i `mobile/src`, `mobile/app.json` eller `mobile/package.json` sammenlignet med denne committen.
- Forkens låsefil manglet `@emnapi/core@1.11.3` og `@emnapi/runtime@1.11.3` for denne npm-versjonen. Låsefilen er synkronisert uten endring av eksisterende pakkeversjoner; npm oppdaterte også metadata.
- `npm ci --no-audit --no-fund`: bestått på Windows med Node.js 24.22.1 og npm 11.19.1. npm hoppet over ikke-godkjente installasjonsskript for `@parcel/watcher` og `unrs-resolver`; kontrollene nedenfor bestod. Ingen ny sikkerhetsaudit kjørt.
- `npm run typecheck`, `npm run lint -- --no-cache`, `npm test -- --watch=false`: bestått; 52 tester i 12 suiter.
- `npm run export:web`: bestått, inkludert Mapbox, konto, sosial feed og opptak i webpakken.
- Expo er startet fra denne prosjektmappen med `npm run web -- --localhost --port 8081 --clear`, uten `CI`, og rapporterer `Waiting on http://localhost:8081`. Serveren er beholdt kjørende for lokal forhåndsvisning.
- Nettleserverktøyets URL-policy blokkerte visuell kontroll av localhost. Det er derfor ikke utført en ny visuell nettlesertest i denne runden.
- Ved innhenting manglet `mobile/.env.local`. Mapbox og Supabase er senere konfigurert; se nyere kontroller ovenfor. Live deling mellom to kontoer er fortsatt ikke verifisert på denne maskinen.
- Ingen produksjonsmigrering, nye kontoer, ekte GPS-opptak eller opplastinger utført. Fysiske native kontroller er fortsatt utestet.

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

## Historisk lokal oppstart 23. oktober 2026 – før fork-oppdatering

Denne kontrollen gjaldt den eldre committen `9b1a569`, før de tre nyere commitene ble hentet fra forken.

- Rettet `package-lock.json`, som manglet `expo-location@58.0.18`, `@emnapi/core@1.11.3` og `@emnapi/runtime@1.11.3`. `package.json` og eksisterende låste pakkeversjoner er uendret. npm oppdaterte også avhengighetsmetadata i låsefilen.
- Ren installasjon med `npm ci --no-audit --no-fund`: bestått på Windows med Node.js 24.22.1 og npm 11.19.1. Ingen ny sikkerhetsaudit ble kjørt.
- Typecheck og ESLint: bestått.
- Jest: 3 suites / 19 tester bestått. Første forsøk ble blokkert av sandkassens tilgang til Temp; samme tester bestod utenfor sandkassen.
- Web-eksport: bestått.
- `npm run web -- --localhost --port 8081`: startet. Onboarding-skjermen ble bekreftet i nettleseren på `http://localhost:8081/onboarding`. Testserveren brukte `CI=1`; vanlig oppstart i VS Code skal ikke sette denne variabelen, slik at automatisk oppdatering er aktiv.
- Denne kontrollen gjelder installasjon og oppstart. Ingen ny fysisk GPS-, native kart- eller tilgjengelighetstest er utført.
