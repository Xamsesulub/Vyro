# Leveranseplan

1. **Fundament:** Expo, TypeScript, Router, Zustand, Reanimated, semantiske temaer, lint og tester. Implementert.
2. **Visuell prototype:** onboarding, fem faner, eksempelhistorikk, simuleringsflyt, lokale innstillinger, diagrammer, ikon og splash. Implementert; telefon- og tilgjengelighetstest gjenstår før fasen godkjennes.
3. **Backend:** Supabase/PostgreSQL, autentisering, e-postverifisering, profiler, RLS, kontosletting og eksport. Ikke startet.
4. **Tracking:** Expo Location, journalføring, GPS-filtrering, pauser, bakgrunnskjøring, offline kø og gjenoppretting. Krever faktiske enhetstester.
5. **Analyse:** statistikk fra ekte opptak, personlige rekorder, mer fleksible mål og splittider.
6. **Sosialt:** følgefunksjon, kommentarer, klubber, utfordringer, blokkering, rapportering og moderering.
7. **Intelligent:** lisensierte rutetjenester, AI-trener og valgfrie integrasjoner etter stabil grunnfunksjonalitet.
8. **Lansering:** sikkerhetsgjennomgang, ytelse, personvern, tilgjengelighet, E2E og butikkoppsett.

Ikke bland simulerte og ekte økter ved migrering. Prototypeøkter skal ikke oppgraderes til ekte treningsopptak.

UX-prioritet: enkel trening først. Målinger og pause skal være umiddelbart tilgjengelige. Hjem og fellesskap er forenklet med kortere innhold og færre dekorative flater. Ingen nye funksjoner før grunnflyten er behagelig å bruke.

REA-basert nettleserkontroll er startet via CLI. Startvisningen for trening er skilt fra aktive målinger, og fellesskapet bruker enklere seksjoner. Se `docs/analysis/README.md` for evidens og avgrensning; dette er fortsatt en prototype med simulering.
