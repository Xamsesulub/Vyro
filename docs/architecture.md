# Arkitektur

Expo Router-skjermer bruker delte komponenter, Zustand og Supabase. Hvit bakgrunn er standard. Henos sitt LiveMap og GPS-opptak er integrert med eksisterende konto- og delingsfunksjoner.

LocationWatcher er én posisjonsabonnent i forgrunnen. simulator.ts håndterer både GPS og tydelig merket simulering; bare GPS-observasjoner gir ekte distanse. Upresise koordinater, jitter og umulige hopp filtreres. Pauser og signalgap lager separate segmenter.

useAppStore lagrer private økter og avbrutte opptak lokalt. Lagret rute bruker breakBefore ved segmentgrenser. Ved omstart er opptaket pauset. WorkoutMap bruker Henos sitt LiveMap både for historikk og delte økter: react-native-maps på mobil, pakket Leaflet med lyse CARTO-fliser på web. Valgfri Mapbox-konfigurasjon beholdes.

Supabase Auth identifiserer eier. publish_workout lagrer aktivitet og offentlig delt snapshot atomisk og idempotent, med rute og målinger, uten private notater. Supabase RLS avgrenser tilgang. Simuleringer kan ikke deles som GPS. Turf-konkurranser er fortsatt eksempelbasert, ikke serververifiserte resultater.

Den tidligere /record-gps-ruten tilbyr gjenoppretting av eldre lokale utkast og leder deretter til det felles opptaket. REA brukes for runtime-inspeksjon, ikke som appavhengighet.
