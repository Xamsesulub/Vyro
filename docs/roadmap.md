# Leveranseplan

## Eget iPhone-testbygg klargjort, 26. oktober 2026

Appen er koblet til EAS-prosjekt `@xamse10/vyro`. Intern `preview`-profil bruker eget miljø med eksisterende Supabase-kontoer, Google aktivert og Apple deaktivert. Apple-medlemskap, innlogging, Team ID `YACWFNB642` og iPhone-registrering er bekreftet. Den opprinnelige app-ID-en ble avvist som utilgjengelig; iOS bruker nå `app.vyro.xamse10` med oppdaterte widget-/Watch-ID-er og appgruppe. Typecheck, lint, Expo-introspeksjon og 16 relevante tester består etter endringen. **Første preview-bygg er ferdig med signert IPA** (`FINISHED`, versjon `0.1.0`, bygg 1). Ingen TestFlight-opplasting er startet. Neste steg er installasjon og fysisk Google-/bakgrunns-GPS-/Watch-test; se [byggeguiden](testflight.md).

## Ruteforslag i hele Norge, 26. oktober 2026

Kart har nå «Ruteforslag» og en kontobundet liste med lagrede løyper. Sted/«Nær meg», aktivitet og omtrent 3/5/10/15 km gir inntil tre beregnede rundturer via en ny Supabase Edge Function og openrouteservice. Forslag kan forhåndsvises, navngis privat, lagres i skyen med full geometri og brukes som veiledning under ekte GPS-opptak. Ingen forslag registreres som gjennomført trening eller publiseres automatisk. En avgrenset kryptert cache støtter åpning av lagrede linjer uten nett; bakgrunnskartet kan kreve nett.

Løsningen bruker landsdekkende geografiske områder, ikke en håndplukket byliste. Faktisk løypedekning følger kartdataene. **Aktivert på PC 26. oktober:** bare ny migrering `202610260001` er kjørt i eksisterende Supabase, servernøkkel/kvoter er satt og Edge-funksjonen er aktiv med innloggingskontroll. Daglig opprydding er planlagt kl. 03:20 UTC. HeiGITs nye API-adresse brukes. Ekte appkall ga tre Oslo-forslag; en privat testløype ble lagret og gjenfunnet etter reload med synlig kartlinje. Typecheck, lint, 28 rutetester og 30 isolerte databasekontroller består. Fysisk iPhone, annen enhet/konto og den bredere akseptanselisten gjenstår. Kuratert Geonorge-import og varmekart er utsatt; appen påstår ikke at forslagene er kvalitetsgodkjente eller populære. Se [oppsett og avgrensning](route-suggestions.md).

## Enklere soner og synlig publisering, 26. oktober 2026

Soner åpner nå egne og venners løypesoner med en tydelig «Legg ut sone»-knapp. Valg av løpetur og forhåndsvisning er egne trinn; navnet foreslås fra turen, detaljreglene kan utvides, og publisering/feil ligger fast nederst. Serverbekreftelse åpner den faktisk lagrede sonen. Tidligere forsøk gjenfinnes uten duplikater, og korte/skjermede eller gamle opptak forklares før innsending.

Den tidligere globale 100-grensen skjulte eldre egne/venners soner. Den er erstattet av filtrering i databasen før sideinndeling, med små listefelt og direkte henting av detaljkart. «Mine» inkluderer soner opprettet av deg selv etter at andre har overtatt. Overtakelse, utvidelse, tilbaketrekking, GPS-krav og skjerming av start/slutt er bevart. Ingen nye pakker, migreringer eller produksjonsdata er nødvendige/endret. Se [flyten](social-and-turf.md) og [verifikasjon](testing.md).

## Google-valget i nye bygg, 26. oktober 2026

