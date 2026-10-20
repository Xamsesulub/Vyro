# Sosial aktivitetsfeed og voksende soner

Oppdatert 20. oktober 2026. Supabase Auth, følgerforhold og eksplisitt deling av GPS-økter er implementert. Migreringer 001–003 er aktive. Migrering 004 er aktiv i produksjon etter eksplisitt godkjenning og vellykket etterkontroll 20. oktober 2026. Ingen testsoner publiseres til Supabase.

## Konkurranseregelen

En sone er en sammenhengende løype for løping. Utfordreren må passere hele den gjeldende traseen i samme retning. Laveste totaltid mellom løypas start og mål vinner; pauser inngår. Lik tid beholder eieren.

Etter lagring kan løperen velge:

- **Send forsøk:** overta den eksisterende løypa hvis tiden er bedre.
- **Overta og utvid:** slå tiden på den eksisterende løypa, og legg til resten av den synlige, sammenhengende turen. Utvidelsen må være minst 100 m.

Eksempel: Henos eier 3 km på 18 minutter. Xamse passerer samme løype på 17 minutter og løper 2 km videre. Ved eksplisitt utvidelse blir hele 5 km-løypa Xamses sone. Den nye rekorden er Xamses totaltid på alle 5 km. Neste utfordrer må løpe hele den nye løypa. Den gamle løypa beholdes som uendret prefiks; dette er løypesoner, ikke eierskap til geografiske flater.

## Brukerflyt

- Kart → **Soner**: egne soner og soner fra faktiske følgerforhold, eller alle soner. Listen viser inntil 100 nylig oppdaterte soner.
- Hver sone viser kart, eier og gjeldende lengde/tid. «Løp denne løypa» åpner eksisterende opptaker. Etter lagring: **Bruk økten i en sone**, velg sone og lagret GPS-løpetur.
- Alternativt opprett en ny sone fra egen lagret løpetur.
- Kartforhåndsvisning, valgfri utvidelse og avkrysning for deling kreves før innsending. Ingen automatisk opplasting.
- Hjem viser de tre siste sonehendelsene fra deg og dem du følger, f.eks. «Xamse har tatt over sonen til Henos. Utvidet til 5 km.» Dette er feedinnhold, ikke pushvarsler.
- Nåværende eier kan trekke tilbake sonen med bekreftelse. Sonehendelser og forsøk fjernes sammen med sonen.
- Private ruter og eksempel-turfs i det tidligere kartpanelet er fortsatt separat merket. Simuleringer blir aldri konkurranseforsøk.

## Server og personvern

`202610200004_growing_turfs.sql` oppretter `turfs`, `turf_attempts`, `turf_events` og RPC `submit_turf_run`. Klienten kan ikke skrive eierskap, tider, hendelser eller forsøk direkte. RPC kontrollerer auth, aktivitetstype, koordinater, nøyaktighet, tidsrekkefølge, signalhull, fart, løypedekning og valgt utvidelse. Kilder merket simulering avvises.

- Raden låses under overtakelse. Klienten må sende gjeldende revisjon; et forsøk mot en endret løype avvises for ny vurdering.
- En lås og unik kvittering per bruker/lokal økt gjør gjentatt innsending idempotent. Samme økt kan brukes til ett innsendt soneforsøk; et avvist valideringsforsøk oppretter ingen kvittering.
- Maksimalt fem godkjente innsendinger per bruker/minutt. RPC-feil ruller tilbake transaksjonen, også telleren; dette er ikke et fullstendig vern mot nettverksmisbruk.
- Konkurranse krever nye GPS-tidsstempler. De lagres kryptert lokalt via eksisterende lagringsadapter. Eldre økter uten slike data oppgraderes ikke automatisk.
- Før innsending skjermes 500 m rundt hele øktens start/slutt. Ingen sammenkobling gjennom skjulte områder. Flere adskilte synlige deler må tas opp på nytt som en sammenhengende tur. Korte turer kan derfor mangle konkurranseløype.
- Bare det synlige utsnittet med tidsstempler sendes til kontroll. Serveren lagrer geometri, totaltid og resultat, ikke rå nøyaktighet/tidsstempler. Den private originalen ligger fortsatt på enheten.
- Konkurranseløypa og sonehendelser er, etter eget samtykke, synlige for innloggede løpere. Vanlige øktinnlegg beholder separat følgerpublikum og egne delingsregler.

## Toleranser og kjente grenser

Kontrollen er en konservativ sekvensiell GPS-matching: endepunkter innen 15 m, fremdrift mot kontrollpunkter innen 25 m, korridor 35 m, 95–110 % av løypelengden. GPS-nøyaktighet maksimalt 30 m; steg maksimalt 40 m og 12 m/s. Hull over 15 sekunder aksepteres bare ved høyst 10 m forflytning, og aldri over én time. Hele tidsintervallet telles. Nye spor må være fra siste syv dager. Synlig løype må være 200 m–100 km.

Dette er ikke en attestering av fysisk løping. En modifisert klient kan forfalske plausible GPS-data. Komplekse sløyfer, parallelle stier, tett bymiljø og uvanlige samplingsintervaller må felttestes før generell lansering. Ingen premier eller offisiell rangering. Avviste opptak skal aldri få eierskap.

## Verifikasjon

51 Jest-tester, typecheck, lint, web-export, 38 eksisterende databasekontroller og 35 nye sonekontroller bestod. REA kjørte hele opt-in/utvidelse/resultat/feed-flyten ved 390 × 844 mot en isolert lokal PGlite-database, med syntetiske data tydelig merket i skjermen. Null page-errors/console-hendelser. Evidens: `evidence/rea-growing-turf.json` og `evidence/growing-turf.png`.

Fysisk GPS-test på iOS/Android og konkurranse mellom to ekte kontoer gjenstår. Ingen påstand om full Strava-paritet.
