# Arkitektur

## Første milepæl

`mobile/src/app` inneholder bare Expo Router-ruter. Skjermene bruker komponenter fra `components`, forretningsfunksjoner fra `features` og Zustand fra `stores`. Temaet ligger i `theme`.

`features/tracking/simulator.ts` er en deterministisk simulator uten GPS. Den bruker en eksplisitt tilstandsmaskin og tidsstempler, ikke antall timer-callbacks. UI oppdateres én gang per sekund. Bakgrunnsbytte pauser økten. Det persisterte øktbildet er alltid pauset, slik at omstart ikke skaper fiktiv treningsdistanse.

`useAppStore` persisterer profilvalg, demointeraksjoner, økter og aktiv simulator i AsyncStorage. Lagrede økter har eksplisitt `source` og `visibility`. Eksempeløkter er separate fra brukerens lokale simuleringer. Skjermene merker blandede datasett. Lagringsfeil vises i UI. Dette er prototypepersistens, ikke en garantert journal for reelle opptak.

Native kart bruker `react-native-maps`. `.web.tsx`-varianten viser en original SVG-illustrasjon og importerer ingen native kartkode. Ruten er fast og illustrativ, ikke et navigasjonsforslag eller et GPS-resultat.

## Videre arkitektur

- Expo Location + Task Manager som plattformadapter, testet med development builds.
- SQLite-journal for ekte aktivitetsmålinger før nettverksopplasting.
- Supabase Auth med sikker tokenlagring og PostgreSQL med RLS.
- Idempotente opplastinger med klientgenerert økt-ID og sekvensnummer per punkt.
- TanStack Query når serverdata introduseres; ingen servercache uten backend nå.
- REA brukes kun ved et relevant og autorisert teknisk analysebehov.

Ingen betalt tjeneste, EAS-build, Supabase-prosjekt eller ekstern publisering er opprettet.