Google-innlogging/-registrering er nå aktivert som standard i den delte appkoden og `.env.example`, med mulighet for eksplisitt avvalg. Den tidligere aktiveringen på PC lå i en ignorert lokal miljøfil. Apple-oppsett/tilgjengelighet skjuler ikke lenger Google på iPhone. Begge kontoskjermene bruker samme PKCE-flyt uten krav om eget VYRO-passord; teksten forklarer nye kontra eksisterende brukere. Expo Go forklarer plattformbegrensningen og beholder e-post. Eksisterende Supabase/Google-oppsett og den bekreftede PC-testen beholdes. Native Google-test krever egen VYRO-installasjon; ingen nye leverandørhemmeligheter, migreringer eller produksjonsdata er endret. Se [innlogging](social-login.md) og [tester](testing.md).

## Hjem, profil og innstillinger, 25. oktober 2026

Strava-inspirert omarbeiding av brukerens skjermbilder er implementert i VYROs egne farger og grafikk. Gjester får tre sveipbare introduksjonskort med separate valg for registrering og innlogging. En gjenopprettet sesjon går direkte til Hjem også når introduksjonen ikke er fullført på enheten. Hjem viser uketall, aktivitetsstrøm, innleggsdeling og privat GPS-logg, med bevarte innlegg under oppdatering og nytt forsøk ved nettfeil.

Du har Fremgang/Aktiviteter/Mer, 12-ukers distansegraf, månedens aktive dager, uker på rad, eksisterende ukemål/milepæler og søk/filtre. Bare egne GPS-økter teller. Følgertall og sideinndelte følgelister hentes fra eksisterende backend. Profilen kan deles som navn/brukernavn via delingsarket eller utklippstavlen. Profilredigering lagrer offentlig visningsnavn og valgfrie private felt (etternavn, biografi, sted og hovedidrett); ingen ny databasemigrering.

Innstillinger har fast toppfelt, rund tilbakeknapp og grupperte rader. Lys/mørk/system, Standard/Satellitt/Hybrid, foretrukket Hjem-strøm, eksempler og kontobundet delingsforvalg er koblet til vedvarende valg. Kartvalget gjelder både Kart og treningskartet. Konto/e-post/passord, personvern, sikkerhetskopi, opptak, ukemål, Apple Watch og hjelp har egne sider. E-postendring krever leverandørens bekreftelse. GPS-økter forblir private til eksplisitt publisering.

Ingen abonnementer, betalingsflyt, falske varsler, nye helsetillatelser eller uferdige partnerintegrasjoner er lagt til fra referansebildene. Eksisterende soner, bakgrunnsopptak, innloggingsleverandører og oblig-materiale er bevart. Ingen nye pakker, native konfigurasjon eller produksjonsmigreringer. Fysisk iPhone-kontroll av tastatur, tekstskalering og navigasjon gjenstår; se [testgrunnlaget](testing.md).

## Google, Apple og etternavn, 25. oktober 2026

Valgfritt etternavn ved e-postregistrering og redigering/fjerning i konto er implementert. Etternavn holdes utenfor den delte profiltabellen; visningsnavnet velges separat. Ingen telefoninnsamling. Google bruker Supabase PKCE via systemnettleser; Apple er forberedt med native ID-token/nonce på iPhone og OAuth på web. Google Cloud-prosjekt og OAuth-klient er nå opprettet, Google er aktivert i eksisterende Supabase, og eieren bekreftet vellykket innlogging på localhost 25. oktober 2026. Det lokale Google-flagget er aktivert; produksjonsflagg er ikke endret. Apple-oppsett, signering, fysisk ende-til-ende-test og produksjonsaktivering gjenstår. Google-knappens tidligere avhengighet av Apple er fjernet 26. oktober; se nyeste status over. Se [social-login.md](social-login.md).

## Opptak med låst skjerm og appbytte, 25. oktober 2026

Bakgrunnsopptak er nå standard i nye installasjoner og synlig før Start; lagrede avvalg beholdes. Native tjenestestart bekreftes, opptakstid oppdateres etter suspenderte timere, og tapt tjeneste/tillatelse gir pause med bevart rute. Expo Go viser at eget VYRO-bygg kreves. En intern `preview`-profil er klargjort for fysisk iPhone uten Metro-server. 233 tester, typecheck, lint, iOS/web-eksport og konfigurasjonskontroll består. Signering, installasjon og fysisk skjermlås-/appbyttetest gjenstår; Expo-innlogging og Apple-signering er ikke koblet til skymiljøet. Se [oppsett og testplan](background-recording.md).

