# Leveranseplan

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
