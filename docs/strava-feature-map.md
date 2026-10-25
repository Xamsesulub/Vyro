# VYRO – funksjonskart mot Strava

## Apple Watch, 25. oktober 2026

En første watchOS-app med GPS-opptak, økttall, HealthKit-puls og privat synkronisering til iPhone er implementert. Ingen generell Health-import eller Garmin/Wear OS-støtte. Usignert iPhone-/Watch-simulatorbygg består i GitHub Actions. Signering og fysisk klokketest gjenstår; funksjonen er ikke godkjent som ferdig enhetsstøtte. Se [klokkestatus og oppsett](apple-watch.md).

## iOS først, 24. oktober 2026

iPhone bruker Apple Maps med separate Standard/Satellitt/Hybrid-valg, lokale rute-/turf-overlegg, pausegrenser, følgekamera, nord og 3D-visning. Adressesøk bruker Apples geokoder, uten POI-autofullføring. Eget høydekurvelag er ikke tilgjengelig i iOS-adapteren. Android/Samsung er utsatt; web er fortsatt en Mapbox-forhåndsvisning. Automatiske tester og eksport består, fysisk iPhone-test gjenstår. Kartbyttet gir ikke automatisk offline kart, ruteplanlegging eller Strava-varmekart.

## Gjeldende tillegg, 23. oktober 2026

Hjem har feed med treningsinnlegg og separate stedsbilder, oppretting og personsøk til høyre. Du har også Finn venner. Klubber erstatter Løpere: private klubber, eierinvitasjoner, aksept/avslag, medlemsliste og utmelding/fjerning er implementert. Tilhørende database og privat bildelagring er aktive i Supabase. Varsler og opptak har egen innstillingsside; treningskartet før start er større. VYROs farger og norsk språk beholdes. Dette er egen implementasjon inspirert av brukerens referanser, ikke kopierte Strava-assets.

Åpne klubber har egen sideinndelt oppdagelsesliste og direkte innmelding. Private klubber beholder invitasjonskravet. Eier kan endre synlighet. VYROs egen nye løper/ordmerke erstatter tidligere merkevareikoner, og overflødig hjelpetekst på Tren er fjernet.

Klubbchat, klubbfeed, organisert arrangementsplanlegging, moderering/blokkering og reaksjoner på stedsbilder er ikke implementert. Fysisk mobiltest gjenstår; se [testing](testing.md). Historiske tabeller nedenfor beskriver tidligere faser, ikke dagens fulle status.

Oppdatert 20. oktober 2026. Brukeren ønsker Stravas funksjonsomfang og enklere, lys utforming. Dette er målbildet, ikke en erklæring om full funksjonslikhet.

Kilder: [Strava Help Center](https://support.strava.com/en-us/), [abonnementsfunksjoner](https://support.strava.com/en-us/articles/15402044-what-features-are-included-in-a-strava-subscription), [Runkeepers treningsskjerm](https://help.runkeeper.com/en/hc/understanding-your-android-tracking-screen), samt brukerens seks Strava-skjermbilder. Funksjoner varierer med plattform og abonnement; listen grupperer funksjoner og er ikke en fullstendig spesifikasjon av alle Strava-detaljer.

| Område | Implementert i VYRO | Gjenstår |
| --- | --- | --- |
| Hjem | Lokal aktivitetsfeed, detaljer | Følgere, ekte sosial feed, kudos, kommentarer, bilder |
| Kart | Egen fane, native eksempelkart; web-illustrasjon | Rutesøk, ruteplanlegger, lagrede ruter, navigasjon, offline kart, varmekart |
| Registrer | Aktivitetsvalg, simulert tid/distanse/tempo, pause, fortsett, avslutt, privat lokal lagring | Ekte GPS, bakgrunnsopptak, sensorer, autostopp, runder, live-deling |
| Grupper | Faner for Utfordringer og Klubber med ærlig tomtilstand | Konto, søk, medlemskap, klubber, utfordringer, rangering, moderering |
| Du | Profil, Fremgang/Aktiviteter/Mer, treningslogg, ukemål, innstillinger | Følgere, synkronisering, rekorder, relativ prestasjon, treningsbelastning, utstyr |
| Segmenter | Ikke implementert | Segmentmatching, rekorder, rangering og live-segmenter |
| Integrasjoner | Ikke implementert | Garmin, Apple Watch, Health, import/eksport og øvrige enheter |
| Konto og betaling | Ikke implementert | Supabase Auth, PostgreSQL/RLS, abonnement, eksport og kontosletting |

Fjernet fra den synlige flyten: firetrinns introduksjon, erfaringsspørsmål, bevegelsesmiks, dekorative mål-ringer, fiktiv påmelding/heiarop, egen Fremgang-hovedfane og lange motivasjons-/personvernkort. Lagrede økter beholdes. Ingen eksisterende økter blir endret til ekte GPS-opptak.

Lys bakgrunn er standard. Eksisterende versjon-0-profiler migreres én gang til lyst tema, med økter og øvrige valg bevart. Mørkt tema er fortsatt et valg under innstillinger. VYRO beholder sitt eget navn, ikon og fargeidentitet.

## Historisk status 20. oktober 2026 (erstatter prototypestatus over)

- Kart: ekte Mapbox på web og native-adapter, full kartflate, blå faktisk posisjon, Standard/Satellitt/Hybrid, 2D/3D, POI/høydekurver, nord opp, stedsøk, lokalt bokmerkede egne GPS-ruter/merkede eksempelruter og lengdefilter. Stedsøk er ikke anbefalinger av løperuter. Native og fysisk GPS må fortsatt verifiseres på enhet.
- Konto og sosialt: Supabase Auth, PostgreSQL/RLS, følgerforhold og deling av GPS-økter er implementert. Ende-til-ende-test med to bekreftede brukere gjenstår.
- Opptak: Henos sin Expo Location-flyt med private GPS-økter og pausegrenser er integrert. Ingen bakgrunns-GPS eller simulatorpublisering.
- Turf: egen Soner-flyt med serverberegnet overtakelse og valgfri utvidelse, revisjonskontroll og feedhendelser er implementert og testet lokalt. Produksjonsmigrering 004 er aktiv etter eksplisitt godkjenning og vellykket etterkontroll. Dette er VYROs løypekonkurranse, ikke Strava-segmentparitet eller attestert fysisk løping. Se `social-and-turf.md`.
- Mangler fortsatt fra kartreferansen: Strava-varmekart, vinterkart, ruteplanlegger, automatisk ruteforslag, underlags-/høyde-/vanskelighetsfiltre, offline kart og svingnavigasjon.

## Oppdatert status 22. oktober 2026 (skymiljø)

Treningsoversikt, søk/filtre, fleksible ukemål, milepæler, kilometertider/varsler og gjentakelse av egen rute er implementert. Tren erstatter fanenavnet Registrer. GPX-eksport og kontonavnredigering finnes. Valgfritt bakgrunnsopptak krever nytt mobilbygg/fysisk test; privat sikkerhetskopiering krever utrulling av ny RLS-migrering. Ingen automatisk simulatorpublisering. Se [produktforbedringer](product-improvements.md) og [testing](testing.md) for faktisk verifikasjon.
