# Sosial aktivitetsfeed og voksende soner

## Tillegg 23. oktober 2026: klubber og stedsbilder

Etter brukerens nye bestilling kan Hjem også vise egne stedsbilder uten tilknyttet økt. De ligger i `place_posts` og privat Storage, aldri i `activities` eller turf-tabellene. GPS- og konkurransekravene nedenfor er uendret. Private klubber har invitasjoner og eksplisitt medlemskap; ingen automatisk deling av medlemmers turer eller bilder til klubben. Implementasjon, aktive migreringer og begrensninger beskrives i [klubber og stedsbilder](clubs-and-places.md).

Oppdatert 20. oktober 2026. Supabase Auth, følgerforhold og eksplisitt deling av GPS-økter er implementert. Migreringer 001–003 er aktive. Migrering 004 er aktiv i produksjon etter eksplisitt godkjenning og vellykket etterkontroll 20. oktober 2026. Ingen testsoner publiseres til Supabase.

## Konkurranseregelen

En sone er en sammenhengende løype for løping. Utfordreren må passere hele den gjeldende traseen i samme retning. Laveste totaltid mellom løypas start og mål vinner; pauser inngår. Lik tid beholder eieren.

Etter lagring kan løperen velge:

- **Send forsøk:** overta den eksisterende løypa hvis tiden er bedre.
- **Overta og utvid:** slå tiden på den eksisterende løypa, og legg til resten av den synlige, sammenhengende turen. Utvidelsen må være minst 100 m.

Eksempel: Henos eier 3 km på 18 minutter. Xamse passerer samme løype på 17 minutter og løper 2 km videre. Ved eksplisitt utvidelse blir hele 5 km-løypa Xamses sone. Den nye rekorden er Xamses totaltid på alle 5 km. Neste utfordrer må løpe hele den nye løypa. Den gamle løypa beholdes som uendret prefiks; dette er løypesoner, ikke eierskap til geografiske flater.

## Brukerflyt — klubbsoner, 30. oktober 2026

Dette erstatter den tidligere følgerbaserte sonevisningen. Kart → **Soner** viser sonene i én valgt klubb. Klubbvalget viser medlemsantall. Det finnes også en inngang fra klubbens egen side. **Soner** er kartet; **Resultater** viser medlemmene rangert etter eide soner og deretter samlet løypelengde. Medlemmer uten soner er med, og like resultater deler plassering.

- En kartnål viser eierens profilbilde/navn, aldri direktesendt posisjon. Fargene er stabile per eier. Den fargede korridoren følger den delte løypa; den innebærer ikke eierskap til alle gater innenfor en innrammet flate.
- Velg en nål eller løypesone for å se kortet med navn, eier, lengde og tiden å slå. **Se sonen** åpner hele den autoriserte løypa og eksisterende konkurransehandlinger.
- **Legg ut sone → velg klubb → velg lagret løpetur → se over kart/navn → Legg ut sone.** Klubbvalget arves fra kartet og kan endres før innsending. Valg av tur laster ikke opp GPS-data. Delingsknappen navngir klubbpublikummet.
- Kvittering og idempotens beholdes: samme økt lager ikke flere soner eller et ekstra forsøk i en annen klubb. Feil beholder tur/navn for nytt forsøk.
- Kartet henter 40 soner om gangen med avgrenset visningsgeometri (omtrent 182 punkter per løype). Detaljvisningen beholder hele løypa. Resultatlisten henter 50 medlemmer om gangen. Knappen Oppdater og retur til skjermen henter ny status; dette er ikke sanntidsdeling av posisjon.
- Hjem viser de tre siste synlige klubbhendelsene. Følgerrelasjoner er ikke lenger grunnlaget for sonetilgang. Vanlige øktinnlegg beholder sine egne regler.
- Uten soner vises en tomtilstand med mulighet til å legge ut klubbens første sone. Det finnes ingen produksjonseksempler.
- Nåværende eier kan trekke tilbake sonen med bekreftelse. Privat originaløkt beholdes. Simuleringer kan aldri vinne en sone.

## Server og personvern

