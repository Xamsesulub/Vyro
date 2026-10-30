# Testing

## Klubbsoner og eiernåler — 30. oktober 2026

- Ekstra simulering før brukerens egen push: **58 klubbkontroller + 35 sonekontroller + 30 app-tester i fem suiter** består på nytt, sammen med typecheck og lint. Simuleringen bruker 20 fiktive medlemmer, etterfølgende eierskifter, resultatlisten, forsøk fra feil klubb, utmelding, blokkering, gjentatt innsending og avvisning av simulerte økter. Ingen produksjonsskriving eller Git-push. Dette er fortsatt en funksjonstest, ikke en måling av 20 samtidige brukere eller en fysisk iPhone-test.
- Typecheck, lint og samlet Expo-eksport for iOS og web består. De eksporterte pakkene og refererte iOS-ressursene er kontrollert. Dette er ikke et signert iPhone-bygg.
- Hele Jest-pakken: **547 tester i 86 suiter** består. Nye tester dekker kartvalg og detaljlenker, korrekt klubb ved innsending, resultater med null soner, klubbbytte med sene svar, tap av medlemskap, tomtilstand, kontoavbrudd og løypegeometri. De eksisterende publiserings- og karttestene består.
- Hele databasepakken: **680 kontroller** består. Av disse er 58 nye klubbkontroller: 20 syntetiske medlemmer, eierskifter, rangering og like resultater, eldre eierprivate soner, ingen direkte skriver, avviste innsendelser fra feil klubb, gammel RPC stengt, idempotens på tvers av klubber, utmelding/gjeninnmelding, blokkering og sideinndeling. Dette er funksjons- og tilgangstester i isolert PGlite, ikke en test med 20 samtidige nettverkstilkoblinger.
- Supabase: `202610300001_club_turfs.sql` er aktiv. Skrivebeskyttet etterkontroll bekrefter klubbkolonnen, tillatt autentisert klubbinnsending, stengt gammel innsending, avvist anonym kartlesing og RLS på kart/resultatfunksjonene. Ingen soner fantes før overgangen; antallet er fortsatt null. Ingen ekte kontoer eller treningsdata er opprettet eller slettet av testene.
- Lokal nettleserkontroll bruker kun en isolert database og tydelig merkede fiktive medlemmer: kart med fire løypesoner, eierinitialer uten bilder, nålevalg, detaljer, retur, resultatliste med 20 medlemmer, bytte til en tom klubb og smal visning. Profilfoto bruker eksisterende privat bildelagring og signerte lenker. Apple Maps og bilder i native kartnåler er **ikke fysisk verifisert**.
- Siste eksport er visuelt kontrollert ved 320 og 393 piksler bredde: sonekortet legger handlingen på egen rad på den smale skjermen, kartkrediteringen er synlig over kortet, og kartnålene finnes som tilgjengelige knapper. Skjermbilde med fiktive testdata: `mobile/.expo/club-zones-verified.jpg`.
- Første samlede kjøring traff tidsgrenser i flere skjermtester mens andre verktøy kjørte. En separat kjøring avdekket manglende mock for den nye native kartgrenen i den gamle stedssøktesten; grenen er nå isolert i den testen. Hele pakken består med uendret standardtidsgrense, uten feilsøkingslogger eller fjernede testtilfeller.

Før telefonleveranse: lag et nytt signert testbygg; kontroller profilbilder/initialer og trykk på Apple-kartnåler, liten skjerm og stor tekst, bytt klubb, lag en sone fra en ekte godkjent løpetur, og utfordre den med en annen klubbkonto. Kontroller at et utenforstående medlem ikke kan lese sonen via lenke. GPS-opptak og eksisterende konkurransetoleranser er uendret. Skritt/rytme og verifisering av faktisk løping er ikke implementert. Ingen Git-push eller signert iPhone-bygg i denne leveransen.

## Kryptert backup, blokkering og kontosletting — 28. oktober 2026

- Siste samlede kjøring: **539 tester i 84 Jest-suiter**, typecheck og lint består. AES-testene bruker ekte autentisert kryptering via Node-adapter til Expo-grensesnittet og kontrollerer feil kode, manipulert innhold, feil eier/økt/nøkkel og ulike noncer. De er ikke en native kryptografitest.
- Backup-tester dekker samtidig oppretting, feil gjenopprettingskode, kontobytte, lesetilbakekontroll, JSONB-feltrekkefølge, gammel kopi på en annen telefon, avbrudd og manglende dekrypteringsnøkkel. Sletting av klartekst krever verifisert ny kopi.
- Hele databasekjeden består: **621 kontroller**. Av disse dekker 41 gjensidig blokkering, direkte tabelltilgang/RPC, ventende pushjobber, rapporttilgang, eierisolasjon, nylig innlogging, kontoslettevern og kaskader. Tre ekstra kontroller dekker en fersk database uten den gamle backup-tabellen. Alt kjører isolert i PGlite uten produksjonsskriving.
- Edge- og klienttester dekker manglende innlogging, ugyldig bekreftelse, avvikende eier/sti, delvis lagringsfeil, ny innlogging, aktiv økt og kontobytte. Klienttesten bekrefter at annen kontos lokale økter beholdes. Ingen ekte brukerkonto er slettet.
- Isolert nettlesertest med fiktiv konto og én syntetisk økt: aktivering, ny tilfeldig kode, bekreftelse, kryptering, opplasting, verifisert kvittering og null ventende økter. Koden skjules etter bekreftelse. Skjermbilde: `mobile/.expo/encrypted-backup-verified.png`. Testen bruker lokalt API og sender ikke testdata til Supabase. Testserveren er stoppet etter kontrollen.
- iOS-JavaScript-eksport og web-eksport består. Dette er ikke et Xcode-/EAS-bygg. Avhengighetstestene kontrollerer prototypeangrep, vanlig fletting og Expo CLI-kompatibilitet etter installasjonsrettelsen.
- Produksjon: tre nye migreringer og `delete-account` aktivert. Metadata bekrefter seks RLS-tabeller, ni blokkeringspolicies, 32 skrivevern-triggere, to Storage-vern og avviste klientrettigheter. Uinnlogget sletting gir 401. Passordkrav og ekstra passordbyttevern er kontrollert visuelt. [Sanitert resultat](evidence/security-hardening-2026-10-28.json).

Fysisk akseptanse gjenstår på et nytt iPhone-bygg: aktiver backup og lagre koden; gjenopprett på en separat testinstallasjon med samme testkonto; prøv feil kode og kontobytte; test blokker/opphev/rapporter mellom to testkontoer, inklusive varsler; slett bare en uttrykkelig disponibel testkonto etter ny innlogging og kontroller bilder, lokale data og avviste videre skriver. Ikke avinstaller en telefon med eneste kopi av ekte økter for å utføre testen. Ingen fysisk iOS-/Watch-verifisering, full driftsgjenoppretting eller uavhengig penetrasjonstest er utført.

## GPS-fart og lengdemeny — 28. oktober 2026

