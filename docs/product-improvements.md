# Treningslogg, bakgrunnsopptak og privat sikkerhetskopi

Forslagene fra produktgjennomgangen er implementert i den lokale koden, 22. oktober 2026. Ingen ny produksjonsutrulling er utført. Oblig-/VibeOff-materialet er beholdt.

## Funksjoner og design

| Område | Implementert | Avgrensning |
| --- | --- | --- |
| Du og treningslogg | Én oversikt med kompakt profil, uketall, mål, milepæler og virtualisert historikk. Søk på navn, aktivitet, denne uken/måneden og månedsskiller. | Simuleringer og eksempler har egne valg og teller aldri i egne mål. Andre kontoers GPS-økter vises ikke. |
| Ukemål | Antall økter, minutter eller kilometer; alle aktiviteter eller valgt sport. Rediger direkte på Du-siden. | Mål lagres per konto på enheten. Tidligere lokalt distansemål brukes som utgangspunkt. |
| Milepæler | Lengste egne GPS-økt og mest aktive uke. | Ingen oppdiktede fartsrekorder fra gjennomsnittstider. |
| Kilometertider | Nye GPS-opptak får kilometertider beregnet ved kryssing mellom aksepterte GPS-punkter, med pauser trukket fra. Valgfri tale eller vibrasjon. | Eldre økter får ingen konstruerte splittider. Lyd, vibrasjon og låst skjerm må kontrolleres fysisk; iOS-stillemodus kan hindre tale. |
| Gjenta rute | Egne lagrede GPS-ruter kan legges bak et nytt spor. Gammel rute lilla, eget spor grønt, tekst forklarer fargene. | Visuell veiledning, ingen svingvarsler. Konkurransebevis/sonevalg kopieres ikke, og ingen økt publiseres automatisk. |
| Tren og Hjem | «Registrer» heter «Tren»; «Prøv uten GPS» er sekundært. Hjem har mindre overskrift, trekk-for-å-oppdatere og tilgjengelig oppdateringsknapp. Tom feed tilbyr å starte økt eller finne løpere. | Funksjonene for opptak og sosial deling er beholdt. |
| Små skjermer | Fortsett/Fullfør stables ved smal skjerm eller stor systemskrift. Kartvalg som ikke får plass skjules, posisjonsknappen beholdes. SVG for forstørr/forminsk. | Visuelt kontrollert ved 320 × 640 på web. Native systemskrift og landskap krever fysisk test. |

## GPS med låst skjerm

«Fortsett med låst skjerm» er et uttrykkelig valg på mobil. SDK 58 `expo-location` og `expo-task-manager` registrerer en toppnivåoppgave før Router starter. Android bruker foreground service med synlig opptaksvarsel; iOS bruker location-bakgrunnsmodus og indikator. Tillatelsesdialogen kommer ved Start/Fortsett. Avslag eller feil gir forklaring og starter ikke opptaket.

Forgrunnsvakten deaktiveres når bakgrunnstjenesten er aktiv. Pause, fullfør og kontobytte stopper bakgrunnstjenesten; en sen posisjon fra før gjenopptak forkastes. Uten aktiv bakgrunnstjeneste pauser appen når den legges i bakgrunnen. Web har fortsatt bare forgrunnsopptak.

Tid beregnes fra aktivt segment, ikke fra antall timerkall, slik at suspenderte JS-timere ikke mister tid. Lokale sjekkpunkter tas omtrent hvert femte sekund. iOS-lagringsnøkkelen bruker `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY`, slik at den kan brukes etter første opplåsing også mens skjermen er låst. Et gjenåpnet utkast er alltid pauset. En kald bakgrunnsprosess uten aktiv innlogget opptaker stopper innsamlingen; tvangsavslutning/omstart er ikke støttet som kontinuerlig trening.

**Nytt native development-/release-build og fysisk test er nødvendig.** Hermes-eksport beviser at JavaScript-pakken kan bygges; det er ingen APK/IPA, batterimåling eller bevis på OS-oppførsel med låst skjerm.

## Privat sikkerhetskopi

Innstillinger har et eget valg per konto/enhet. Bare egne fullførte GPS-økter overføres: hele ruten med pausegrenser, tid, distanse, kilometertider, navn og private notater. Simuleringer, eksempler, Auth-data, turf-bevis og sosiale innlegg kopieres ikke. Sikkerhetskopien gir serverstyrt eierisolasjon, ikke ende-til-ende-kryptering. Lokal lagring er fortsatt kryptert.

Migreringen `202610230002_private_backups.sql` oppretter en separat, uforanderlig tabell med eierbasert RLS, validerte felt/ruter, størrelsesgrenser, sletting med konto og 60 skriveforsøk/minutt per konto. Den sammensatte primærnøkkelen støtter eierens liste og hindrer duplikater. Ingen feed har tilgang til denne tabellen. Klienten sender opptil 40 ventende økter per synkroniseringsrunde og lagrer kvittering først etter vellykket svar. Mistet svar tåles ved idempotent opplasting.

Automatisk synkronisering skjer når appen er åpen: ved innlogging, aktivering, lagring og med ett minutts mellomrom. Nettverkskall har eksisterende 12-sekunders grense; feil beholder lokale data og køen for senere forsøk. Kontobytte/utkobling avviser sene svar. Oppdagelse henter bare økt-ID-er i sider på 200; manglende innhold hentes fem økter om gangen. ID-listen gjennomgås på nytt, slik at samtidige innsettinger ikke blir borte bak et tidsstempel. Eksisterende lokale økter overskrives ikke.

På ny telefon logger brukeren inn og aktiverer privat sikkerhetskopi. Lokalt slettede økter forblir skjult på den enheten til brukeren velger «Gjenopprett også lokalt slettede økter». «Slett sikkerhetskopier i skyen» krever en egen bekreftelse, stopper synkronisering på enheten og beholder lokale økter. Andre aktiverte enheter kan fortsatt sende nye økter. Ukemål, kontoinnstillinger og konkurransebevis følger ikke med denne øktsikkerhetskopien.

**Migreringen er ikke kjørt i produksjonen.** Dette miljøet har ingen Supabase-administratortilgang. Uten tabellen forklarer appen at sikkerhetskopiering ikke er aktivert på serveren, og beholder øktene lokalt. Kjør migreringen etter feed-migreringen og test med to ekte kontoer/enheter før lansering. RLS, idempotens og isolasjon er kontrollert i lokal PostgreSQL; fysisk/flerbrukerproduksjonstest gjenstår.

## Kontrollert og gjenstående

Se [testing](testing.md) for automatiske kontroller, nettleserflyter og feltprøver som gjenstår. Mapbox-nøkkel mangler i dette miljøet; kartets tomtilstand er kontrollert, men ekte kartfliser og sporing er ikke visuelt testet her. Ingen kapasitet under samtidige produksjonsbrukere er attestert.
