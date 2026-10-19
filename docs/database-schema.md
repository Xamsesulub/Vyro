# Planlagt database — ikke implementert

Fase 3 oppretter Supabase-migrasjoner først når auth- og datakontraktene er avklart. Ingen SQL er kjørt og ingen backend er koblet til.

Kjernen blir `profiles`, `user_preferences`, `activities`, `activity_points`, `activity_splits` og `goals`. Alle private poster må ha eier-ID knyttet til `auth.users`. Et punkt identifiseres av `(activity_id, sequence)` for å hindre duplikater. Økter har klientgenerert UUID og privat synlighet som standard.

Senere domener: `achievements`, `user_achievements`, `follows`, `reactions`, `comments`, `clubs`, `club_members`, `challenges`, `challenge_participants`, `notifications`, `user_blocks`, `reports`.

Presise rutepunkter får eierbasert RLS uavhengig av aktivitetens sosiale synlighet. Offentlig deling må bruke en separat og personvernbehandlet representasjon. Policyer skal testes med ulike brukere, anonyme forespørsler, blokkering og direkte tilgang til punkt-tabellen.
