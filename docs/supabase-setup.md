# Supabase-tilkobling

Innlogging, sosial klientkode og en testet databasemigrering er senere lagt til. Utrulling til Supabase er fullført 20. oktober 2026. Se `live-social-setup.md` for gjeldende funksjonsstatus.

Prosjektet er konfigurert lokalt i `mobile/.env.local`, som er ignorert av Git. Kopier `.env.example` ved oppsett på en ny maskin. Bruk `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_KEY` med en publishable key. Ingen service-role-nøkkel skal inn i appen.

`mobile/src/lib/supabase.ts` oppretter én klient. Native sesjoner lagres med AsyncStorage, og tokenfornyelse følger appens aktive tilstand. Web bruker klientens nettleserlagring; serverrendering lagrer ikke sesjoner. Manglende konfigurasjon lar den lokale prototypen fungere videre uten klient.

Kjør `node scripts/check-supabase.cjs` fra mobile for en skrivebeskyttet kontroll av Auth settings. Kontrollen skriver ikke ut nøkler, oppretter ikke brukere og endrer ingen databaseposter. Den verifiserer ikke tabeller, RLS eller innlogging som bruker.

20. oktober 2026: Auth svarte HTTP 200 med oppgitt publishable key; e-postinnlogging er aktivert. Innloggingsskjerm, databasemigreringer og synkronisering er fortsatt ikke implementert. Lokale eksempelinnlegg blir ikke lastet opp. Restart Expo eller eksporter på nytt etter miljøvariabelendringer.

Klientoppsettet følger https://supabase.com/docs/guides/auth/quickstarts/react-native.