## Kontroll av snittempo, 25. oktober 2026

VYROs snittempo er kontrollert mot brukerens VYRO-/Strava-bilder og gjennom 52 relevante tester. Ingen regnefeil er funnet; full distansepresisjon beholdes fra opptak til lagret økt. Seks nye regresjonstester er lagt til. Sammenligning av GPS-nøyaktighet på samme rute gjenstår; Expo Go pauser når VYRO går i bakgrunnen. Ingen funksjonsendring er gjort. Se [kontrollen av snittempo](pace-comparison.md).

## Apple Watch, 25. oktober 2026

En første SwiftUI-klokkeapp for watchOS 10+ er implementert med Start/Pause/Fortsett/Avslutt, utendørs GPS, aktiv tid, distanse, tempo og HealthKit-puls. Innstillinger → Apple Watch gir eksplisitt kontokobling og synkronisering. Fullførte klokkeøkter importeres privat til eksisterende treningslogg, med validering, duplikatkvitteringer og bekreftelse først etter kryptert lagring på iPhone. Klokkens utboks beholdes ved forbindelses- eller lagringsfeil.

216 tester, typecheck, lint, iOS/web JavaScript-eksport og generering/kontroll av Xcode-mål består. **Både Watch-appen og hele iPhone-appen består usignert simulatorbygg** i GitHub Actions [40188672169](https://github.com/Xamsesulub/Vyro/actions/runs/40188672169), commit `0901069`. Det første iPhone-bygget stoppet under klargjøring av Swift-pakker på standard Xcode 16.4. Workflowen bruker nå SDK 58s anbefalte Xcode 27.1 og lagrer compilerlogger med konkrete feilannotasjoner. **Signert bygg, TestFlight og fysisk iPhone-/Watch-test gjenstår.** Expo Go kan ikke kjøre klokkedelen. Se [klokkeoppsett og testplan](apple-watch.md).

## Rund innstillingsknapp på Du, 24. oktober 2026

Profilens tekstlenke til Innstillinger er erstattet av en rund knapp øverst til høyre, med et eget tannhjul i VYROs farger og svak skygge. Finn venner har samme knappestil. Begge har 48 × 48 trykkflate, tydelige tilgjengelighetsnavn og tilpasser seg mørk modus. Eksisterende navigasjon og innstillinger beholdes; ingen nye pakker eller native byggkrav.

## Stedssøk direkte øverst i kartet, 24. oktober 2026

Kartets øverste søkefelt er nå et faktisk tekstfelt. Det separate søkepanelet nederst er fjernet. Søk sendes med tastaturets Søk-tast eller søkeknappen; treff og feil vises rett under feltet. iOS tilpasser resultatlistens plass til tastaturet, og kartknapper/rutepanel skjules under søket. Valg av treff lukker tastaturet og flytter kartet, mens rutepanelets åpne/lukkede tilstand beholdes. Redigering, avbryt og skjermbytte avbryter ventende søk, og sene svar ignoreres.

Ingen nye pakker eller native byggkrav er lagt til. Apple-geokoding på iPhone og Mapbox-søk på web beholdes. Automatiserte kontroller og nettleserkontroll består; fysisk kontroll med iPhone-tastaturet gjenstår. Se [tester](testing.md).

## Skjerm under trening og iOS-låseskjerm, 24. oktober 2026

Snitt/km beholder aktiv opptakstid delt på GPS-distanse. Stillstand under et løpende opptak øker snittet; Pause fryser tid og snitt. Ingen automatisk pause er innført.

«Varsler og opptak» har nå «Hold treningskartet på» (på som standard, kun Tren/Kart under opptak eller pause). En separat, valgfri «Vis kart og økttall» aktiverer også bakgrunnsopptak. Liveaktiviteten viser tid, distanse, snitt/km og ekte MapKit-kartutsnitt med siste del av ruten. Den åpner Tren ved trykk og følger pause/fortsett/avslutt. Kartoppdateringer begrenses til hvert 30. sekund ved ruteendring; økttall sendes normalt hvert 15. sekund, mens SwiftUI driver tidtakeren. Utdaterte data markeres, og iOS styrer Always-On, personvernsladding og hvor lenge aktiviteten vises.

Ny lokal Expo-modul `VyroWorkoutMap` genererer kartutsnitt uten egen posisjonsinnsamling. Kun gjeldende GPS-økt for innlogget eier kan vises; simuleringer og gjenopprettede, pausede økter starter ingen liveaktivitet. Midlertidige bilder ligger i appens private delte container, uten sikkerhetskopi, og ryddes ved avslutt/utlogging/ny oppstart. Kartbilder sendes ikke til VYROs backend.

Koden, SDK-pakkingen og autolinking er kontrollert, men **nytt signert iPhone-bygg og fysisk verifikasjon gjenstår**. Liveaktiviteter og bakgrunns-GPS er ikke tilgjengelig i Expo Go; våken treningsskjerm er tilgjengelig der. Telefonen må være slått på. Ingen skybygg, App Store-publisering eller databaseendring er utført.

## Tydelig innlogging etter registreringsforsøk, 24. oktober 2026

Registrering uten sesjon kan gjelde en eksisterende, bekreftet konto. Appen hevder derfor ikke lenger automatisk at e-posten må bekreftes på nytt. Vanlig innlogging med det opprinnelige passordet er tydelig på Konto, Hjem, Du og Innstillinger; ekte bekreftelsesfeil og ny utsending støttes fortsatt. Ingen autentiseringsregler er endret. Typecheck, lint og 25 relevante tester består. Oppsett av SMTP for nye brukere gjenstår.

## iPhone først og Apple Maps, 24. oktober 2026

Brukeren har valgt iOS som første mobilplattform; Samsung/Android utsettes. iOS bruker nå Apple MapKit gjennom Expo SDK 58-kompatibel `react-native-maps@1.29.11`. Native Mapbox-pakke/plugin er fjernet. EAS-kontrollen krever bare Supabase-konfigurasjon for iOS, og native eksport retter seg mot iOS. Android-konfigurasjonen beholdes for senere arbeid, men Android er ikke en aktiv plattform eller godkjent leveranse.

Rutelinjer, pauseseparasjon, turf-overlegg, blå markør, følgekamera, nord, 3D, Standard/Satellitt/Hybrid og innramming med panelmarg er implementert i Apple-adapteren. Adressesøk bruker Apples geokoding via Expo Location uten posisjonsinnsamling eller Mapbox-nøkkel. Høydekurvebryteren skjules på iOS fordi adapteren ikke har et eget slikt lag. «3D-visning» beskriver kameraet uten å love et eget terrenglag.

Localhost beholder Mapbox som nettleserforhåndsvisning; det er ikke Apple Maps på web. iOS- og web-pakking og automatiserte kontroller består, men native kompilering, installasjon og fysisk iPhone-test gjenstår. Ingen hastighetsgevinst eller live satellittvisning på iPhone er målt. Se [kartvalget](map-provider-options.md) og [tester](testing.md).

## Start og kartlasting, 24. oktober 2026

Start/Fortsett bruker én felles oppstart med umiddelbar opptatt-tilstand, vern mot gjentatte trykk, ny tillatelseskontroll og tidsgrense. Web venter på posisjonstillatelse, ikke et presist GPS-fiks, før opptaket starter. Avslag eller manglende svar vises ved Start. Konto- og opptaksvalg kontrolleres igjen etter tillatelsesdialogen. Web-watcheren bruker nettleserens high-accuracy-valg og feilcallback; simulering og ekte GPS holdes atskilt.

Treningskartet beholdes når tillatelsen endres. Mapbox-arbeidstråder forhåndslastes etter første skjerm og gjenbrukes ved bytte av skjerm. Et kjent posisjonsutsnitt brukes fra første kartkonstruksjon. Overgangen fra oppsett til den aktive treningsskjermen oppretter fortsatt én ny kartvisning. Ingen målt hastighetsgevinst på fysisk mobil er dokumentert.

Ny livekontroll på denne PC-en bekrefter 200 for stil og TileJSON, men **429 på ekte satellittbilde**. Dette gjelder nå nettleserforhåndsvisningen. iOS er senere samme dag migrert til Apple Maps, som beskrevet ovenfor.

## Satellitt: undersøkelse og gjenoppretting, 23. oktober 2026

Ny brukerpush `ef3d26c` er hentet og gjennomgått; klubber, stedsdeling, ny logo og Standard Satellite er beholdt. Dens dokumenterte live-feil er 429 på bildefliser selv om stil/TileJSON svarer 200. Kontogrunn og nåværende live-tilgang er fortsatt uavklart: Mapbox-nøkkelen finnes ikke i dette skymiljøet, og både Mapbox API og den offentlige testadressen avvises av miljøets nettverksproxy.

Web og native har nå brukerinitiert gjenoppretting med 30 sekunders ventetid ved 429, uten automatiske forsøk. Kartutsnitt/rute beholdes, og native HTTP-feil klassifiseres også. `npm run map:check` tester stil, TileJSON og én ekte satellittflis på maskinen som har prosjektets nøkkel. Ingen konto-/faktureringsendring, backendendring eller offentlig publisering. Live satellitt er **ikke ferdig godkjent**; se [diagnostikk](mapbox-setup.md) og [testresultater](testing.md).

## Kartretting, 23. oktober 2026

Standard er veikart; Hybrid og Satellitt bruker nå offisiell Standard Satellite med henholdsvis kartnavn/veier på og av. Satellitt/Hybrid-bytte gjenbruker kartstilen. Lagvalg virker mens fliser laster, og feil vises inne i kartet. Standard er visuelt kontrollert på localhost. Ekte satellittbilder er fortsatt blokkert av Mapbox HTTP 429; visuell godkjenning av disse og fysisk native-kontroll gjenstår. Se nyeste seksjon i `testing.md`. Ingen endring i GPS-opptak, deling eller database.

## Egen VYRO-logo og åpne klubber, 23. oktober 2026

Åpne klubber er aktivert i Supabase med migrering `202610240003`; åtte lesende etterkontroller bestod. Den oppdaterte appen kjører lokalt. Den eldre offentlige testlenken er ikke endret i denne leveransen.

Den nye navy/lime-løperen og VYRO-ordmerket er tegnet som skalerbar vektorgrafikk fra brukerens vedlagte logo. Stor logo på velkomst-/innloggingsforside og Hjem, løpersymbol på kart og som app-, splash- og nettleserikon. `mobile/src/theme/runnerMark.json` er felles kilde; `npm run brand:generate` gjenskaper plattformikonene. Dette erstatter Tabler-merket fra den tidligere fasen. Nye native ikoner krever nytt mobilbygg.

Overflødig forklaring under aktivitet/kart er fjernet; nødvendig merking av eksempelkart/simulering og GPS-feil beholdes. Klubber har valg mellom privat og åpen ved oppretting, egen sideinndelt liste for åpne klubber og direkte innmelding. Eier kan bytte synlighet etter bekreftelse. Eksisterende klubber forblir private, og medlemskap deler ikke automatisk aktiviteter eller bilder. Se [klubbdetaljer](clubs-and-places.md) og [verifikasjon](testing.md).

## Klubber, stedsbilder og enklere trening, 23. oktober 2026

Hjem har VYRO-header med ny-innlegg og personsøk til høyre, en enklere aktivitetsfeed og egne stedsbilder. «Løpere» heter nå «Klubber». Private klubber kan opprettes; eier inviterer personer, mottaker godtar/avslår, medlemmer kan forlate og eier kan fjerne medlemmer eller slette klubben. Personsøk/følgefunksjon nås fra både Hjem og Du. Ingen fiktive klubber eller medlemskap vises i vanlig app.

Kilometervarsler og bakgrunnsopptak er flyttet til Innstillinger → Varsler og opptak. Treningskartet før start følger skjermhøyden (300–520 px); Start står fast nederst. Aktiv økt beholder synlige målinger og Pause.

Stedsbilder velges fra bildebibliotek, skaleres til maksimalt 1600 px og komprimeres til JPEG. EXIF/XMP/IPTC og kommentarer fjernes før opplasting. Følgere er standard publikum. Bildene lagres privat med autentisert lesing; de blir aldri treningsøkter, GPS-bevis eller soneforsøk. Dette utvider den tidligere retningen «kun treningsinnlegg» etter brukerens uttrykkelige ønske.

Feed-migreringen `202610230001` og klubb-/bildemigreringene `202610240001` og `202610240002` er aktivert i Supabase etter uttrykkelig godkjenning; seks etterkontroller bestod. Backup-migrering `202610230002` er fortsatt ikke aktivert. Appendringene er lokale, ikke publisert til den eldre offentlige testlenken. Fysisk kontroll av bildevelger, varsler og kart på iOS/Android gjenstår. Se [klubber og bilder](clubs-and-places.md) og [testresultatene](testing.md).

## Felles løperikon, 23. oktober 2026

Den gamle løperstreken og det gamle VYRO-symbolet er erstattet med «Run» fra Tabler Icons. Kartets søkefelt, aktivitetskort, posisjonskort, VYRO-logoen, oppstartsanimasjonen og alle app-/splash-/nettleserikoner bruker samme geometri. VYRO-navnet og fargene er beholdt. Android har også monokromikon for systemtema. PNG-filene kan gjenskapes på alle utviklingsplattformer med `npm run brand:generate`; kilde og MIT-lisens ligger i `mobile/THIRD_PARTY_NOTICES.md`. Ingen trenings-, kart- eller kontofunksjon er endret. Nytt native bygg kreves for å få nye appikoner på telefonen; offentlig testlenke er ikke oppdatert her.

## Kontroll av sosial flyt og soner, 23. oktober 2026 (skymiljø)

Publisering av GPS-økt til Hjem, gjensidig følge/slutte å følge, oppretting av sone, overtakelse og utvidelse består med to isolerte testbrukere. Både gjeldende repo-skjema og eldre database uten de nye feedfunksjonene er kontrollert gjennom nettleseren mot ekte lokale SQL-funksjoner og tilgangsregler. Ingen appfeil ble funnet i disse flytene. Ekte Supabase-kontoer, publisert tjeneste og fysisk GPS gjenstår; se [resultater og avgrensning](testing.md).

## TestFlight-klargjøring, 22. oktober 2026 (skymiljø)

EAS-profiler for butikkbygg og TestFlight, automatisk byggnummer, tidlig kontroll av innloggings-/kartkonfigurasjon og avgrenset kildeopplasting er lagt til. Appen beholder eksisterende Supabase-innlogging og mobilcallback. Kontoer og offentlige miljøinnstillinger må kobles før et ekte bygg kan startes: EAS er ikke innlogget her, og ingen IPA eller TestFlight-opplasting er laget. Se [oppsett og installasjon](testflight.md).

## Kartpanel og satellittbilder, 22. oktober 2026

Kartets rutepanel kan nå dras ned til et lite håndtak og opp igjen. «Dra ned for å se kartet» / «Vis ruten · dra opp» forklarer bevegelsen; trykk og tastatur gir samme funksjon. Detaljer er rullbare på små skjermer, kartknappene flyttes til én rad når de ellers ville blitt dekket, og kamerautsikten tilpasses panelets synlige høyde.

Satellitt bruker et eksplisitt fotografisk rasterlag fra `mapbox://mapbox.satellite`. Hybrid legger samme bildelag over land-/vannflatene og under Standard-kartets veier/etiketter. 2D/3D endrer vinkel/terreng. Et karttypevalg som skjer før kartmotoren er lastet, blir nå respektert. Endringene er lokale; den tidligere offentlige testlenken er ikke oppdatert. Se [kontrollene](testing.md).

## Treningsfunksjoner og design, 22. oktober 2026 (skymiljø)

Treningslogg med søk/filtre, mål for økter/minutter/kilometer, personlige milepæler, kilometertider med valgfrie varsler og «Gjenta denne ruten» er implementert. Du og Fremgang er samlet, opptaksfanen heter Tren, Hjem er forenklet, og treningsknappene tilpasser seg smal skjerm.

Valgfritt bakgrunnsopptak og privat sikkerhetskopiering er implementert i appen. Backup-migreringen er testet lokalt, men **ikke aktivert i Supabase**. Bakgrunns-GPS krever nytt native bygg og fysisk test på iOS/Android. Ingen produksjonsutrulling eller belastningsgaranti. Se [leveransen og avgrensningene](product-improvements.md).

## Pålitelighet og nyttige integrasjoner, 22. oktober 2026 (skymiljø)

Samlet lagring hvert femte sekund under opptak, avgrenset skrivekø, umiddelbar lagring ved pause/avslutning og færre unødvendige skjermoppdateringer er implementert. Oppstart og gamle GPS-utkast har tryggere gjenoppretting uten overskriving ved lesefeil. Eldre GPS-utkast krypteres nå også. Renderfeil pauser opptaket og gir en norsk gjenopprettingsside.

Innloggede kan redigere det faktiske kontonavnet i Supabase. Egne GPS-ruter kan eksporteres som GPX etter et uttrykkelig valg; simuleringer og andre kontoers ruter avvises. GitHub Actions-arbeidsflyt er lagt til for installasjon, kodekontroller, lokale databasetester og eksport på tre plattformer. Ingen produksjonsutrulling eller fysisk mobiltest er utført i denne runden. Se [detaljer og begrensninger](app-reliability.md).


## Kontosesjon og feedytelse, 23. oktober 2026

Hjem beholder ventestatus til kontosesjonen er avklart. Treg oppstart eller et tomt startsvar etter en mislykket tokenfornyelse regnes ikke som utlogging, og eldre startsvar kan ikke overskrive en nyere innlogging eller utlogging. Gjenoppretting kan prøves igjen.

Feeden har sidevisning med stabil markør, virtualisert liste og rutekart som lastes ved åpning. Ny databasefunksjon samler innleggsdata og reaksjoner i ett kall uten å hente hele følgerlisten; sonehendelser har eget avgrenset kall. Løpersøk henter følgestatus bare for de viste profilene. Migreringen er testet lokalt, men er **ikke kjørt i Supabase** fra dette skymiljøet. Appen støtter eksisterende backend mens utrulling gjenstår. Se [backendytelse og utrulling](backend-performance.md).

## Tydelig kontostatus, 23. oktober 2026

Den offentlige nettversjonen skiller nå mellom gjest, ventende e-postbekreftelse og innlogget konto. Alle sider bruker samme sesjon; vellykket e-postcallback oppdaterer denne før navigasjon. Kontosiden venter på gjenoppretting, og utlogging fjerner sesjonen globalt. Ventende bekreftelsesadresse beholdes mellom skjermbytter i samme appøkt, ikke etter full omlasting. 75 tester består. Site URL og eksakt offentlig callback er nå lagret og kontrollert i Supabase. Egen SMTP og full test av offentlig registrering/bekreftelsesmail gjenstår.

## Offentlig testlenke, 23. oktober 2026

Expo-nettversjonen er publisert på https://vyro-xamse.surelark18.chatgpt.site og lagret som «Live link» i VibeOff-utkastet. Kart og simulering kan prøves uten konto, med en egen knapp på kontoskjermen. Ingen demosesjon eller produksjonsdata er lagt i den publiserte pakken. Supabase-redirect for den nye adressen er konfigurert; SMTP gjenstår. Se `web-testing-link.md`.

## Presentasjon på VibeOff, 23. oktober 2026

En 20 sekunders ekte skjermvideo, fem ekte skjermbilder og norsk prosjektbeskrivelse er publisert offentlig på VibeOff som `@hamse`, etter brukerens innlogging og eksplisitte publiseringsbeskjed. Videoen ligger først og viser kart, start, målinger, pause og oppsummering. En separat lokal visning bruker fiktive brukere og eksempeløkter; den samler ikke GPS og skriver ikke til produksjonen. Offentlig innlegg: https://vibeoff.ai/build/vi-bygde-vyro-for-a-gjore-lopeturen-enklere-a-folge-4394bc53. Se `showcase/vibeoff/README.md`. Dette er en prosjektpresentasjon, ikke en produksjonslansering; de gjenstående mobil-, e-post- og personverntestene gjelder fortsatt.

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