`202610200004_growing_turfs.sql` oppretter `turfs`, `turf_attempts`, `turf_events` og den opprinnelige valideringsfunksjonen `submit_turf_run`. Fra 30. oktober er denne utilgjengelig for klienter; `submit_club_turf_run` håndhever klubbmedlemskap, målklubb og synlig eier før den bruker samme validering. Klienten kan ikke skrive eierskap, tider, hendelser eller forsøk direkte. RPC kontrollerer auth, aktivitetstype, koordinater, nøyaktighet, tidsrekkefølge, signalhull, fart, løypedekning og valgt utvidelse. Kilder merket simulering avvises.

- Raden låses under overtakelse. Klienten må sende gjeldende revisjon; et forsøk mot en endret løype avvises for ny vurdering.
- En lås og unik kvittering per bruker/lokal økt gjør gjentatt innsending idempotent. Samme økt kan brukes til ett innsendt soneforsøk; et avvist valideringsforsøk oppretter ingen kvittering.
- Maksimalt fem godkjente innsendinger per bruker/minutt. RPC-feil ruller tilbake transaksjonen, også telleren; dette er ikke et fullstendig vern mot nettverksmisbruk.
- Konkurranse krever nye GPS-tidsstempler. De lagres kryptert lokalt via eksisterende lagringsadapter. Eldre økter uten slike data oppgraderes ikke automatisk.
- Fra 28. oktober skjermes 200 m rundt hele øktens start/slutt før innsending, med samme radius som øktinnlegg. Ingen sammenkobling gjennom skjulte områder. Flere adskilte synlige deler må tas opp på nytt som en sammenhengende tur. Minst 200 m synlig, sammenhengende løype må fortsatt være igjen; korte turer kan derfor mangle konkurranseløype.
- Bare det synlige utsnittet med tidsstempler sendes til kontroll. Serveren lagrer geometri, totaltid og resultat, ikke rå nøyaktighet/tidsstempler. Den private originalen ligger fortsatt på enheten.
- Konkurranseløypa og sonehendelser er, etter uttrykkelig deling, synlige for nåværende medlemmer av valgt klubb, med gjensidig blokkering respektert. Også eieren må fortsatt være medlem. Utmelding skjuler eierens soner; gjeninnmelding gjør dem aktive igjen. Eldre soner uten klubb er eierprivate og publiseres ikke automatisk. Vanlige øktinnlegg beholder egne delingsregler.

## Toleranser og kjente grenser

Kontrollen er en konservativ sekvensiell GPS-matching: endepunkter innen 15 m, fremdrift mot kontrollpunkter innen 25 m, korridor 35 m, 95–110 % av løypelengden. GPS-nøyaktighet maksimalt 30 m; steg maksimalt 40 m og 12 m/s. Hull over 15 sekunder aksepteres bare ved høyst 10 m forflytning, og aldri over én time. Hele tidsintervallet telles. Nye spor må være fra siste syv dager. Synlig løype må være 200 m–100 km.

Dette er ikke en attestering av fysisk løping. En modifisert klient kan forfalske plausible GPS-data. Komplekse sløyfer, parallelle stier, tett bymiljø og uvanlige samplingsintervaller må felttestes før generell lansering. Ingen premier eller offisiell rangering. Avviste opptak skal aldri få eierskap.

## Historisk verifikasjon — 20. oktober 2026

51 Jest-tester, typecheck, lint, web-export, 38 eksisterende databasekontroller og 35 nye sonekontroller bestod. REA kjørte hele opt-in/utvidelse/resultat/feed-flyten ved 390 × 844 mot en isolert lokal PGlite-database, med syntetiske data tydelig merket i skjermen. Null page-errors/console-hendelser. Evidens: `evidence/rea-growing-turf.json` og `evidence/growing-turf.png`.

Fysisk GPS-test på iOS/Android og konkurranse mellom to ekte kontoer gjenstår. Ingen påstand om full Strava-paritet.

## Verifikasjon av klubbsoner — 30. oktober 2026

58 nye isolerte databasekontroller dekker 20 medlemmer, eierskifter, nullresultater, sideinndeling, idempotens, revisjoner, utmelding, blokkering og avviste skriver mellom klubber. Hele databasepakken har 680 beståtte kontroller. Dette er ikke en belastningstest med 20 samtidige telefoner. Oppdatert app- og enhetsteststatus står i [testing.md](testing.md).