- Hele Jest-pakken: **510 tester i 79 suiter** består. 89 målrettede tester omfatter GPS, native/web-inndata, bakgrunnsopptak, idrettsmålinger, kart og lengdemeny.
- Syntetisk GPS-replay ved ca. 80 km/t beholder 91 av 91 målte punkter i ett segment og korrekt geometrisk distanse. Et bakgrunnsreplay med omvendt batchrekkefølge og overlappende foregrunnspunkt sorteres og telles uten duplikater. Dette er testdata, ikke en fysisk busstur.
- Null, negativ, manglende, uendelig og avvikende fart kan ikke overstyre det gamle hoppfilteret. Upresise koordinater, stillstand, ugyldige tidsstempler og signalbrudd testes fortsatt. Native fart brukes aldri til å beregne ekstra distanse. Eksisterende pause-, låseskjerm-, sone- og klokketester består.
- Brukerens Fotball-måling er korrekt: 425 sekunder / 0,66 km gir 5,6 km/t; samme tall for Løping vises som 10:43 min/km. Ingen endring i beregningen. [Stravas egen forklaring](https://support.strava.com/en-us/articles/15401804-moving-time-speed-and-pace-calculations) beskriver at GPS-distanse, tid og pausebehandling kan gi forskjellige gjennomsnitt. Uten rådata fra begge opptak kan ikke hele avviket på bussturen fastslås.
- Lokal, isolert visuell test ved 393 × 852 og 320 × 568: alle menyvalg får plass. Valg av 3–10 km skjuler den korte testruten; Alle lengder viser den igjen. Ingen ekte konto eller treningsdata brukes.
- Etter siste menyjustering består typecheck, lint, web-eksport og begge kart-UI-suitene (7 tester). Stedssøket åpner også etter at lengdemenyen lukkes. Skjermbilde: `mobile/.expo/map-length-menu-verified.png`.
- En eksisterende stedssøktest nådde tidsgrensen i enkelte kjøringer. Hele pakken og en ny kjøring av begge kart-UI-suitene bestod med den opprinnelige tidsgrensen og uten feilsøkingskode. Den varierende testtiden er ikke forklart; ingen testkrav er svekket.
- [Preview 14](https://expo.dev/accounts/xamse10/projects/vyro/builds/d92f8d6b-17cc-4eb0-b951-c0d0f418a538), versjon 0.1.0 (14), er **FINISHED** 28. oktober kl. 20:34:40 UTC med installasjonsfil. Eksisterende signering for iPhone, widget og Watch er brukt. Den isolerte testserveren er stoppet. Ingen databaseendring eller Git-push utført.

Fysisk akseptanse gjenstår: Installer preview 14 og sammenlign samtidig tur med samme idrett, start/slutt og pauser. Kontroller gang/løping, stopp, inn/ut av bakgrunn og låst skjerm. Rask bevegelse skal beholde faktiske punkter når GPS-farten bekrefter dem; dårlig signal skal fortsatt gi avbrudd uten oppdiktede veilinjer. Sjekk lengdemeny på iPhone, lukking uten valg og uendret kartkamera.

## Feedkart, kommentarpanel og 200-meterssoner — 28. oktober 2026

- Hele Jest-pakken består: **494 tester i 77 suiter**. Typecheck og lint består. Etter siste justering av kommentarlistens rulleflate består også 10 målrettede UI-tester.
- Isolert nettlesertest ved 393 × 852 og 320 × 540 viser automatisk kart, skjult systemnavn, eget kommentarpanel, bevart flerliniers utkast etter lukking, sending og lesbar kommentar. Etter sending blir skrivefeltet kompakt igjen. Bekreftet sletting fjernet bare egen syntetisk kommentar. Dette tester responsiv layout; det erstatter ikke en fysisk iOS-tastaturtest. Skjermbilde: `mobile/.expo/comments-panel-verified.png`. Den isolerte testserveren er stoppet.
- 32 målrettede tester i seks suiter består: automatisk kartinnlasting, feil/nytt forsøk, fotballkart, innlegg uten GPS, skjulte systemnavn, kommentarutkast, sendefeil, dobbeltrykk, kontobytte, sletting av egne kommentarer og sonepublisering.
- En syntetisk, sammenhengende løpetur på 650 meter får et gyldig soneutsnitt med 200 meter skjerming rundt begge ender. Opplastingen inneholder bare det godkjente utsnittet. Returer gjennom skjermede områder, avbrudd, gamle spor og simuleringer testes fortsatt. Lengde alene garanterer ikke at en virkelig tur har et gyldig utsnitt.
- 35 PostgreSQL-kontroller av sonefunksjonen består i isolert PGlite. Ingen databaseendring eller testinnlegg/soner i produksjon.
- Fysisk iPhone-kontroll gjenstår: åpne Kommentarer, skriv flere linjer med tastaturet oppe, send, lukk/åpne og slett egen kommentar. Kontroller også en faktisk kort løpetur i Legg ut sone. Native tastatur og Apple-kart kan ikke ferdigverifiseres på Windows.
- [Preview 13](https://expo.dev/accounts/xamse10/projects/vyro/builds/0613e411-ae29-47a3-8199-b4c266ef9103), versjon 0.1.0 (13), er **FINISHED** 28. oktober kl. 18:26:21 UTC, med installasjonsfil bekreftet av EAS. Eksisterende iPhone/widget/Watch-signering er brukt. Ingen Git-push utført.

## Øktdeling: 200 meter rundt start og slutt — 28. oktober 2026

- Typecheck og lint består. 33 tester i seks suiter består: route-privacy, cloud-social, football-analysis, football-ui, turf-publishing og route-contribution.
- Nye regresjonstester kontrollerer en syntetisk 650-meters tur: kartdeling er mulig, ingen delte punkter ligger innen 200 meter fra endepunktene, og full distanse (0,65 km), tid (439 sekunder) og lokal original bevares. Retur inn i skjermede områder og linjer gjennom dem gir brudd. En liten rundtur helt innenfor 200 meter gir fortsatt ingen delbar rute.
- Eksplisitt deling av hele fotballbanen krever fortsatt nytt samtykke per økt. Rutebibliotekets og sonekonkurransenes separate 500-metersregler består eksisterende tester. Ingen databaseendring eller Git-push er utført.
- Fysisk iPhone-kontroll gjenstår: åpne Del en økt, velg kort tur, kontroller 200-metersforklaringen og kartet før eventuell publisering. Lengde alene garanterer ikke et synlig segment; rutens geometri avgjør.
- [Preview 12](https://expo.dev/accounts/xamse10/projects/vyro/builds/cb411020-0ccf-4576-9eb8-dbd00ad2b184), versjon 0.1.0 (12), er **FINISHED** i EAS 28. oktober kl. 17:15:28 UTC. Eksisterende iPhone/widget/Watch-signering er brukt. Den ferdige installasjonslenken er levert; fysisk installasjon og deling med 200-metersskjerming er ikke verifisert her.

## Innleggsvarsler og separate kategorier — 28. oktober 2026

- Typecheck og lint består. Hele Jest-pakken bestod med **477 tester i 74 suiter**. Etter sluttjustering av kommentarinnlasting bestod 20 målrettede tester; fem ekstra tester av selve push-observeren består: riktig kommentarinnlegg, annen mottaker, kontobytte under oppslag, slettet kilde og nettverksfeil med tilbakefall til varsellisten. Totalt 482 tester i 75 suiter er kjørt med bestått resultat, fordelt på full og målrettede kjøringer.
- Hele `npm run test:database` består: **577 PostgreSQL/RLS-kontroller**, inkludert 68 nye kontroller av kategorivalg, separate kanaler, mottakerisolasjon, egne reaksjoner, repetisjonsgrenser, private kontoer, opphevet følging, slettede kilder, køvalg og autorisert varselmål. Kun isolert PGlite med syntetiske kontoer; ingen testinnlegg i produksjon. Eldre databasefixtures er oppdatert med `auth.sessions` for å kunne teste gjeldende push-triggere.
- Web-eksport til `.expo/post-notifications-ui-final` består. Isolert UI-test ved 393 og 320 pikslers mobilbredde bekrefter at kommentarvarsel åpner riktig innlegg med synlige kommentarer, nytt-innlegg-varsel åpner kilden, og lest-status oppdateres. Kommentar-push av og nye-innlegg-push på ble lagret uavhengig og beholdt etter omlasting. Ingen tekstoverlapp i kontrollert visning. Lokalt skjermbilde: `mobile/.expo/notice-settings-320.png`.
- Migrering 004 og varselarbeider er aktivert. Lesende produksjonskontroll bekrefter preferansetabell med RLS, mål-RPC, fire hendelsestriggere og aktiv minuttplan. Ingen ventende jobber ved etterkontroll. Autorisert test via Vault/pg_net ga HTTP 200 med 0 behandlede jobber; ingen testmelding sendt. Ingen eksisterende treningsdata slettet og ingen hemmeligheter lagt i appen.
- [Preview 11](https://expo.dev/accounts/xamse10/projects/vyro/builds/d1bab756-150f-4de6-96c5-bc0936708e89) er **FINISHED** 28. oktober kl. 16:51:13 UTC, versjon 0.1.0 (11). Den lokale testserveren er stoppet. Ingen Git-push er utført. Fysisk Apple/APNs-levering og navigasjon fra låst/lukket app er **ikke verifisert** her.

Fysisk akseptanse: Installer preview 11 over VYRO, aktiver «Varsler på telefonen» og tillat iOS-varsler. La en annen konto kommentere og like et delt innlegg. Kontroller varselliste, låseskjerm og åpning av kommentarene. Slå «Nye innlegg → På telefonen» på og publiser fra en fulgt konto. Prøv også kategori av, privat konto uten godkjent følger, slettet innlegg og utlogging/kontobytte. Nye varsler kan ta omtrent ett minutt før serverens planlagte levering, i tillegg til APNs/Fokus-forsinkelser.

## Sosiale varsler, private kontoer og avatar — 28. oktober 2026

- Typecheck og lint består. Hele Jest-pakken: **465 tester i 72 suiter** består. Push-testene dekker avvist tillatelse, kontobytte, opt-out under pågående registrering, feil uten falsk suksess, navigasjon bare til egen varselliste, generisk innhold, Expo-billetter/kvitteringer, ugyldige enheter og begrensede retry-forløp.
- `node scripts/test-social-profiles.cjs`: **35 PostgreSQL/RLS-kontroller** består med alle migreringer. Kontrollerer privat/offentlig posttilgang, følgeforespørsel/godkjenning/avslag, mottakerisolasjon, varselrettigheter, avatar-eierskap/lagring samt push-kø, leasing, opt-out og utløpt Auth-sesjon. Ingen ekte bruker eller økt opprettet.
- Produksjon: nye migreringer og worker er aktivert. Direkte worker-test ga 401 uten gyldig autorisasjon og 200 / 0 jobber med riktig autorisasjon. Minuttplan er aktiv, profilbildebucket er privat. Hemmeligheten er serverlagret, aldri i appen.
- Apple Push Key er tilknyttet VYRO i Expo. Dette bekrefter oppsett, ikke at et varsel har nådd fysisk iPhone.
- Web- og iOS-eksport består. Isolert UI-kontroll ved 320/393 pikslers mobilbredde bekrefter følgeforespørsel → godkjenn, varselliste, privat/offentlig-bryter og profilbilde: velg → last opp → vis → fjern. Både database og bildefiler var lokale testdata. Fysisk fotobeskjæring, tillatelsesdialog, varsler i lukket app og trykk på låseskjermvarsel gjenstår.
- [Preview 10](https://expo.dev/accounts/xamse10/projects/vyro/builds/fdb03517-de8d-4dde-830e-773c39495c85) er **FINISHED** 28. oktober kl. 15:48:50 UTC, versjon 0.1.0 (10). EAS bekreftet Push Notifications, oppdatert iPhone-provisionering og eksisterende widget/Watch-signering. Ingen Git-push utført.

Fysisk test i nytt bygg: tillat Sosiale varsler, lås telefonen og følg kontoen fra en annen konto. Kontroller både låseskjerm og varselliste; bytt til privat, send og godkjenn en forespørsel. Slå varsler av/på, logg ut/bytt konto og sjekk at andre kontoers varsler ikke åpnes. Velg/fjern profilbilde og kontroller etter omstart. En 650-meters tur uten punkter utenfor skjermingssonene skal fortsatt avvises ved kartdeling og beholdes privat.

## Fotballtall og forkast uten lagring — 28. oktober 2026

Typecheck og lint består. Målrettet Jest-kjøring består med **52 tester i tre suiter** (`workout-summary`, `sports-recording`, `football-analysis`). De fem nye regresjonstestene dekker hele tids-/distanseverdier fra brukerens eksempler (`00:11 / 0,01 km` og `10:47 / 0,32 km`), bekreft/avbryt forkasting i faste handlinger, forkasting når lagring er deaktivert og bevaring av opprinnelige målinger ved privat lagring. Dette er en visningsretting; ingen endring i GPS-beregninger eller lagrede data.

Web-eksport til `.expo/summary-web` består. Isolert lokal test med syntetisk fotballopptak kontrollerte 393 og 320 pikslers bredde: tallene er hele og forklaringen står separat. Forkast → Behold → Forkast → Bekreft gikk tilbake til Tren uten å lagre. Lagret aktivitet viste `10:47` og `0,32` uten loddrett tekst. Testkonto og økter finnes bare i den isolerte testen. Webkartet viste leverandørbegrensning under testen; kartfliser/Apple MapKit ble derfor ikke verifisert av denne UI-kontrollen.

Fysisk retest i nytt iPhone-bygg gjenstår: åpne den eksisterende fotballøkten og kontroller tallene; fullfør et nytt opptak og prøv først Behold, deretter Forkast uten lagring. Prøv også større tekst i iOS. Nøyaktighet for tid, GPS-distanse og maksfart under faktisk aktivitet kan ikke fastslås fra skjermbildene alene.

[Preview 9](https://expo.dev/accounts/xamse10/projects/vyro/builds/426edc63-8a68-4122-9ad8-06a3f48dc3ea) er **FINISHED** 28. oktober kl. 14:26:11 UTC, versjon 0.1.0 (9), med eksisterende signering for iPhone/widget/Watch. Testserveren er stoppet og ingen testdata er sendt til produksjon. Ingen databaseendring eller Git-push er utført.

## Tren, idrettskatalog og øktlagring — 28. oktober 2026

Typecheck og lint består. Hele Jest-pakken består: **447 tester i 69 suiter**. De nye testene dekker alle 36 idretter, valg av GPS/tidtaking, start/pause/lagring, eierskap, kontobytte, treningsmål, privat sikkerhetskopi og den faktiske idrettsvelgeren. Start-komponenten testes med idrettsvalg, Start, rute og innstillingslenke uten de to bryterne.

Databasetestene kjører mot isolert PGlite. 108 nye kontroller dekker de 36 idrettene, privat lagring og publisering av tidtaking uten rute/distanse. Regresjon for generell database, turf, feed/personvern, sikkerhetskopi, klubber/bilder, brukerdelte løyper, profilreparasjon og fotball består. Produksjonsmigrering `202610280001_workout_sports.sql` er kjørt etter brukerens autorisasjon. Lesende etterkontroll bekrefter Yoga/Rulleski, målingskravet og fortsatt aktiv RLS på aktiviteter.

Expo Widgets sin faktiske serialisering er kontrollert i åtte tilstander, inkludert tidtaking og sykkelfart. Native GPS og ActivityKit bruker testadaptere i regresjonstestene; dette erstatter ikke fysisk testing. Web-eksport til `.expo/sports-web` består. Isolert nettlesertest med fiktiv testkonto gjennomførte søk etter Yoga, Start, Pause, Fullfør, økttype, anstrengelse, privat notat og lagring. Aktiviteten beholdt tid og private detaljer etter gjenåpning. Ingen testøkt ble lagt i produksjonsdatabasen. Start og idrettsliste kontrolleres også ved 393 pikslers bredde.

Fysisk akseptanse i nytt iPhone-bygg gjenstår:
1. Åpne tannhjulet fra Tren og slå på bakgrunnsopptak og låseskjermvisning. Tilbake viser stort kart og Start uten bryterne.
2. Velg Løping eller Fotball, start med posisjonstillatelse, gå ute og lås skjermen. Kontroller tid/distanse, lås opp igjen og prøv Pause/Fortsett. Gjenta visningsbryter av/på i innstillingene.
3. Velg Yoga eller Styrketrening. Start uten posisjonsforespørsel, lås skjermen og kontroller løpende tid. Pause skal stoppe tiden; lagringen skal være uten kart/distanse.
4. Lagre økttype, anstrengelse og et privat notat. Del eventuelt økten uttrykkelig, og kontroller på en annen konto at notat/anstrengelse ikke vises. Apple Watch og basseng-/utendørs bruk er ikke fysisk verifisert her.

[Signert preview 8](https://expo.dev/accounts/xamse10/projects/vyro/builds/f438c71e-8a2b-4e4e-904a-712747a8af3d) er **FINISHED** 28. oktober kl. 12:25:51 UTC, versjon 0.1.0 (8), med iPhone/widget/Watch. En ekstra isolert UI-testkjøring traff standardgrensen på fem sekunder under oppstart; samme tre tester består med 15 sekunders testgrense. Ingen forventninger eller produksjonskode ble svekket. Ingen Git-push er utført.

## Regresjon: Start med bakgrunnsopptak på — 27. oktober 2026

Typecheck og lint uten cache består. Full Jest-kjøring: **404 tester i 67 suiter bestått**. [Signert preview 7](https://expo.dev/accounts/xamse10/projects/vyro/builds/667d8a24-3308-4843-bf22-ac766f8c328e) er **FINISHED** 27. oktober 2026 kl. 18:10:49 UTC, versjon 0.1.0 (7). Installer over eksisterende VYRO. Fysisk retest er fortsatt ikke utført. Ingen Git-push eller databaseendring er gjort.

Brukerens skjermbilde viser at preview 6 avviser Start på grunn av kravet «Alltid». Dette var strengere enn iOS-flyten vi faktisk bruker. Kontrollert mot installert expo-location 58.0.18: `LocationModule.swift/startLocationUpdatesAsync` krever foreground permission, og `TaskConsumers/EXLocationTaskConsumer.m` aktiverer `allowsBackgroundLocationUpdates` og starter kontinuerlige oppdateringer. Appkonfigurasjonen har `isIosBackgroundLocationEnabled: true` og `showsBackgroundLocationIndicator: true` brukes ved oppstart. [Apples dokumentasjon](https://developer.apple.com/documentation/corelocation/cllocationmanager/allowsbackgroundlocationupdates) beskriver hvordan foreground-startede oppdateringer fortsetter med When In Use-autorisasjon.

Regresjon dekker iOS When In Use med Always avslått, Start/pause/Fortsett, tillatelsesdialog som gjør appen inactive, låsing mens native registrering fullføres (både suksess og feil), manglende tjeneste/tillatelse etter retur, Android-avslag, utlogging/kontobytte og Expo Go. En integrasjonstest kobler Start, bakgrunns-GPS, app-livssyklus og Live Activity-observer: GPS-batcher ved låst skjerm oppdaterer både privat opptak og visningen av tid/distanse. ActivityKit og Core Location er testadaptere, ikke en fysisk iPhone. Foreground-venting har tidsavbrudd, fjerner lytteren og starter ikke senere av seg selv.

Fysisk akseptanse i nytt bygg (ikke utført her):
1. Velg VYRO → Posisjon → «Når appen er i bruk» med Presis posisjon. Behold «Fortsett med låst skjerm» på; slå også på «Vis tid og km på låseskjermen».
2. Trykk Start; vent til Pause vises og lås iPhonen. Gå ute i minst to minutter: tid skal løpe og kilometer følge GPS-bevegelsen.
3. Lås opp/lås igjen tre ganger. Kontroller at økten fortsetter og at tallene oppdateres. Prøv også rask låsing like etter Start.
4. Slå bare visningsbryteren av/på under økten. GPS/rute/tid skal beholdes, og visningen skal komme tilbake. Pause skal stoppe tiden; Fortsett skal starte et nytt rutesegment; avslutt skal fjerne visningen.
5. Før neste økt: slå bakgrunn av/på; visningsvalget huskes. Med bakgrunn av skal låsing pause. Kontroller avvist posisjon, Liveaktiviteter av i iOS og ny oppstart etter innstillingsendring.

## Regresjon: bryteren for låseskjerm — 27. oktober 2026

Feilen ble gjenskapt med brukerens av/på-rekkefølge i innstillingene: bakgrunnsbryteren slettet kartpreferansen. Før rettingen feilet fire relevante forventninger; etter rettingen består 37 tester i seks suiter for bakgrunnsopptak, innstillinger, Live Activity og Expo Go.

- Faktisk innstillingskomponent, Zustand-lagring og Live Activity-kontroller testes sammen, med native ActivityKit/MapKit erstattet av testadaptere. Av/på husker kartvalget også etter rehydrering; et uttrykkelig avslått kart forblir av. Bakgrunn av hindrer visningen selv om kartvalget er husket.
- Tre av/på-runder under en økt avslutter/gjenoppretter én visning uten å endre opptak/rute/bakgrunnsstatus. Raskt på før forrige visning er ferdig avsluttet gir bare én ny visning. Pauset økt kan vises etter et uttrykkelig trykk, men blir ikke gjenopptatt. Kald innlasting av lagrede valg starter ikke en gammel visning. Eksisterende konto-/utloggingsvern og pause/stopp er bevart.
- Fysisk retest i ny preview: Installer over eksisterende VYRO. Slå på «Vis kart og økttall» én gang dersom den gamle versjonen allerede slo dette av. Før start: slå «Fortsett med låst skjerm» av/på og kontroller at kartvalget kommer tilbake. Start en økt og lås opp/lås skjermen flere ganger. Mens økten pågår: slå «Vis kart og økttall» av/på, lås igjen og sjekk kart/tall. Gjenta ved pause og avslutt til slutt; låseskjermvisningen skal da fjernes. PC-testene bekrefter ikke fysisk ActivityKit eller GPS på iPhone.

Typecheck og lint består. [Preview 6](https://expo.dev/accounts/xamse10/projects/vyro/builds/cca8a0f1-59be-4c2b-8f42-dcbf9a37119c) er FINISHED kl. 17:17:22 UTC, versjon 0.1.0 (6), med eksisterende signering for iPhone/widget/Watch. Brukerens siste presisering gjelder tid og kilometer i øktvisningen på låseskjermen. Det er samme Live Activity som styres av «Vis kart og økttall». Fysisk retest av av/på og tallene gjenstår. Ingen Git-push eller databaseendring er gjort for denne rettingen.

## Fotballanalyse — 27. oktober 2026

Typecheck og lint består. Samlet Jest-kontroll: 391 tester i 66 suiter består (full kjøring ga 386 bestått og fire feil i webkartets testadapter; adapteren ble utvidet med de nye kartmetodene, og alle sju webkarttester, inkludert ny varmekarttest, bestod deretter). Ingen produksjonskode ble endret for å skjule testfeil. iOS/Hermes-eksport består i .expo/football-ios-check. [Signert preview 5](https://expo.dev/accounts/xamse10/projects/vyro/builds/83036035-512b-4335-b928-63486ad90281) er FINISHED kl. 15:15:53 UTC, versjon 0.1.0 (5). iPhone, widget og Watch er bygget med eksisterende signering. Fysisk akseptanse på banen og faktisk MapKit-overlegg er fortsatt utestet.

- Testet avstandsuniformt varmekart, gyldig PNG med flere DEFLATE-blokker, gjennomsiktige kanter, geografiske grenser, pauser/personverngap og tom/ugyldig rute. PNG-en er i tillegg dekodet med Sharp og visuelt kontrollert med syntetiske testdata utenfor appen. Ingen testøkt er lagt i brukerens historikk eller database.
- Testet femsekunders fartsvindu, dårlig nøyaktighet, GPS-hopp, stillstand, feil rekkefølge og tidsavbrudd. Telefonlagring og Watch-import beregner valgfri maksfart; rå GPS-bevis følger ikke privat sikkerhetskopi eller sosiale innlegg.
- UI-tester: Rute/Varmekart bevarer geometri og kartinstans; native og web bytter tegning uten nytt kamerautsitt. Deling krever nytt samtykke for hver valgt fotballøkt. Feed laster kart og maksfart først ved åpning, gjennom eksisterende tilgangsregler.
- PGlite: 22 nye fotballkontroller, 35 private backupkontroller og 126 feed-/personvernkontroller består. Eierskap, følgerpublikum, anonym avvisning, ugyldig fart, simulering og privat rådata testes. Migrering 202610270003_football_analysis.sql er aktiv; lesende etterkontroll bekrefter ny funksjon/kolonne og ingen anonym publisering.

Fysisk test i nytt preview: velg Fotball, start GPS ute med telefonen på kroppen, beveg deg flere ganger gjennom samme område, pause, fortsett og lagre. Bytt Rute/Varmekart og kontroller banen, kartets attribusjon, zoom, mørk modus og manglende målinger. Test deling med to kontoer: skjerming er på som standard; hele ruten vises bare etter bevisst valg og bare for valgt publikum. Bekreft at ny økt krever nytt samtykke. Nøyaktighet under kamp, faktisk MapKit-bildeoverlegg, GPS med låst skjerm og Watch-maskinvare krever fysisk test. Se [fotball](football.md).

## Brukeropprydding, fotball, varsler og Live Activity — 27. oktober 2026

[Signert preview 4](https://expo.dev/accounts/xamse10/projects/vyro/builds/b08a7d49-f1ed-42e0-831c-b5679b652675) er `FINISHED` kl. 12:27 UTC, versjon `0.1.0` (4). EAS bygget iPhone, widget og Watch med eksisterende signering. Bygg 3 ble avbrutt og erstattet for å få med den siste varselrettingen. Dette er en byggebekreftelse; fysisk installasjon og akseptanse for denne versjonen er fortsatt utestet.

- Typecheck og lint består. 373 Jest-tester i 63 suiter består, i tillegg til den nye hooktesten for faktisk GPS-filter/kontobytte/utlogging og én ekstra test for GPS-oppdatering mens tale åpnes (totalt 375 tester i 64 suiter). Siste målrettede kjøring består alle 11 tester for varsler, klokketilkobling og synlig historikk. Regresjonen som forventet synlige gjestesimuleringer er oppdatert til den nye produktregelen.
- Testet at gammel aktiv simulering nullstilles til tom GPS, at eksisterende private treningsdata bevares, og at både simulering/eksempel/annen konto holdes ute av brukerhistorikken. Ingen falske økter er konvertert til GPS.
- Flere idretter med Fotball: metadata-validering, duplikater, tomt valg, alle valg og tilbakekompatibel `main_sport`. Watch-import godtar en ekte fotball-GPS-økt privat. 35 PGlite-kontroller består for sikkerhetskopi, idempotens, tilgangsregler, fotballpublisering og fortsatt avvisning av simulering. Migrering `202610270002_football.sql` er kjørt i VYRO; lesende etterkontroll viser Fotball aktivert i både aktivitetsbegrensningen og sikkerhetskopivalideringen.
- Tale/haptikk: testet adapterkall, nb-NO, ett varsel per kilometer, av/simulering uten varsler, stopp ved pause, ingen ventende tale fra en tidligere økt og synlig feil. Prøvevarsler endrer ikke treningsdata. Manglende Watch/Watch-app forsøker ikke overføring; installert, paret klokke kan fortsatt hente køen selv om den ikke er direkte tilgjengelig.
- Live Activity-modellen testes fortsatt for pause/resume, stale/timeout, kontobytte, personvern og rydding. Før 100 meter vises «—» for tempo. UI har eksplisitt mørk bakgrunn/lyse tall, enlinjes tall med skalering og 330×60 MapKit-bilde med bevart attribusjon. **Utseendet i SwiftUI/ActivityKit er ikke fysisk verifisert i denne runden.**
- iOS/Hermes-eksport består (`.expo/user-cleanup-ios-final`). Første lokale forsøk ble blokkert av filtilgang i Windows' midlertidige mappe; kontrollen bestod med ordinær tilgang. Disse lokale artefaktene følger ikke Git/EAS.

Fysisk akseptanse i nytt installert preview: åpne Tren/Kart/Du og bekreft ingen testknapper eller Akerselva-eksempel; velg Løping + Fotball, lagre/gjenåpne, prøv Alle; velg Fotball for én virkelig økt og pause/lagre. Under Varsler og opptak: prøv tale med stillemodus av/volum på og vibrasjon med haptikk på/sparebluss av. Prøv deretter begge varseltypene i hver sin GPS-økt, også med låst skjerm. Kontroller Live Activity i lys/mørk bakgrunn, større tekst, paused/aktiv, Dynamic Island og etter avsluttet økt. Faktisk bakgrunnsvarsling, GPS, alltid-på-skjerm og Watch-sensorer kan ikke bekreftes med PC-tester. Se [klokketest uten klokke](apple-watch.md).

## Signert iPhone-preview 2, 27. oktober 2026

- [EAS-bygg 2](https://expo.dev/accounts/xamse10/projects/vyro/builds/d9452963-8f34-439b-8325-a983297e6630) er `FINISHED` kl. 11:30 UTC, versjon `0.1.0`, byggnummer `2`, med signert IPA. Det er bygget fra lokal arbeidskopi på `0821f86`, inkludert de ukommitterte rettingene for profildeling og gjentatte 2D/3D-bytter. EAS bruker eksisterende `preview`-miljø, app-ID `app.vyro.xamse10` og ad hoc-profiler for app, widget og Watch.
- TypeScript, Expo lint, `git diff --check` og kontrollen av preview-miljøet bestod før opplasting. De 52 målrettede Jest-testene og 8 databasekontrollene fra rettingen nedenfor gjelder samme appkode; de ble ikke kjørt om igjen bare for byggingen.
- Ny fysisk installasjon og retest er **ikke bekreftet**. Slå på iOS-utviklermodus, installer over eksisterende VYRO, og test beholdt innlogging, Del profil og gjentatte 2D/3D-bytter i alle karttyper. Ingen Git-push, TestFlight-innsending eller EAS Update ble utført.

## Faktisk delingsårsak og zoom ved gjentatte vinkelbytter, 27. oktober 2026

- Produksjonskontroll fant **2 Auth-kontoer, 0 profiler, 2 manglende profiler**. Lesetilgang/RLS og signup-trigger var på plass. Reparasjonen ble først prøvd i isolert PGlite med **8 kontroller**: gjenoppretting, kun offentlige felt, bevarte brukerendringer, idempotens, ny signup, autentisert lesing og avvist anonym lesing/klientinnsetting. Migrering `202610270001` ble deretter kjørt via Management API; etterkontroll: **2 kontoer, 2 profiler, 0 manglende**. Ingen konto, treningsøkt eller eksisterende profil ble slettet/overskrevet. Historisk årsak til manglende rader er ukjent.
- Brukeren bekreftet på fysisk telefon at **Del profil åpner delingsmenyen** etter profilreparasjonen. Delingsteksten bruker fortsatt ekte offentlig navn/brukernavn og søkeinstruksjon, uten oppdiktet profil-URL.
- **52 målrettede Jest-tester i 5 suiter**, TypeScript og Expo lint består. Karttestene inkluderer ti vinkelbytter i hver karttype med midlertidig native kameranullstilling mellom byttene, bevart avstand/retning/sentrum og respekt for etterfølgende brukerzoom. En separat geometrikontroll dekker 20 returer 0° → 55° → 0° og manuelt valgt 30°. Tidligere tester som krevde identisk vertikal høyde er korrigert til identisk kameraavstand, i tråd med MapKits skille mellom høyde og avstand.
- **Fysisk kartkontroll gjenstår:** Reload i Expo Go, zoom inn, bytt 3D/2D minst ti ganger i Standard/Satellitt/Hybrid; prøv også etter egen panorering/zoom. Testene modellerer kameraet og bekrefter ikke MapKits faktiske visning eller terreng på iPhone. Ingen push eller nytt signert bygg.

## Grå «Del profil»-knapp, 27. oktober 2026

- **24 tester i 3 suiter** (`profile`, `profile-details`, `auth-views`), TypeScript og Expo lint består lokalt. Dette er målrettede kontroller, ikke en ny full suite-kjøring.
- Gjenskapt at en avbrutt profilforespørsel fra en annen skjerm forkaster et gyldig, aktivt svar. Regresjonstesten feiler før rettingen. Lesere er nå uavhengige av hverandres avbrudd; et nyere fullført svar og lagrede profilendringer vinner fortsatt.
- Skjermtester dekker mislykket innlasting → trykkbar deling → vellykket ny innlasting, vedvarende nettfeil, sperring under deling, utlogging/lukking under innlasting, avbrutt deling, delingsfeil og kopieringsbekreftelse. Bare den offentlige profilen brukes.
- **Fysisk iPhone-retest gjenstår:** Reload i Expo Go, åpne Du og trykk Del profil. Kontroller at iOS-delingsarket åpnes, at avbryt tillater et nytt forsøk, og at nettfeil gir beskjed. Testene bruker en mock av systemdeling og beviser ikke at iOS-delingsarket er åpnet på telefonen. Ingen databaseendring, push eller nytt signert bygg.

## 2D/3D uten rutetilpasning som ekstra trinn, 27. oktober 2026

- En ny regresjon modellerer at MapKit nullstiller kameraet **etter** Reacts layout-effekt, fremfor under mockens render slik den tidligere testen gjorde. Den gamle implementasjonen i `eada135` feiler alle seks tilfeller (begge retninger i Standard/Satellitt/Hybrid); rettingen består dem. Kameratesten leser simulert faktisk sentrum, høyde, retning og vinkel, og krever ingen `fitToCoordinates` eller remontering. Den dekker både native regionhendelse og manglende hendelse.
- Alle **23 Apple-karttester** består. Ekstra kontroller bekrefter at nyere valg vinner, kontrollen stopper ved berøring/pinch/panorering/lukking og utløper etter 2,5 sekunder. Ingen sen kameralesing får flytte kartet etter at testen har lukket det. Kontrollene bruker en MapView-dobbel, **ikke** fysisk MapKit eller ekte kartfliser.
- Hele Jest-suiten består: **346 tester i 60 suiter**. Expo lint, TypeScript og Expo-eksport for iOS (Hermes) og web består. Eksporten brukte offentlige testverdier for Supabase; ingen faktisk innlogging eller serverendring ble utført. Ingen fysisk iPhone-test eller signert EAS-bygg er utført her.
- **Fysisk retest:** åpne siste kode i Expo Go, zoom inn manuelt og trykk én gang på «3D», deretter én gang på «2D», uten å trykke «Vis hele ruten» imellom. Prøv alle tre karttypene, åpnet/lukket rutepanel, raske bytter og panorering rett etter byttet. Gjenta under en GPS-økt. Hver knapp skal alene gi riktig visning og bevare utsnittet. Nytt signert preview-bygg trengs bare for den installerte preview-appen; Expo Go/Metro bruker Reload. Denne runden starter ikke et EAS-bygg eller endrer native oppsett, nøkler eller database.

## 2D-zoom og diskret stedfelt, 26. oktober 2026

- Typecheck og Expo lint består. **16 karttester og 10 ruteflyttester** består. Første skjermtest overskred standardgrensen på 5 sekunder i to kjøringer; en diagnostisk kjøring med 30 sekunder per test bestod alle 10 uten kodeendring. Ingen test er hoppet over eller forventning svekket. `git diff --check` består. Eksisterende Expo Go-tunnel på port 8082 svarer med VYROs iOS-manifest.
- Brukerens fysiske test rapporterte uønsket utzooming ved 2D. Det tidligere kameraoppsettet leste etter native modusbytte. Ny rekkefølge leser før byttet og gjenoppretter sentrum/høyde/retning etter at egenskapene er oppdatert.
- Regresjonstestene simulerer at MapKit endrer høyden når karttype/vipping endres. De dekker tre bytter frem og tilbake i Standard/Satellitt/Hybrid og at native modus venter på kameraavlesningen. Eksisterende tester for sene svar, panorering, GPS-følging og paneltilpasning beholdes.
- Stedtesten dekker tomt felt for initialt «Nær meg», endring til skrevet sted, ny posisjonsforespørsel og søk med riktig koordinat uten å fylle hjelpeteksten inn som verdi.
- **Fysisk retest gjenstår:** last inn siste kode i Expo Go; zoom/panorer, bytt 3D → 2D gjentatte ganger i alle tre karttypene, og prøv under opptak. 2D skal bli flatt uten et nytt stort utsnitt. Test også «Nær meg» → skriv sted → velg sted → «Nær meg». Windows-testene simulerer native kamera og beviser ikke faktisk MapKit-rendering.

## Brukerdelte løyper, 26. oktober 2026

- Full Jest-kjøring: **332 tester i 60 suiter** bestod etter omleggingen. Etter siste tekst-/valideringsjustering og to ekstra personverntester bestod **22 rutetester i 4 suiter**. Typecheck og Expo lint består uten advarsler. Gamle leverandørtester er erstattet med tester for avviklet endepunkt og bidrag.
- Hele isolerte databasesuiten består: **354 kontroller**, inkludert **36 nye rutekontroller** mot de faktiske migreringene i PGlite. Dekker autentisering, RLS, skjulte lokale øktreferanser, kilde/samtykke, ugyldig/kort/brutt geometri, idempotens, lik/motsatt/sparsom/jitter-rute, flyttet start på rundtur, andre løyper i samme område, by-/lengdefiltrering, private gamle bokmerker og tilbaketrekking på tvers av kontoer. Transaksjonslåsen er implementert; samtidig skriving fra to separate produksjonsforbindelser er ikke lasttestet.
- UI-/API-tester bekrefter at bare egne GPS-turer tilbys, ingen deling skjer før samtykke, bare den skjermede geometrien sendes, private notater/tid blir igjen, duplikatfeil ikke utgir seg for suksess og tilbaketrekking bekreftes av serveren.
- iOS Hermes-eksport består i ignorert `mobile/.expo/community-validation`. Første forsøk ble stoppet av skrivetilgang til Expos midlertidige mappe; samme eksport bestod med nødvendig lokal tilgang. Ingen nye avhengigheter eller native innstillinger. Dette er **ikke** et nytt signert IPA-bygg eller fysisk iPhone-test.
- Migrering `202610260002_community_routes.sql` er aktivert med `db query --file` i eksisterende prosjekt. Automatisk godkjenning avviste først en destruktiv utgave; den ble ikke kjørt. Den reviderte utgaven bevarer eksisterende data. Serverkontroll bekrefter **0 community-ruter, alle 14 gamle ruter og 2 private bokmerker bevart**. Gamle forslag er skjult fra fellesskapssøk; genererings-RPC-er avviser kall, Edge returnerer 410, tre ORS-innstillinger er fjernet og gammel Cron er deaktivert.
- Innlogget localhost-kontroll i den smale appnettleseren viser riktig norsk stedssøk/tomtilstand for Oslo og bidragsside uten falske GPS-turer. Eksisterende privat bokmerke er fortsatt synlig. Ingen privat GPS-rute eller syntetisk bidrag er publisert til produksjon.
- **Fysisk iPhone og annen konto gjenstår:** gjennomført GPS-tur → forhåndsvisning/500 m skjerming → samtykke → del → søk fra annen konto → avvis samme/nesten samme rute → trekk tilbake. Kontroller kartgap, tastatur, store tekststørrelser, VoiceOver og originalens private status. Installer ny preview før testing: Git-push oppdaterer ikke den allerede installerte appen. Se [gjeldende flyt og avgrensninger](route-suggestions.md).


## 2D/3D og navn som hjelpetekst, 26. oktober 2026

- **340 tester i 59 suiter**, typecheck og Expo lint består. Nye Apple-kartregresjoner dekker Standard/Satellitt/Hybrid, 2D → 3D → 2D, bevart sentrum/høyde/retning, ingen ekstra rutetilpasning eller remontering ved vinkelbytte, raske trykk med forsinket kamerasvar, panorering/lukking, GPS-følging og panelendring i 3D. Testene bruker MapView-mock, ikke en faktisk MapKit-renderer. Sonetestene legger nå inn navn eksplisitt og verifiserer at tomt felt ikke kan publiseres. Eksisterende webkarttester består.
- Expo SDK 58 web- og iOS Hermes-eksport består i `.expo/map-title-validation` med oppdiktet offentlig Supabase-konfigurasjon. Versjonert Expo v58-dokumentasjon og react-native-maps v1.29.11-dokumentasjon/kilde er kontrollert for `getCamera`, `setCamera`, `pitchEnabled` og Flyover-modus. Ingen native kilde/pakke er endret; dette er ikke et nytt signert iPhone-bygg.
- Chromium ved 390 × 844 og 320 × 844 bekrefter tomt navnefelt, grå hjelpetekst, lagring uten navn som «Løping», eget navn som beholdes, og gjenåpning etter kryptert lagring/reload. Ingen JavaScript-sidefeil. Testen bruker lokale simuleringer og oppretter ingen konto, innlegg eller sone. Skjermbildene `/tmp/vyro-title-placeholder-{390,320}.png` er visuelt kontrollert.
- **Fysisk iPhone gjenstår:** prøv begge retninger mellom 2D og 3D flere ganger i Standard/Satellitt/Hybrid, etter egen zoom/panorering, med rutepanelet åpent/lukket og under GPS-opptak. Sentrum og zoom skal beholdes ved vinkelbytte; 2D skal bli flatt. 3D-bygninger/terreng avhenger av Apples dekning, særlig utenfor byene. Kontroller også tastaturet og hjelpeteksten i økt-/sonefeltet. Det installerte preview-bygget har innebygd JavaScript og ingen konfigurert EAS Update-kanal; hent siste kode på PC og kjør `npm run ios:preview` fra `mobile`, installer det nye bygget og test. Expo Go/Metro trenger Reload. Skymiljøet har ikke Expo-innlogging og har ikke startet et nytt signert bygg.

## iOS app-ID rettet ved første signering, 26. oktober 2026

- Apple-innlogging lyktes, men `app.vyro.mobile` ble avvist som utilgjengelig for team `YACWFNB642`. iOS-ID er endret til `app.vyro.xamse10`, med `.widgets`, `.watchkitapp` og `group.app.vyro.xamse10`. Android-ID er uendret. Kontrollskriptet for genererte Watch-mål leser nå forventet hoved-ID fra appkonfigurasjonen.
- Typecheck, lint, skriptsyntaks og **16 tester i 2 suiter** (`release-env`, `social-config`) består. Expo `config --type introspect` bekrefter hoved-ID, Apple-team, Apple Sign in-entitlement, appgruppe og retur-scheme `vyro`, samt begge EAS-utvidelser.
- Forsøk på isolert iOS-prebuild stoppet med Expos beskjed om at Windows ikke støtter iOS-generering. Den midlertidige kopien er fjernet. Generert Xcode/Watch-prosjekt, Swift-kompilering og fysisk funksjon er ikke validert lokalt i denne runden.
- EAS bekrefter at alle tre nye ID-er og appgruppen er registrert hos Apple. Ett faktisk iPhone-valg er registrert og valgt for de tre aktive ad hoc-profilene. [Preview-bygg 1](https://expo.dev/accounts/xamse10/projects/vyro/builds/ece64080-7b92-44cc-94c2-6ec168efc98d), versjon `0.1.0`, fikk status **FINISHED** kl. 16:56 UTC med signert IPA og `ARCHIVE SUCCEEDED` i Xcode-loggen. Dette bekrefter skybygg/signering, ikke fysisk funksjon. Ingen TestFlight-opplasting er startet. Installering, Google-/appretur, lagret innlogging, bakgrunns-GPS, Live Activity og Watch må testes fysisk.
- Krypteringskontroll: installert Expo Crypto bruker Apples CryptoKit/AES.GCM på iOS; lokal lagring bruker også Keychain. Eieren svarte ja på standard/unntatt kryptering, og EAS lagret `ITSAppUsesNonExemptEncryption=false`.

## Apple-medlemskap aktivert og Team ID satt, 26. oktober 2026

- Innlogget Apple-kontoside viser medlemsdetaljer for Apple Developer Program og faktisk Team ID `YACWFNB642`; tidligere Pending-status er opphevet. Team ID er lagt inn i `mobile/app.json`.
- Expo-konfigurasjon bekrefter riktig team, bundle ID, app-scheme og eksisterende Watch-/widgetmål. Typecheck, lint og `eas env:exec preview "node scripts/check-release-env.cjs"` består etter endringen. Ingen appkode eller avhengigheter er endret.
- EAS `device:list` viste ingen Apple-team tilknyttet Expo-kontoen. Det interaktive oppsettet venter på eierens Apple-innlogging/2FA og registrering av iPhonen, før preview-bygg. Ingen signert IPA eller fysisk Google-/bakgrunns-GPS-test er bekreftet. Lokalt oppsettsskript ligger under ignorert `.expo/phone`; ingen passord eller Apple-koder lagres i skriptet.

## iPhone-preview klargjort på PC, 26. oktober 2026

- EAS `whoami` bekreftet `xamse10`; appen er koblet til `@xamse10/vyro`, prosjekt-ID `a7a8d578-5dbe-4bae-8835-b54a0a5469c5`. `preview` bruker eget EAS-miljø. Eksisterende Supabase-adresse/offentlig klientnøkkel, Google=true og Apple=false er satt der med synlighet Sensitive. Ingen serverhemmeligheter er overført til EAS; produksjonsmiljøet er ikke endret.
- `eas env:exec preview "node scripts/check-release-env.cjs"` består med de faktiske EAS-variablene. Dette validerer formater, ikke en ekte innlogging på iPhone.
- `npm run typecheck`, `npm run lint` og **24 tester i 4 suiter** består: `social-config`, `social-signin`, `account-google` og `release-env`. Ingen appkode eller nye avhengigheter er lagt til i denne byggerunden. Hele testpakken ble ikke kjørt på nytt.
- EAS `build:inspect --platform ios --profile preview --stage archive` består. Sluttkontrollen av `.expo/iphone-preview-20261026-checked` fant **315 prosjektfiler**, riktig Expo-ID/preview-profil og ingen miljøfiler, signeringsfiler, Supabase CLI-metadata eller Git-metadata. `.easignore` bruker nå `.git` uten avsluttende skråstrek fordi gjeldende EAS CLI sjekker akkurat den stien når den fjerner sin midlertidige Git-kopi; den gamle `.git/`-regelen lot metadata bli igjen. `supabase/.temp/` er også utelatt. Dette er lokal pakkeinspeksjon, ikke native kompilering eller skybygg.
- **Oppdatert kontokontroll 26. oktober:** brukeren opplyser at Apple Developer-medlemskapet er betalt. Den innloggede Apple-kontosiden viser fortsatt «Pending» og oppgir opptil 48 timers behandling av kjøpet. EAS-kontoen er fortsatt `xamse10`. Aktivering avventes; betalingen er ikke uavhengig verifisert. Ingen signert IPA, EAS-skybygg eller TestFlight-innsending er startet. Team ID, signering av app/Watch/widget, registrering av iPhone, faktisk installasjon og fysisk Google-/bakgrunns-GPS-test gjenstår. Se [videre oppsett](testflight.md).

## Rutetjenesten aktivert på PC, 26. oktober 2026

- Eksisterende Supabase `diviitenhbidwrcpmkxr` ble kontrollert: rutetabellene manglet, `valid_vyro_route` og `limit_vyro_write` fantes, og det var ingen CLI-migreringshistorikk. Bare `202610260001_route_suggestions.sql` ble kjørt. Alle fem tabeller har RLS. Anonyme har ikke lesetilgang; klientrollen kan ikke skrive rutekatalogen eller kalle cache-/kvote-RPC. Bokmerkenes SELECT-policy krever `owner_id = auth.uid()`.
- HeiGIT-nøkkelen ligger i ignorert `supabase/functions/.env.local` og i Supabases serverhemmeligheter, aldri i appkonfigurasjon/Git. Produksjonsfunksjonen er `ACTIVE`, versjon 1, med `verify_jwt = true`. OPTIONS ga HTTP 204 og POST uten innlogging ga HTTP 401. Klient- og serverkontroll av innlogging er beholdt.
- Den gamle ORS-adressen ble erstattet med `api.heigit.org/openrouteservice/v2/directions/…`. Et direkte ekte kall med produksjonens parser ga en gyldig 2924 m rundtur med 166 punkter ved et offentlig testpunkt i Oslo. Deretter ga appens stedssøk «Oslo, Norge» og innloggede søk etter 3 km **tre ekte ruter** gjennom den publiserte Edge-funksjonen.
- En privat «Testløype · Oslo» på **2,84 km / 53 m stigning** ble lagret via appen og gjenfunnet etter reload. Serverkontroll viste tre rutemaler, ett privat bokmerke, ett søk, én generering og én ferdig cacheoppføring. Kartfliser og løypelinje er visuelt kontrollert i localhost-nettleseren. Skjermbilde: ignorert `mobile/.expo/routes-activation/saved-route.png`. Ingen treningsøkt, innlegg eller sone er opprettet av testen. Testbokmerket er beholdt og tydelig navngitt.
- Standard-plan/vilkår ble lest: 2000 Directions-kall/døgn og 40/minutt; VYRO begrenser til 600/døgn og 30/minutt. Kilde og CC BY-SA 4.0-lenke følger beregnede ruter. `pg_cron` er aktivert, og `vyro-route-suggestions-prune` er kontrollert som aktiv kl. 03:20 UTC daglig med `postgres`. Første automatiske kjøring er ennå ikke observert.
- `npm run typecheck`, `npm run lint` og **28 relevante tester i 3 suiter** består etter endringen. Rutemigreringens **30 isolerte PGlite-kontroller** bestod i denne aktiveringsrunden. Hele 335-testpakken ble ikke kjørt om igjen her; resultatet under gjelder den tidligere skyleveransen.
- **Gjenstår:** fysisk iPhone (Apple-kart, stedssøk/«Nær meg», GPS-veiledning), ekte kontobytte/annen enhet, offlinebruk og resten av sted-/lengdematrisen. API-nøkkelen ble delt som en filkommentar i chatten; brukeren er bedt om å rotere den etter oppsett, og da må lokal fil og Supabase-secret oppdateres. Ingen hemmeligheter lagres i denne dokumentasjonen.

## Ruteforslag i Norge, 26. oktober 2026

- **335 tester i 59 suiter består**, med TypeScript-kontroll og Expo lint uten varsler. Nye kontroller dekker geografiske søkeområder fra Kristiansand til Kirkenes, Svalbard/Jan Mayen, avrundet startområde, aktiviteter/lengder, rutefiltrering, cache, manglende nøkkel, providerfeil/kvoter, serververifisert bruker, kontobytte, lagring og bruk som guide uten oppdiktet GPS-trening. Dette verifiserer beregnings-/tilgangsregler med testdata, ikke faktiske norske løyper.
- Hele `npm run test:database` består med alle migreringer i isolert PGlite: 38 grunnkontroller, 35 soner, 126 feed/personvern/paginering, 31 sikkerhetskopi, 88 klubber/stedsbilder og 30 nye rutekontroller. Rutetestene verifiserer RLS, forbud mot klientskriving, serverroller, søkelås/cache, bruker-/felleskvoter (og ugyldig kvotekonfigurasjon), privat navn, idempotent lagring, full geometri og opprydding som beholder bokmerkede løyper. Ingen produksjonsdata er endret.
- `deno check supabase/functions/route-suggestions/index.ts` består. Expo SDK 58 eksport for **web og iOS Hermes** består i ignorert `.expo/routes-validation`, med oppdiktet offentlig Supabase-konfigurasjon. Dette er JavaScript-/bytecode-pakking, ikke et signert native bygg eller ny Xcode-/Watch-kompilering. Ingen nye appavhengigheter/native konfigurasjon.
- Chromium ved **390 × 844 og 320 × 640** bruker den faktiske Edge-handleren, lokale PostgreSQL-migreringer og simulerte ORS-svar: eksplisitt Tromsø-søk, gjenbruk av felles cache, detaljvisning, privat navn, lagringsfeil/nytt forsøk, serverbekreftet bokmerke, lagretliste, gjenfinning i en helt ny nettleserkontekst med samme konto, annen kontos tomme liste, kryptert lokal kopi etter nettbrudd og GPS-veiledning uten automatisk opptak. Manglende ORS-oppsett gir beskjed uten falske forslag. Ingen JavaScript-sidefeil. Midlertidige skjermbilder `/tmp/vyro-routes-*.png` er visuelt kontrollert. Testeksporten har ingen Mapbox-nøkkel og viser kartets tomtilstand; bakgrunnsfliser og faktisk visuell kartlinje er derfor ikke verifisert av nettlesertesten.
- Ved denne skyleveransen gjenstod konto/nøkkel, produksjonsmigrering/Edge, ekte resultater, kvoter/vilkår og opprydding. Disse er senere aktivert på PC som beskrevet over. Fysisk iPhone-test må fortsatt dekke stedssøk, «Nær meg», tillatelser, tastatur, stor tekst/VoiceOver, faktisk kart og løype under GPS-opptak, pause/gjenoppretting og offlinekopi. Se [aktivering og akseptansetest](route-suggestions.md).

## Soner: oversikt, opprettelse og gjenfinning, 26. oktober 2026

- Feil bekreftet i kode: egne/følgte soner ble filtrert fra bare de 100 nyeste globale sonene. Hele øktlisten kom før publisering, og innsendingens feil/resultat kunne ligge utenfor skjermen. Det er rettet med serverfiltrerte sider, ID-oppslag og separate velg/forhåndsvis/bekreftet-skjermer. Brukerens tre faktiske forsøk er ikke undersøkt i produksjonsdata; vi kan ikke si hvilke av dem som ble lagret eller avvist.
- Nye regresjoner i `turf-publishing.test.ts` og `turf-screen.test.tsx`: serverfiltrering før grense, opprettede/overtatte soner, følgerrelasjoner, stabile sider og mikrosekundrekkefølge, direkte detaljlenker, bare skjermede GPS-punkter sendes, eldre kvitteringer, nettfeil/nytt forsøk, doble trykk, konkrete opptaksfeil, kontobytte/avbrudd og bekreftet tilbaketrekking. **307 tester / 56 suiter**, typecheck og lint består. `node scripts/test-turf-database.cjs`: **35 kontroller** mot isolert PGlite av opprettelse, overtakelse, utvidelse, idempotens, ugyldige spor og RLS.
- Web- og iOS Hermes-eksport til `.expo/turf-validation` med oppdiktet offentlig Supabase-konfigurasjon består. Ingen ny native konfigurasjon eller biblioteker. Eksport er ikke Xcode-kompilering eller et nytt signert bygg.
- Chromium, 390 × 844 og 320 × 640, mot lokal PGlite med alle migreringer og en lokal HTTP-adapter for PostgREST-spørringene: 105 nyere soner fra andre skjuler ikke egen sone, vennens sone eller en tidligere opprettet/overtatt sone. Bekreftet faner og sideinndeling, valg av tur, avvist kort tur, fast synlig publiseringsknapp, bevart navn etter HTTP 503, vellykket retry med ekte `submit_turf_run`, sonen synlig etter reload, tidligere kvittering uten ny RPC, og gammel sone-ID. En annen autentisert løper kan lese den publiserte sonen, men ikke privat forsøkshistorikk. Ingen JavaScript-sidefeil. Skjermbilder `/tmp/vyro-turf-*.png` er visuelt kontrollert; testmiljøet mangler kartnøkkel og viser derfor kartets utilgjengelig-tilstand, ikke faktiske satellittfliser.
- Ingen ekte soner, brukere eller produksjonsoppsett er endret. Fysisk iPhone (tastatur, tekstskalering, GPS og kart), faktisk Supabase/PostgREST med to ekte kontoer og brukerens historiske forsøk gjenstår. Expo-dokumentasjonsdomener ga HTTP 403 fra miljøet; Router- og React Native-dokumentasjon ble lest fra prosjektenes offentlige dokumentasjonskilder.

Akseptanse på telefon: hent siste kode og last appen på nytt. Gå **Kart → Soner**, sjekk Mine og venner/Mine/Alle, velg **Legg ut sone**, en ny gyldig GPS-løpetur og et navn. Kontroller kartutsnittet før du deler. Se bekreftelsen og **Se sonen**, gå tilbake/restart og kontroller at sonen fortsatt finnes. Åpne samme økt igjen og kontroller gjenfinning uten duplikat. La en konto som følger deg se sonen og prøve hele løypa. Kontroller også korte turer, offline/retry og at tilbaketrekking krever bekreftelse.

## Google ved innlogging og registrering, 26. oktober 2026

- Årsak bekreftet i Git: `b0039b1` dokumenterte vellykket Google-test på PC og aktivering i ignorert `.env.local`. Den delte koden krevde fortsatt et eksplisitt Google=true-flagg og skjulte dessuten Google på iPhone når Apple ikke var klar. Design-pushen beholdt OAuth-koden, men arvet disse begrensningene. Google har nå versjonert på-standard med eksplisitt false-overstyr, og er uavhengig av Apple. Ingen hemmeligheter/serverinnstillinger er endret.
- **291 tester / 54 suiter**, typecheck og lint uten varsler består. Regresjoner dekker manglende Google-/Apple-flagg, eksplisitt Google-avvalg, manglende Supabase, Expo Go-forklaring, Apple av/utilgjengelig/ventende, Google fra både register/login uten utfylte navne-/passordfelt, avbrudd og doble trykk. Begge kontoflytene bruker faktisk OAuth/PKCE-kode mot simulerte SDK-/nettlesersvar og godtar bare serverreturnert sesjon.
- Web- og iOS Hermes-eksport til `.expo/google-default-validation` består med **både Google- og Apple-flagg utelatt**, Expo dotenv avslått og oppdiktet offentlig Supabase-testkonfigurasjon. Dette kontrollerer den versjonerte standarden, ikke PC-ens lokale miljøfil.
- Chromium ved 390 × 844 og 320 × 640: Google-knappen vises på «Opprett konto» og «Logg inn» mens Apple er skjult. Den virkelige Supabase-klienten sender Google authorize-request, webretur og PKCE-kodeutveksling til en isolert nettverksmock; testen kontrollerer S256-utfordring mot verifier. Begge flytene kommer til Hjem, gjenoppretter samme returnerte konto etter reload og logger ut. Ingen e-postregistrering eller passord kreves, og ingen JavaScript-sidefeil. Skjermbildene er visuelt kontrollert (`/tmp/vyro-google-*.png`). Ingen ekte kontoer, Google-samtykker, e-poster eller produksjonsdata er opprettet/endret.
- Brukerens tidligere ekte Google-test på PC er bevart som evidens. Denne runden verifiserer ikke et nytt ekte Google-samtykke, serverstyrt kontokobling, signert iPhone-bygg eller fysisk appretur. Expo Go kan ikke bruke appens egen OAuth-scheme; egen installasjon eller web kreves. E-post er fortsatt tilgjengelig. Apple-oppsett er fortsatt uferdig og holdes av.

## Hjem, profil og innstillinger, 25. oktober 2026

- **280 tester i 53 suiter består**, samt `npm run typecheck` og `npm run lint` uten varsler. Nye tester dekker 12 lokale kalenderuker, ukerekke, årsskifte/skuddår, eier-/GPS-/sportsfilter, profilvalidering, offentlig navn kontra privat metadata, delvis lagringsfeil, kontobytte under lagring, følgertall og 30+1-sideinndeling. Hjem beholder innlegg under oppdatering/feil, avbryter gamle kall ved fane-/kontobytte og viser aldri gammel privat strøm. Gjester beholder tilgang til simuleringer uten andre kontoers GPS-økter. Nye innstillingsverdier bevares ved lagring/gjenoppretting, med delingsforvalg per eier. Kalenderpakken består også med `TZ=Europe/Oslo`.
- Expo SDK 58 **web- og iOS Hermes-eksport** til ignorert `.expo/design-validation` består. Kjøringen bruker oppdiktet offentlig Supabase-testadresse og prosesslokale leverandørflagg; dette er en testeksport som ikke skal publiseres. Ingen nye pakker, native konfigurasjon eller databaseendringer. Eksisterende varsel om manglende Apple Team ID gjelder fortsatt signering.
- Chromium med mobilstørrelsene **390 × 844 og 320 × 640**, isolert lokal lagring og nettverksmock: velkomstsider, sveiping/sidevalg, synlige CTA-er, separate registrerings-/innloggingsvalg, Google/Apple-knapper og glemt passord fungerer. En lagret sesjon med `onboarded: false` går rett til Hjem. Profilfaner, GPS-logg uten simulerte tall, følgertall/-liste, forhåndsutfylt personsøk, kopiering av offentlig profiltekst og profilredigering er kontrollert. Kun visningsnavn sendes til profil-tabellen; de valgfrie feltene sendes til Auth-metadata.
- Samme nettleserkontroll dekker lys/mørk/systemvalg, standardkart, delingsforvalg, startstrøm og at preferansene overlever omstart gjennom eksisterende kryptert lagring. Del økt bruker valgt publikum. Konto validerer e-post før innsending. Opptak, Watch, hjelp og sikkerhetskopi-siden kan åpnes. Mislykket feedoppdatering beholder innlegg og kan forsøkes igjen. Utlogging viser introduksjonen, mens Du fortsatt viser simuleringer og lokalt gjestenavn kan endres. **Ingen JavaScript-sidefeil.** Ingen ekte kontoer, innlegg, e-poster eller backenddata ble opprettet/endret i denne testen.
- Skjermbilder av velkomst, Hjem, profil, profilredigering og innstillinger i lys/mørk modus er visuelt kontrollert. Midlertidige bilder `/tmp/vyro-{welcome,home,profile,settings,edit-profile,register}*.png` og testskript under `/workspace/.cache/vyro/` følger ikke med Git. UI-bildene bruker oppdiktede navn/økter.
- **Gjenstår på fysisk iPhone:** tastatur og Safe Area ved profil-/kontoendring, VoiceOver/stor tekst, systemtema ved OS-bytte, navigasjon og native delingsark, ekte følgerlister/profillagring/e-postbekreftelse mot Supabase og Standard/Satellitt/Hybrid i både Kart og Tren. Native MapKit, Apple-innlogging, bakgrunns-GPS, Watch og Live Activity er ikke fysisk verifisert av denne designrunden. Eksport er ikke et Xcode-bygg eller TestFlight-opplasting. Tidligere bekreftet Google-innlogging på PC er bevart; ingen nye produksjonsflagg er aktivert.

## Google, Apple og valgfritt etternavn, 25. oktober 2026

- Hele Jest-pakken består: **263 tester / 49 suiter**. Typecheck og lint uten varsler består. 57 av testene dekker konto, autentisering og de nye innloggingsvalgene: avbrutt/avvist OAuth, feil returadresse, PKCE-feil, Apples hash/original-nonce og serverbekreftede sesjon, skjulte leverandører før oppsett, Expo Go-avgrensning og etternavn som kan utelates, endres og fjernes. En sen duplisert callback utveksler ikke engangskoden på nytt og gjenoppretter ikke en utlogget konto.
- Expo SDK 58-konfigurasjonskontroll bekrefter `usesAppleSignIn`, `com.apple.developer.applesignin = [Default]` og lokalisering av Apple-knappen. iOS Hermes- og webeksport består i `.expo/social-auth-validation`, med offentlige testverdier og leverandørflagg aktivert kun i valideringsprosessen.
- Nettleserkontroll ved 390 × 844 og 320 × 640 viser begge leverandørknappene, separat valgfritt etternavn, ingen telefonfelt og fungerende navigering til glemt passord uten JavaScript-feil. Testen bruker en oppdiktet Supabase-adresse med nettverk blokkert og oppretter ingen kontoer. Skjermbilder ligger midlertidig i `/tmp/vyro-social-*.png`.
- **Lokal Google-test på PC:** Google Cloud-prosjekt/OAuth-klient er opprettet og konfigurert i eksisterende Supabase. Lesende Auth-innstillingskontroll ga HTTP 200, Google aktivert og Apple deaktivert. Brukeren bekreftet «topp det gikk» etter å ha valgt Google fra VYROs lokale innlogging. Dette er en brukerrapportert vellykket innlogging, ikke en full automatisk ende-til-ende-test. Google-flagget er lagret i ignorert lokal miljøfil; produksjonsmiljøet er ikke endret.
- **Ikke verifisert:** Apple-innlogging, kontokobling i eksisterende Supabase, alle akseptansetilfellene, fysisk iPhone, signering eller ny Xcode-kompilering. Deaktivering av den gamle Google-klienthemmeligheten etter rotasjon er ikke bekreftet. Leverandørene var av som standard ved denne leveransen; Google-standarden er endret 26. oktober, se over. Se [kontooppsett og akseptansetest](social-login.md).

## Bakgrunnsopptak og appbytte, 25. oktober 2026

- **233 tester i 45 suiter består.** Nye kontroller dekker AppState-overganger uten pause når native bakgrunnsopptak er aktivt, GPS-/tidssjekkpunkter mens timere er suspendert, manuell pause, tjeneste som ikke starter, tapt tillatelse/tjeneste, forsinkede kontrollsvar, Expo Go-fallback, eksisterende avvalg og innstillingsflyt. Ingen native posisjonstjeneste eller fysisk iPhone brukes i Jest.
- Typecheck, lint uten cache, iOS Hermes-eksport, web-eksport og Expo-introspeksjon består. `UIBackgroundModes: location`, tillatelsestekster og den interne iPhone-profilen `preview` er kontrollert. Chromium ved 390 × 844 og 320 × 640: informasjon om bakgrunnsstøtte og Start er synlige, støtteløs bryter skjules, innstillingsskjermen virker og ingen JavaScript-sidefeil oppstår.
- Expo CLI svarer «Not logged in». Ingen signert IPA, installasjonslenke eller fysisk test er laget; tidligere simulatorbygg er ikke bevis på fysisk bakgrunnsopptak. Se [byggekrav og enhetstest](background-recording.md).

## Snittempo sammenlignet med Strava, 25. oktober 2026

- **52 tester i seks suiter består**, inkludert seks nye regresjoner for distansepresisjon, tall som passer skjermbildene, GPS-opptak ved ulik fart med pause og bevaring av råverdier ved lagring/gjeninnlasting. Typecheck og lint uten cache består.
- Ingen feil funnet i VYROs tempoberegning; ingen produksjonskode er endret. Bildenes ulike tider/distanser og Expo Gos pause i bakgrunnen begrenser sammenligningen. Rå GPS-nøyaktighet og Stravas interne beregningsregler er ikke verifisert. Se [tall, metode og fysisk testplan](pace-comparison.md).

## Apple Watch, 25. oktober 2026 (skymiljø)

- Hele Jest-samlingen består: **216 tester i 42 suiter**, inkludert 18 nye tilfeller for klokkeformat, avvisning av feil eier/simulering/ugyldige koordinater og tid, distanseberegning, pause-/GPS-gap, duplikater, tapt bekreftelse, lagringsfeil og kontobytte mens en overføring pågår. Synkroniseringstester bruker en transport-/lagringsdobbel; de kjører ikke WatchConnectivity.
- Typecheck, lint uten cache, Expo SDK 58 iOS Hermes-eksport og web-eksport består. Watch-skjermen i web viser at eget bygg kreves, med fungerende navigasjon fra Innstillinger og tilbake, ved 390 × 844 og 320 × 640. Ingen JavaScript-sidefeil. Ingen native forbindelse påstås fra nettleserkontrollen.
- Prebuild i en isolert kopi under `/tmp` består. `check-watch-target.cjs` verifiserer `VyroWatch`, fire Swift-kilder via Xcodes synkroniserte mapper, watchOS 10, companion bundle ID, appversjon, HealthKit-rettighet, tillatelsestekster, bakgrunnsmodus, byggavhengighet og innbygging i iPhone-appen. Eksisterende `ExpoWidgetsTarget` består. EAS-konfigurasjonen har begge tilleggsmålene. Autolinking finner `VyroWatchModule`, `VyroWatchAppDelegate`, `VyroWorkoutMap` og `ExpoWidgets`.
- GitHub Actions [40188672169](https://github.com/Xamsesulub/Vyro/actions/runs/40188672169/job/121154777831), commit `0901069`, **består hele workflowen**: Xcode 27.1/SDK-kontroll, Expo Prebuild, kontroll av Watch-mål, usignert Watch-kompilering, CocoaPods-installasjon og hele iPhone-simulatorbygget med WatchConnectivity-modulen og eksisterende Live Activity. Compilerlogger er lagret som artifact. Dette er ekte native kompilering, men ingen simulator ble startet og ingen fysisk enhet ble testet.
- De første kjøringene på `macos-15`/standard Xcode 16.4 bestod Watch-bygget, men feilet i iPhone-steget med kode 65 og «Could not resolve package dependencies». Bytte til `xcode-27` med eksplisitt Xcode 27.1, som Expo anbefaler for SDK 58, gir bestått bygg. Feilloggingen beholder original feilstatus via `pipefail` og inkluderer konkrete diagnostikklinjer med etterfølgende forklaring i annotasjoner/sammendrag. Lokal kontroll av flerlinjefeil, escaping, YAML og verktøyvalg består; typecheck og lint består. `ios.appleTeamId` er fortsatt ikke konfigurert; ingen Apple-identifikator eller signeringsfil er diktet opp.
- Ingen nye native enhetstester, faktisk HealthKit-tillatelse, puls/GPS-måling, session-gjenoppretting, OS-filbeskyttelse, batterimåling eller fysisk WatchConnectivity-overføring er verifisert i dette Linux-miljøet. Ingen IPA, TestFlight-opplasting eller databaseendring er laget. Følg [fysisk testplan og byggekrav](apple-watch.md) før klokkestøtte godkjennes for bruk.

## Rund innstillingsknapp på Du, 24. oktober 2026 (skymiljø)

- Typecheck, lint uten cache, web-eksport og de tre eksisterende `auth-views`-testene består. Testene skriver fortsatt en React-advarsel om duplikatnøkkelen `runner` fra de to eksisterende kontobundne innstillingskomponentene; disse er ikke endret her.
- Chromium ved 390 × 844 og 320 × 640: runde 48 × 48-knapper, riktig plassering og svak skygge er kontrollert visuelt. Tannhjulet åpner Innstillinger, retur til profil virker, mørk modus gir lyst ikon på mørk knapp, og Finn venner åpner personsøkets eksisterende innloggingskrav for gjester. Ingen JavaScript-sidefeil.
- Ingen nye tester for den rent visuelle endringen. Nettleserkontrollen bruker lokal eksport uten tjenestenøkler; fysisk iPhone-visning er ikke verifisert. Ingen native pakker er endret, så endringen kan lastes i Expo Go.

## Ett stedssøk øverst i kartet, 24. oktober 2026 (skymiljø)

- Typecheck og lint uten cache består. **17 tester i 4 suiter** består: fem nye skjermtester for direkte søk, valg av sted uten å opprette kartet på nytt, avbryt/redigering med sene svar, tomt søk/feil/nytt forsøk og opprydding ved avmontering; eksisterende Apple-søk-, Apple-kart- og rutepaneltester består også. Native kart/geokoding er mock i skjermtestene.
- Web-eksport og Chromium-kontroll ved 390 × 844 og 320 × 440 består: ett felt beholder sin vertikale plass, tastaturinnsending starter søket, treff ligger under feltet, listen kan rulles og treff velges ved liten tilgjengelig høyde. Kollapset rutepanel bevares, kartlag kan åpnes/lukkes, søket kan gjenåpnes/avbrytes og Lagret-filteret virker. Ingen JavaScript-sidefeil. Den reduserte høyden er en layoutkontroll, ikke et simulert native iPhone-tastatur.
- Nettleserkontrollen bruker isolert eksport i ignorert `.expo/map-search-validation`, en falsk offentlig kartnøkkel og lokale svarfixturer for kart og geokoding. Ingen live karttilgang eller offentlig publisering er verifisert. Expo-dokumentasjonen om tastaturhåndtering og installerte React Native 0.88-typer er kontrollert; ingen pakker er lagt til.
- **Gjenstår på fysisk iPhone:** åpne Kart, skriv i øverste felt med tastaturet synlig, søk etter en adresse, velg et treff og kontroller kartutsnittet. Prøv lang tekst, rulling, Avbryt og fanebytte mens et søk pågår. Automatisk test og nettleser erstatter ikke denne kontrollen.

## Skjerm og låseskjerm under trening, 24. oktober 2026

- Typecheck og lint uten cache består. Hele Jest-samlingen bestod med **191 tester i 39 suiter**; deretter bestod 14 målrettede tester med to nye regresjoner for Expo Go og utlogging under en ventende ActivityKit-oppdatering (**193 unike tester totalt**). Widgetkontrollen med seks tilstander består også etter siste visningsendring. `git diff --check` består.
- Regresjonstest bekrefter at 1 km / 300 sekunder gir 05:00/km; ett minutt stillstand under opptak gir 06:00/km; Pause fryser resultatet. Beregningen er uendret.
- Testene dekker våken skjerm på Tren/Kart under opptak/pause og frigjøring ved skjermbytte, deaktivering, avslutt og kontobytte. Liveaktivitetstester dekker start/pause/fortsett/avslutt, begrenset oppdateringsfrekvens, avslag, brukerens avvisning, feil eier, simulering, kaldstart, sene kartbilder etter utlogging og kartlasting som feiler. Native API-er er mock i Jest.
- SDK 58 iOS Metro/Hermes-eksport består. Widgetens separate runtime er bygget med `node node_modules/expo-widgets/scripts/build-bundle.mjs . ios .expo/widgets-runtime.bundle`. `node scripts/check-workout-widget.cjs` kontrollerer seks tilstander med den faktiske Babel-serialiseringen og Expos isolerte widget-runtime: opptak, pause, utdaterte data, mørk visning, dempet skjerm og manglende kart. Dette er ikke SwiftUI-rendering på en enhet.
- Expo autolinking finner både `ExpoWidgets` og lokal `VyroWorkoutMap`. Introspeksjon bekrefter appgruppen `group.app.vyro.mobile`, `NSSupportsLiveActivities` og bakgrunnsmodus `location`. Liveaktiviteten opprettes ved kjøretid; `widgets`-listen skal være tom, ikke ha en hjemskjerm-widget uten størrelser.
- **Ikke fysisk verifisert:** Swift-kompilering, signering, faktisk MapKit-kartbilde, Live Activity/Dynamic Island, bakgrunnsoppdateringer og skjermlås på iPhone. Expo Go starter uten å laste widget-modulen, men støtter bare våken skjerm og forgrunnsopptak. Ingen IPA eller skybygg er laget.
- Enhetskontroll etter nytt bygg: slå på «Vis kart og økttall» i Varsler og opptak, gi bakgrunnsposisjon ved Start, gå en kort tur og lås telefonen. Kontroller kartets attribusjon, posisjon/rutesegmenter, oppdatering, liten/stor tekst og Always-On. Test Pause/Fortsett og at avslutt/utlogging fjerner aktivitet og bildefiler. Avvis Live Activities, nekt bakgrunnstillatelse, mist nett/GPS, og tvangsavslutt/gjenåpne; et gammelt opptak skal aldri fortsette automatisk. Slått-av telefon støttes ikke.
- Nettleserkontroll av nye innstillinger ble forsøkt, men IAB svarte med CDP-tidsavbrudd på både eksisterende og ny lokal fane. En gammel Expo-server på IPv6-loopback ble funnet på samme port som den nye LAN-serveren og stoppet. Oppdatert Expo Go-server svarer med HTTP 200 og VYRO/SDK 58-manifest via IPv4. Ingen vellykket visuell nettlesertest påstås.

## Registrering av eksisterende konto, 24. oktober 2026

- Lesende kontroll i Supabase viste at den berørte kontoen allerede var bekreftet og hadde en tidligere vellykket innlogging. Ingen konto, passord eller bekreftelseskrav ble endret, og ingen e-post ble sendt fra denne kontrollen.
- Et registreringssvar uten sesjon tolkes ikke lenger i skjermtekstene som bevis på at kontoen er ubekreftet. Konto, Hjem, Du og Innstillinger beholder vanlig innlogging. Teksten forklarer at eksisterende kontoer bruker det opprinnelige passordet, mens nye kontoer må sjekke e-post. Eksplisitt `email_not_confirmed` fra innlogging viser fortsatt riktig feilmelding.
- Typecheck og lint består. **25 tester i 3 suiter** (`account`, `auth-views`, `auth-session`) består, inkludert videresending av bekreftelse, passordgjenoppretting og felles sesjon på tvers av skjermene. Fysisk innlogging etter denne tekstendringen avventer brukerens kontroll.
- Egen SMTP er fortsatt avslått, bekreftet i dashboardet. E-postlevering til nye brukere er ikke ferdig konfigurert eller ende-til-ende-testet.

## Apple Maps og iOS først, 24. oktober 2026

- Typecheck og lint uten cache: bestått. Jest: **177 tester i 37 suiter** består. Den gamle native Mapbox-testen er erstattet av Apple-adaptertester. Nye kontroller dekker tre separate karttyper uten remount, ingen automatisk GPS fra kartet, pauseseparerte rute-/turf-linjer, panelmarg/attribusjon, første GPS-fiks, panorer/følg/recentrer, nytt rute-/søkevalg, nord og 3D. Native MapKit er mock i Jest.
- Apples adressesøk testes med native mock: trimmet adresse, ingen posisjonstillatelse, tomt søk, avbrudd, sen respons og 12 sekunders tidsgrense. Det er eksplisitt geokoding, ikke komplett POI-autofullføring. Utgivelseskontrollen godtar iOS uten Mapbox-token og avviser fortsatt serverhemmeligheter; web-validering krever fortsatt sin offentlige kartnøkkel.
- Metro/Hermes-eksport for iOS og web til ignorert `.expo/apple-map-export` består. `@rnmapbox/maps` og pluginen er fjernet, og iOS velger `LiveMap.ios.tsx`. Dette er JavaScript-pakking, ikke Xcode-kompilering eller signert IPA.
- iOS-kildekart bekrefter Apple-entry, 34 React Native Maps-moduler, ingen Mapbox SDK/GL-moduler og native geokodingsadapter. Expo prebuild-konfigurasjon kan leses uten feil, aktive plattformer er iOS/web og Mapbox-pluginen er borte. Localhost-kartet åpner fortsatt i nettleseren; dette er ikke en native Apple-test.
- Fysisk iPhone er **ikke testet**. Kontroller Standard/Satellitt/Hybrid, bildelasting, markør/følgekamera ved bevegelse, nord/3D, Apple-attribusjon over rutepanelet, stedssøk, start/pause/fortsett, tillatelsesdialog og bakgrunnsopptak. Sammenlign kald/varm kartstart på samme telefon/nett før hastighetsforbedring påstås.
- Ingen skybygg, publisering, databaseendring eller ny Apple-konto ble opprettet. Eksisterende native VYRO trenger nytt bygg; web-forhåndsvisningen fortsetter å bruke Mapbox og har fortsatt den observerte satellitt-429-begrensningen.

## Start og kartlasting, 24. oktober 2026

- Typecheck og lint: bestått. Jest: **166 tester i 36 suiter** består. Nye tester dekker øyeblikkelig Start-lås, gjentatte trykk, timeout og nytt forsøk, kontobytte under tillatelse, tilbakekalt tillatelse ved Fortsett, simulering uten konto/GPS, nettleser uten Permissions API, sene callbacks, native tidsgrense og high-accuracy-watch med feil/avslutning. Karttester bekrefter første kamera ved kjent posisjon og gjenbruk av kartmotor ved posisjonsoppdatering.
- Lokal eksport av web, iOS og Android til `.expo/start-map-export`: bestått. Dette er Metro/Hermes-pakking, ikke fysisk native installasjon eller GPS-verifikasjon.
- Ekte nettleser på `localhost:8081/track`: Start viser «Starter …» straks; når posisjon ikke svarer blir knappen aktiv igjen med synlig forklaring. Standard-kartet vises. Simulering → Start → Pause → Fortsett → Pause → Fullfør ble kontrollert. Testutkastet ble forkastet, og GPS ble valgt igjen. Ingen testøkt er lagret eller publisert. Skjermbilder ligger lokalt under ignorert `mobile/.expo/start-map-check/`.
- `node scripts/check-mapbox.cjs` mot ekte tjeneste: stilene og satellitt-TileJSON gir 200; én satellittflis gir **429**. Nåværende konto-/faktureringsårsak er ikke fastslått. Ingen nye nøkler, kontogrenseendringer eller automatiske gjentakelser.
- Fysisk iPhone med Start, tillatelsesdialog, låst skjerm, dårlig GPS og Pause/Fortsett gjenstår. Apple-migreringen senere samme dag er beskrevet ovenfor. Android er utsatt. Ingen målt prosentvis ytelsesgevinst.

## Satellittgjenoppretting etter ny push, 23. oktober 2026

- `ef3d26c` er hentet med fast-forward. Før endring bestod 144 Jest-tester og 318 lokale databasekontroller, samt typecheck og lint. Gjennomgangen omfatter kartets stil/livssyklus og endringene i klubber, stedsdeling og blandet feed; dette er ikke en ny kontroll av produksjonskontoer eller en full sikkerhetsrevisjon.
- Etter retting består 151 Jest-tester i 34 suiter, typecheck og lint uten cache. Nye regresjoner dekker 429-ventetid uten automatiske forsøk, mange samtidige flisfeil uten utsatt ventefrist, ny kartmotor med bevart utsnitt og gjenopprettet GeoJSON-rute, ignorerte feil fra fjernet motor, nytt forsøk etter mislykket dynamisk import og native gjenoppretting. Native SDK er mock i Jest; ingen fysisk telefonkontroll er utført.
- Feilmeldinger håndterer native HTTP-tekst uten å vise URL/token. Diagnostikktester kontrollerer at 200 for stil/TileJSON ikke skjuler 429 på selve bildet, at 401/403 stopper nye kall og at JSON feilaktig levert med 200 ikke godtas som fotografi.
- Bygget webapp ved 390 × 844 og 320 × 640, med **ekte Mapbox GL JS-motor og syntetiske nettverkssvar**: stil/TileJSON 200 + bildefliser 429 viser synlig feil og deaktivert knapp. Hybrid/Satellitt gjenbruker stilen. Ingen automatisk gjentakelse. Etter 30 sekunder og brukertrykk lastes flisene på nytt, pikselkontroll bekrefter bildelaget, feilmeldingen forsvinner, og begge fotografiske valg samt Standard virker. Ingen JavaScript-sidefeil. Skjermbildene er kontrollert visuelt; de syntetiske, ensfargede flisene er ikke bevis for ekte satellittbilder.
- Web-eksport til ignorert `.expo/map-recovery-validation` og Hermes-pakking for iOS/Android består. Web-fixturen har en syntetisk nøkkel og skal aldri publiseres. Ingen nye produksjonsdata, migreringer eller kontoendringer.
- `npm run map:check` stopper her med `missing-public-token` før nettverkskall. Direkte forsøk mot både `api.mapbox.com` (uten token) og den offentlige testadressen avvises av skymiljøets CONNECT-proxy med 403. Dette er **ikke en ny Mapbox 429-måling**. Tidligere live-429 står dokumentert i seksjonen under fra brukerens siste push. Kontroll på maskinen med nøkkel og nettverkstilgang er nødvendig for å fastslå dagens årsak og bekrefte ekte fotografier; kontogrense, betaling og midlertidig begrensning er ikke skilt fra hverandre her.

## Tomt satellittkart og Hybrid, 23. oktober 2026

- Reprodusert mot ekte Mapbox på localhost: Standard tegner kartet, mens satellittfliser svarer HTTP **429** både i kartmotoren og i en separat leseforespørsel. TileJSON og `standard-satellite`-stilbeskrivelsen svarer 200. Dette forklarer både den tomme satellittbakgrunnen og at tidligere Hybrid beholdt Standard-kartet når fotografiene manglet. Det er ikke dokumentert feil lagrekkefølge: Standards `bottom`-slot ligger over landpolygonene. Ingen kontogrense, fakturering eller token er endret.
- Fotografiske karttyper bruker nå Mapbox Standard Satellite: Hybrid med veier/navn, Satellitt uten disse. Bytte mellom disse to bevarer samme stil og kartkilder. Valg oppdateres når importen er klar, selv mens fliser laster; de venter ikke på `isStyleLoaded()`.
- Typecheck og lint består. 144 Jest-tester i 32 suiter består, inkludert DOM-test av faktisk LiveMap med mock av kartmotoren: Hybrid/Satellitt endrer etiketter uten `setStyle`/ny treningskilde, og 429-feil beholdes gjennom `style.load` mens bytte til Standard fjerner den gamle stilens feilmelding. Feilklassifisering viser aldri provider-URL/token.
- Web-eksport og Hermes-pakking for Android/iOS består. Fysisk native kart er **ikke testet**.
- Nettleser ved 393 × 852: Standard med eksempelrute, panel inn/ut, Hybrid/Satellitt-valg, deaktivert POI-valg i ren Satellitt, tydelig 429-melding inne i kartflaten, og tilbake til Standard kontrollert. Standard med POI av, høydekurver og 3D ble kontrollert. Bildene i Satellitt/Hybrid er fortsatt **ikke visuelt godkjent**, fordi live-tjenesten fortsatt avviste flisene. Ingen syntetiske bilder brukes i appen eller som bevis for fungerende satellitt.
- Lokale skjermbilder: `mobile/.expo/map-check/standard.png`, `satellite-limit.png`, `hybrid-limit.png`. Referanse: [Standard Satellite](https://docs.mapbox.com/map-styles/reference/standard-satellite/) og [Mapbox rasterfeil og grenser](https://docs.mapbox.com/api/maps/raster-tiles/). Den tidligere syntetiske testen fra 22. oktober beviste ikke at ekte satellittfliser var tilgjengelige.

## Ny logo og åpne klubber, 23. oktober 2026

Supabase-migrering `202610240003_open_clubs.sql` er aktivert på `diviitenhbidwrcpmkxr`. Åtte etterkontroller i SQL Editor ga `true`: privat standard, RLS, riktig anon-/authenticated-tilgang, oppdagelsesfunksjon, beskyttet medlemsliste, ingen direkte klientinnsetting av medlemskap og fortsatt privat bildelagring. Kontrollskjermbilde: `mobile/.expo/social-check/open-clubs-supabase.png`. Ingen produksjonsdata ble brukt som testklubber. Inn-/utmelding mellom to faktiske kontoer mot Supabase HTTP er fortsatt ikke manuelt kontrollert.

- Typecheck, ESLint, 141 Jest-tester i 30 suiter og web-/Android-/iOS-eksport består. Android/iOS er Hermes-bundler; fysiske telefoner og launcher/splash i installert bygg er ikke testet.
- 318 lokale PostgreSQL-kontroller består, inkludert 88 klubb-/bildekontroller. Nye tilfeller dekker privat standard, skjult privat klubb, blokkert direkte innmelding/invitasjonsomgåelse, åpen oppdagelse uten medlemsidentiteter, idempotent innmelding, forbruk av egen ventende invitasjon, utmelding, eierstyrt synlighetsbytte, bevart eksisterende medlemskap, avviste anonyme/ueier-kall og stabil paginering. Klubbmedlemskap gir ikke tilgang til private treningsinnlegg eller en ny følgerrelasjon.
- Isolert mobil-UI-test med PGlite: åpen klubb synlig før medlemskap, Bli med → medlemsliste → Forlat klubb → tilbake i oppdagelse; opprett åpen klubb → bekreft privat; ny VYRO-logo på Hjem ved 393 × 852. Ved 320 × 640 er Start synlig, hjelpeteksten er borte, og simulering → Pause viser tid/tempo/distanse. Ingen konsollfeil i denne flyten. Alle testklubber er lokale og fiktive.
- Nye Jest-tilfeller dekker privat standard/eksplisitt åpen, avvist ugyldig input, stabil markør og avvist innmelding uten falsk lokal suksess. Skjermbilder: `mobile/.expo/social-check/new-brand-home.png` og `open-clubs.png` (ignorerte lokale testfiler).

## Klubber, stedsbilder og treningsoppsett, 23. oktober 2026

- Typecheck, ESLint, 137 Jest-tester i 29 suiter og web-/Android-/iOS-bundling består. Android/iOS er Hermes-bundler, ikke installerte eller fysisk testede mobilbygg. Windows-sandkassen blokkerte først Jest/Hermes; de samme kontrollene bestod utenfor sandkassen.
- 285 lokale PostgreSQL-kontroller: 230 eksisterende og 55 nye i `mobile/scripts/test-clubs-places-database.cjs`. Dekker eierstyrte invitasjoner, feil mottaker, avslag, dobbelt aksept, medlemskap, utmelding, eierfjerning, kaskader, private bilder før deling, følger-/alle-publikum, tilgang etter unfollow, blokkert overskriving, tilbaketrekking og blandet feed med stabil markør. Storage-tabellene/RLS testes lokalt; dette erstatter ikke en test av den faktiske Storage HTTP-tjenesten mellom to ekte kontoer.
- Nye Jest-tester dekker stripping av bildemetadata, størrelses-/tekstvalidering, ingen publisering etter mislykket opplasting/kontobytte, idempotent retry og avgrenset feed med sikker fallback. Den eksisterende innloggingsregresjonen for Hjem/Du/Innstillinger består.
- Nettlesertest ved 393 × 852 og 320 × 640 mot `mobile/scripts/social-ui-fixture.cjs`, en separat loopback-origin med PGlite og kun testbrukere. Verifisert: ta imot invitasjon, opprette privat klubb, søke etter Noah og invitere, velge et lokalt VYRO-ikon som testbilde, komprimere/forhåndsvise/publisere og hente bildet inn i Hjem. Større kart før start, synlig Start, simulering → Pause med tid/tempo/distanse synlig ved 320 px. Ingen konsollfeil i den kontrollerte flyten. Testbildet og klubbene ble ikke sendt til ekte Supabase.
- Supabase: godkjente migreringer `202610230001`, `202610240001`, `202610240002` kjørt via SQL Editor. Etterkontroll: privat 5 MiB-bucket, RLS på fire nye tabeller, tre Storage-policyer, anon uten publish-RPC, authenticated med publish-RPC og tilgjengelig home-feed. Alle seks er sanne. Ny produksjonsbruker eller ekte bilde ble ikke opprettet i kontrollen.
- Sluttkontroll av Du → Finn venner → navnesøk → Følg bestod ved 320 px; lange brukernavn avkortes uten horisontal overlapp. Tale-valget i Varsler og opptak beholdes etter full omlasting. Under ny web-eksport traff en allerede åpen testfane midlertidig en manglende lazy-bundle; omlasting mot ferdig eksport løste dette, og den samme flyten bestod. Det ble ikke funnet en vedvarende appfeil.
- Lokal visuell evidens ligger i ignorerte `mobile/.expo/social-check/`. Strava-referanser er ikke brukt som appbilder. Fysisk iOS/Android-bildevelger, tillatelser, bakgrunns-GPS, tale/vibrasjon og foto-lesing mellom to ekte kontoer er fortsatt **utestet**.

## Felles løperikon, 23. oktober 2026

- Det gamle `run`-piktogrammet og VYRO-symbolet er erstattet med felles geometri i `runnerMark.json`. Kart, aktivitetskort, posisjonskort, logo og oppstartsanimasjon bruker denne definisjonen. Tabler-ikonets opprinnelige SVG-baner, 24 × 24 viewBox og 2 px strek er beholdt; ingen ny runtime-avhengighet. Sharp er kun utviklingsverktøy for PNG-eksport.
- `npm run brand:generate` gjenskaper samtlige sju ikonfiler. Piksel-/metadatakontroll bekrefter 1024 × 1024 app-/splash-ikoner, 64 × 64 nettleserikon, ingen alfa på iOS-ikonet og transparent Android-/splash-forgrunn. Alle synlige forgrunnspiksler ligger innenfor Androids sikre sirkel (maksimal radius 296,6 px, tillatt 312,9 px). Expo SDK 58 `config --type introspect` godtar ikonene og Androids monokromkonfigurasjon.
- Chromium med den bygde appen ved 390 × 844 og 320 × 640: samme nye løper i onboarding, oppstartsanimasjonen, gjestens Hjem og kartet. Oppstartsoverlegget forsvinner, logoen passer innenfor skjermen, «Kom i gang» og stedsøk fungerer, og det genererte nettleserikonet leveres. Onboarding/Hjem er visuelt kontrollert. Ingen JavaScript-sidefeil. Kartikonets grønnfarge og strekbredde ble også kontrollert i første del av endringen.
- Typecheck, lint uten cache, 129 Jest-tester, web-eksport og `npm ci --dry-run` består. Ingen nye tester er skrevet for selve piktogrammet. Fysisk native visning av appikon/splash er ikke kontrollert og krever nytt release-bygg; offentlig testlenke er ikke oppdatert.

## Innlegg, Hjem, følgerforhold og soner, 23. oktober 2026 (skymiljø)

Alle ni brukerflyter består både med samtlige repo-migreringer og med bare migreringene `202610200001`–`202610200004`, slik at den eldre feed-lesingen også blir prøvd. Totalt 18 nettleserkontroller ved 390 × 844 bruker den bygde appen, to separate nettleserøkter og faktiske PostgreSQL-funksjoner/RLS i lokal PGlite. Supabase-innloggingene, GPS-punktene og adapteren mellom REST-kall og SQL er testdata/testverktøy. Ingen produksjonskontoer brukes, og ingen e-poster eller data sendes til skytjenesten.

- **Publiser innlegg:** velg egen testøkt gjennom «Del økt», publiser med `publish_workout`, og kontroller at innlegget lagres og vises på forfatterens Hjem. Simuleringen tilbys ikke i delingslisten. Skjermet start/slutt utelates fra delt rute, og private notater finnes ikke i forespørselen.
- **Følgere og Hjem:** bruker B ser ikke As følgerbegrensede innlegg først. «Følg» lagrer relasjonen, og innlegget vises på Bs Hjem etter fanebytte og omlasting. A kan følge B tilbake; de to retningene består uavhengig. «Slutt å følge» lagres, fjerner innlegget fra Bs strøm også etter omlasting og beholder As følgerrelasjon.
- **Opprett sone:** knappen er deaktivert før delingssamtykke. Innsending gjennom `submit_turf_run` oppretter riktig eier/revisjon, og opprettelseshendelsen kommer på Hjem. Serverens lagrede sonegeometri inneholder ikke rå GPS-tidsstempler/nøyaktighet.
- **Overtakelse:** langsommere forsøk og lik tid beholder eieren. Raskere full løype bytter eier og revisjon, og hendelsen vises på Hjem hos den andre brukeren som følger utfordreren. «Overta og utvid» lagrer lengre løype med den opprinnelige delen bevart og viser utvidelsen i strømmen.
- Ingen uventede API-feil eller JavaScript-sidefeil i noen av nettleserflytene. Den eldre databasen returnerer forventet `42883` for de to nye lesefunksjonene; appens eksisterende reserveflyt henter innlegg og sonehendelser korrekt.
- 129 Jest-tester, 230 lokale databasekontroller, typecheck, lint uten cache og isolert web-eksport består. Databasetestene dekker også ugyldige/simulerte forsøk, feil løpsretning, feil revisjon, gjentatt innsending og tilgangsavvisning.

Maskinlesbare resultater: [social-flows-2026-10-23.json](evidence/social-flows-2026-10-23.json). Ingen appkode måtte rettes i denne kontrollen. **Fortsatt ikke verifisert:** ekte innlogging/REST i den publiserte Supabase-tjenesten, e-postlevering og opptak/konkurranse på fysiske telefoner. Tilkoblingsinnstillinger og ekte testkontoer mangler i dette miljøet. Den offentlige testlenken er ikke oppdatert eller testet gjennom denne lokale kontrollen.

## TestFlight-klargjøring, 22. oktober 2026 (skymiljø)

- Typecheck, lint uten cache og 129 Jest-tester i 27 suiter består. Eksisterende tester dekker passordinnlogging, registrering uten falsk sesjon, mobilcallback ved registrering/resend/recovery, engangskoder, sikker sesjonslagring og gjenoppretting uten innloggingsside på Hjem. Dette bruker isolerte testdobler, ikke en ekte Supabase-konto.
- Tre nye utgivelseskontroller kjører skriptet i separate Node-prosesser. Manglende innloggings-/kartinnstillinger, lokale fixturer og offentlige servernøkler avvises med feilkode uten å skrive nøkkelverdier. Gyldige formateksempler og klientens alternative publishable-key-navn godtas. Formattesten beviser ikke tilgang til tjenestene.
- EAS CLI 25.3.0 sitt faktiske skjema validerer `eas.json`, arv til TestFlight-profilen, butikkdistribusjon, fysisk iPhone, `production`-miljø og automatisk byggnummer. EAS sin ignore-motor kontrollerer at appkode/ikoner beholdes mens miljøfiler, signeringsfiler, eksporterte testfixturer og presentasjonsmateriale utelates fra opplasting.
- Expo SDK 58 `config --type introspect` bekrefter `app.vyro.mobile`, registrert `vyro` URL-scheme og iOS `location` i bakgrunnsmodus. iOS Hermes-eksport til ignorert `.expo/testflight-export` består. Dette er JavaScript-pakking, ikke en signert IPA eller Xcode-kompilering.
- Reelt forsøk med `eas build --platform ios --profile testflight --auto-submit --non-interactive` stopper med **«An Expo user account is required to proceed»**. `eas whoami` gir **«Not logged in»**. Ingen skybygg, Apple-opplasting eller testinvitasjon ble opprettet. Manglende Expo-/Apple-tilgang og Supabase-/Mapbox-verdier må kobles etter [TestFlight-oppsettet](testflight.md). Ekte innlogging, e-postlevering, native satellittkart og GPS på iPhone er fortsatt ikke verifisert her.

## Drabart kartpanel og satellitt, 22. oktober 2026

- Typecheck, lint uten cache og 126 Jest-tester i 26 suiter består. Testene verifiserer fotografisk rasterkilde for Satellitt/Hybrid, uavhengighet fra 3D, Hybrid-lagets plassering, ingen feilaktig Standard-konfigurasjon på rent rasterkart, samt åpning/lukking og skjuling av utilgjengelige panelhandlinger.
- Chromium ved 390 × 844 og 320 × 640: faktiske touch-hendelser drar håndtaket ned/opp; også trykk og Enter fungerer. Lukket panel fjerner skjulte knapper fra fokus. Rutestjerne, detaljrulling, kartvalg og Start er beholdt. Kartknappene ligger over panelet. Ingen nettleserfeil.
- Ekte Mapbox GL JS-motor kjørt med isolerte nettverksfixturer: Satellitt velges før den forsinkede kartmotoren lastes. TileJSON og rasterfliser fra den forventede Mapbox-satellittkilden etterspørres. Pikselkontroll bekrefter at rasterflisene tegnes både i Satellitt og over landflaten i Hybrid, og at Standard fjerner bildelaget. Ingen kart-/runtime-feil. **Flisene var syntetiske, ikke ekte satellittbilder**, og ingen ekte Mapbox-token eller produksjonsdata ble brukt.
- Web-eksport og native Hermes-pakking for Android/iOS består. Ingen fysisk iOS/Safari/Android-verifikasjon eller ny offentlig publisering utføres i dette miljøet. Den eksisterende offentlige lenken viser fortsatt tidligere kode; fysisk kontroll med ekte Mapbox-kart gjenstår etter utrulling.

## Treningsfunksjoner og design, 22. oktober 2026 (skymiljø)

- 124 Jest-tester i 25 suiter består, med typecheck og lint uten cache. Nye tester dekker reelle/egne data i mål og milepæler, kombinerte historikkfiltre, interpolerte kilometertider og pauser, eldre opptak uten splittdata, privat rutevalg med eier før start, samt konto-/kildesperrer.
- Mockede native tester dekker bakgrunnstillatelse, avslag, start/pause/gjenopptak, kontobytte under tillatelsesdialog, kalde oppgaver, sene GPS-punkter og feil som pauser opptaket. Dette er logikktester, ikke fysisk OS-verifikasjon.
- Backup-tester dekker eksplisitt aktivering, riktig eier, tillatte felt, ingen simulatoropplasting, idempotent nytt forsøk, tapte svar, ny enhet/gjenoppretting, deduplisering uten overskriving, lokalt slettede kopier, utkobling og kontobytte under forespørsler.
- `npm run test:database`: 38 + 35 + 126 + 31 = **230** kontroller består i isolert PGlite. Nye kontroller bekrefter eierbasert lesing/sletting, avvist anonym-/krysstilgang, servervalidering, ingen feedpublisering, idempotens, forbud mot endring av eksisterende backup og kaskadesletting med konto.
- Chromium: onboarding, simulatorstart/pause/gjenopptak/fullføring og kryptert gjenåpning består. Ved 320 × 640 er Fortsett/Fullfør stablet, og kartknappene ligger over målingspanelet. Ingen runtime- eller console-feil i denne flyten.
- Separat webpakke med syntetisk Supabase-endepunkt tester innlogget Hjem, sidevisning, ukemål, søk/aktivitetsfilter, kontonavn, GPX og gjentakelse av rute. Backup testes med uttrykkelig aktivering, én injisert HTTP 503, nytt forsøk, lokal sletting, gjenoppretting og eksplisitt skysletting. Ingen produksjonskonto, ekte GPS eller produksjonsskriving brukes.
- Web-eksport og Hermes-pakker for Android/iOS består; native eksport er ikke signert APK/IPA. `npm ci --dry-run` godtar låsefilen. Expo-konfigurasjonskontroll viser iOS `location`-bakgrunnsmodus og Android fine/coarse/background-location samt foreground-service/location-tillatelser.

**Gjenstår før lansering:** Nytt mobilbygg og fysisk test med låst skjerm, GPS-tap, pause/gjenoppta, batterisparing, prosessavslutning, lagring etter låsing, lyd/stillemodus og vibrasjon på iOS/Android. Stor systemskrift og landskap må vurderes på mobil. Migreringene for feed og privat backup er ikke kjørt i Supabase fra dette miljøet; reell tobruker-/toenhetstest og belastning under samtidige brukere gjenstår. Mapbox-nøkkel mangler her, så ekte kartfliser er ikke visuelt verifisert. Se [funksjonsbeskrivelsen](product-improvements.md).

## Pålitelighet, kontoprofil og GPX, 22. oktober 2026 (skymiljø)

- 106 Jest-tester i 22 suiter består. Nye tester dekker samlet lagring under 500 oppdateringer, treg disk med 1000 oppdateringer, umiddelbar pause/lagring, låsing ved dekodingsfeil, ny lesing etter feil og vellykket ny skriving. Eksisterende økt-, GPS-, krypterings- og innloggingstester består.
- Profiltestene dekker eierbegrensning, validering, mislykket skriving, mellomlagring, avbrudd, svarrekkefølge og kontobytte. GPX-testene dekker bekreftelse i UI, XML-escaping, pausegrenser, fravær av notater/tidsstempler og avvisning av simuleringer/andre eiere/ugyldige koordinater.
- `npm run test:database`: 38 + 35 + 126 = 199 kontroller består i isolert PGlite. Ingen produksjonsskriving. Eksisterende RLS-test avviser endring av en annen brukers profil. Den store feed-fixturen er ikke en flerbruker-belastningstest.
- Lokal Chromium-test ved 390 × 844: onboarding, simulering, pause, omlasting, fortsett, fullfør, lagre og gjenåpne bestått. En separat pakke med syntetisk Supabase-endepunkt og avledede nettverkskall bekrefter innlogget Hjem, sidevisning, rutekart ved behov, navneendring fra Innstillinger til Du, eksplisitt GPX-nedlasting, gyldig XML med pausegrenser og utlogging. Gamle GPS-utkast migreres til kryptert lagring og klartekst fjernes. Ingen runtime-/console-feil; ingen ekte konto eller GPS-data brukt.
- Typecheck, lint uten cache, web-eksport og Hermes-pakking for Android/iOS består. `npm ci --dry-run` godtar låsefilen, og Expo prebuild-konfigurasjonen løser pluginene. Native eksport er ikke APK/IPA eller fysisk enhetstest.
- GitHub Actions-arbeidsflyten er lagt til; kommandoene er kjørt lokalt. Selve GitHub-jobben er ikke kjørt fra dette miljøet. Ingen produksjonsutrulling utført.

Fysisk test gjenstår for GPS, lagring ved låst enhet/prosessavslutning, det nye native delingsarket og mottakerens GPX-import. Nye native moduler krever et nytt mobilbygg. Se [oppførsel og gjenværende arbeid](app-reliability.md).


## Kontosesjon og feedytelse, 23. oktober 2026

- Typecheck, Expo lint uten cache og 90 Jest-tester i 18 suiter består. Nye regresjonstester dekker treg gjenoppretting, tomt startsvar ved refresh-feil, forsinket startsvar etter innlogging/utlogging, delt retry og faktisk Hjem-visning ved sesjonsendring.
- Feedtester dekker én samlet forespørsel, markør for neste side, avbrudd og kompatibilitet med gammel database. Tilgangs-/nettverksfeil utløser ikke fallback. Rutekart og reaksjoner testes uten ekstra lesinger ved første visning; vellykkede reaksjoner oppdaterer listens data for gjenbrukte rader.
- 38 eksisterende databasekontroller, 35 turf-kontroller og 126 nye feed-/personvernkontroller består. Sistnevnte bruker alle migreringene, 10 120 innlegg, 1 501 følgerelasjoner og 1 000 sonehendelser i isolert PGlite. Anonymtilgang nektes; følgerinnlegg og tilhørende reaksjoner forsvinner ved unfollow. Ingen private aktivitetsruter returneres av feeden. Sidevisning ved like tidsstempler gir verken hull eller duplikater.
- Nettlesertest av den bygde appen ved 390 × 844 med isolert, avskåret test-backend: gjenopprettet innlogging på Hjem, ett feed-RPC og ett sone-RPC, ingen innledende rute-/reaksjonslesinger, kartåpning ved behov, likerklikk, neste side, omlasting, profil/Hjem og eksplisitt utlogging består. Ingen nettleserfeil. Dette er ikke en ekte Supabase-innlogging; ingen produksjonskonto eller produksjonsskriving ble brukt.
- Web-eksport og Hermes-pakking for Android/iOS består. Produksjonsinnlogging, kapasitet ved samtidige brukere og fysisk Android/iOS er ikke verifisert i dette miljøet. Ingen administratortilgang til Supabase var tilgjengelig; migreringen er ikke satt i drift.

## VibeOff publisert, 23. oktober 2026

- Etter brukerens innlogging og eksplisitte beskjed om publisering ble «Publish my build» fullført som `@hamse`. Siden viste «Your build is live», synlighet **Public** og den offentlige adressen https://vibeoff.ai/build/vi-bygde-vyro-for-a-gjore-lopeturen-enklere-a-folge-4394bc53.
- Forsidevideoen rapporterte 20,13 sekunder og `readyState: 4`. «Open» og «Open the demo» peker til https://vyro-xamse.surelark18.chatgpt.site/. De fem skjermbildene er beholdt. Skjermbevis: `evidence/vibeoff-published-2026-10-23.jpg`.
- Ingen appkode er endret. Tidligere merknader om upublisert utkast er historiske; gjenstående SMTP- og fysiske enhetstester gjelder fortsatt.

## Video og offentlige returadresser, 23. oktober 2026

- `showcase/vibeoff/00-walkthrough.mp4` er et ekte, redigert skjermopptak av webeksporten i den isolerte demoen: kart, start av simulering, levende målinger, pause og oppsummering. 20,13 sekunder, 1280 × 800, H.264/yuv420p, 30 fps, uten lyd. Hele filen ble dekodet uten feil; representative bilder fra alle fem segmenter ble visuelt kontrollert.
- Videoen er lastet opp til eksisterende VibeOff-utkast og lagret som første av seks medieelementer. VibeOff-spilleren rapporterte 20,13 sekunders varighet og `readyState: 4`; avspillingstiden gikk fremover. Bevis: `evidence/vibeoff-video-cover-2026-10-23.jpg`. Innlegget er fortsatt «Not published» og krever brukerens innlogging/publisering.
- Supabase-dashboardet ble tilgjengelig. Site URL er nå `https://vyro-xamse.surelark18.chatgpt.site/account`; den eksakte offentlige `/auth/callback` er lagt til. Omlasting bekreftet tre tillatte callback-adresser, inkludert eksisterende localhost og native. Bevis: `evidence/supabase-public-redirects-2026-10-23.jpg`.
- SMTP er fortsatt avslått. E-postleverandør, mottak/fullføring av bekreftelsesmail og ekte innlogging på den offentlige adressen gjenstår. Ingen nye kontoer, e-poster, GPS-opptak eller produksjonsdata ble opprettet i denne runden. Fysisk Android/iOS er utestet.
- Ingen appkode eller appavhengigheter ble endret for videoen. Tidligere typecheck, lint og 75 apptester er derfor ikke kjørt om igjen for media og dokumentasjon. Den separate demoserveren er stoppet etter opptaket.

## Felles kontostatus, 23. oktober 2026

- Typecheck, prosjektets `expo lint --no-cache`, 75 Jest-tester i 16 suiter og Expo-webeksport bestått. Den nye tverrskjermtesten og publiseringsskriptet består også eksplisitt ESLint. En bredere `eslint .` viste eksisterende manglende Node/Jest-globals og importvarsler i hjelpefiler/tester; disse er ikke del av Expo-lintens standardomfang.
- Nye tester dekker gjenopprettet sesjon, tokenfornyelse og utlogging på Hjem/profil/innstillinger samtidig, navigasjonsremontering, lokal gjesteprofil, ubekreftet registrering, innlastingsvisning, manglende sesjon i innloggingssvar, avmeldt auth-observer og global sesjon før e-postcallback navigerer.
- Nettleser: isolert demo på localhost:8103 viser «Innlogget» i profil og «Du er innlogget i hele VYRO» på kontosiden. Dette er en fiktiv sesjon, ikke en vellykket innlogging mot Supabase. Demoen er stoppet etter testen.
- Sites-versjon 2 er publisert. Omlasting av den offentlige appen og navigering til profil bekreftet «Gjest · ikke innlogget». Bevis: `evidence/auth-public-guest-2026-10-23.jpg` og `evidence/auth-shared-session-demo-2026-10-23.jpg`.
- Live kontroll: Auth HTTP 200, registrering på og e-postbekreftelse påkrevd. Alle 11 tabeller avviser anonym tilgang med HTTP 401. Ett tilfeldig ugyldig innloggingsforsøk ble avvist på 195 ms. Ingen kontoer, e-poster eller treningsdata ble opprettet.
- I denne kontrollrunden stod Supabase-dashboardet på innlogging. Offentlige redirect-adresser ble senere lagret og kontrollert, se nyere kontroll over. SMTP, mottak av bekreftelse og ekte innlogging på offentlig adresse gjenstår. Fysisk Android/iOS er utestet.
- VibeOff viste «Not published» med fem skjermbilder og Live link. Video ble lagt til senere samme dag, se kontroll over; publisering på brukerens konto gjenstår.

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
