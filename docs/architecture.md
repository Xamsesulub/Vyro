# Arkitektur

Expo Router-skjermer bruker delte komponenter, Zustand og Supabase. Hvit bakgrunn er standard. Henos sitt LiveMap og GPS-opptak er integrert med eksisterende konto- og delingsfunksjoner.

LocationWatcher er én posisjonsabonnent i forgrunnen. simulator.ts håndterer både GPS og tydelig merket simulering; bare GPS-observasjoner gir ekte distanse. Upresise koordinater, jitter og umulige hopp filtreres. Pauser og signalgap lager separate segmenter.

useAppStore lagrer private økter og avbrutte opptak lokalt. Lagret rute bruker breakBefore ved segmentgrenser. Ved omstart er opptaket pauset. WorkoutMap bruker LiveMap både for historikk og delte økter. Kartplattformene er beskrevet nedenfor.

Supabase Auth identifiserer eier. publish_workout lagrer aktivitet og offentlig delt snapshot atomisk og idempotent, med rute og målinger, uten private notater. Supabase RLS avgrenser tilgang. Simuleringer kan ikke deles som GPS. Turf-konkurranser er fortsatt eksempelbasert, ikke serververifiserte resultater.

Den tidligere /record-gps-ruten tilbyr gjenoppretting av eldre lokale utkast og leder deretter til det felles opptaket. REA brukes for runtime-inspeksjon, ikke som appavhengighet.

## Kartplattformer, oppdatert 24. oktober 2026

Metro velger `LiveMap.ios.tsx` på iPhone og `LiveMap.web.tsx` i nettleser. iOS bruker Apple MapKit via `react-native-maps` med standard provider. `AppleMap` tegner segmenterte polylinjer og markører lokalt og styrer kamera/nord/3D uten å starte posisjonsinnsamling. LocationWatcher er fortsatt ansvarlig for faktiske posisjoner. `appleGeometry.ts` beholder pausegrenser, også i turf-overlegg. iOS-adressesøk bruker Expo Locations native Apple-geokoding; det krever ingen kartnøkkel eller brukerposisjon.

Web-forhåndsvisningen beholder Mapbox GL JS 3 (`mapbox-gl-v3`), med GeoJSON-adapter i `features/maps/geometry.ts` og eget `search.web.ts`. Native Mapbox-pakke/plugin er fjernet. Android er utsatt og viser en eksplisitt utilgjengelig-tilstand dersom den startes manuelt. `app.json` angir iOS og web som aktive plattformer. Ingen CARTO-fliser eller MapKit JS brukes.
