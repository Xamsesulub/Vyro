# Supabase-tilkobling

VYRO bruker det eksisterende Supabase-prosjektet i skyen. Databasen og kontoene er ikke bundet til én PC. De fire migreringene i `supabase/migrations` ble tidligere rullet ut gjennom SQL Editor. Ikke kjør dem på nytt bare fordi dashboardets migreringshistorikk er tom.

## Ny PC

Opprett `mobile/.env.local` fra `.env.example`. Fyll inn `EXPO_PUBLIC_SUPABASE_URL` og `EXPO_PUBLIC_SUPABASE_KEY` med prosjektets offentlige `sb_publishable_`-nøkkel fra dashboardet. Behold Mapbox-nøkkelen. Filen er ignorert av Git; aldri legg service-role eller `sb_secret_` i appen. Restart Expo etter endringer.

Klienten i `mobile/src/lib/supabase.ts` bruker SecureStore på native med migrering fra eldre AsyncStorage. Web bruker nettleserlagring; serverrendering lagrer ikke sesjoner. Tokenfornyelse følger appens aktive tilstand. Fetch-adapteren begrenser hvert nettverksforsøk til 12 sekunder før responsen kommer. SDK-ens bakgrunnsfornyelser kan fortsatt gjøre nye forsøk.

## Bekreftelse og glemt passord

Konfigurert 23. oktober i Authentication → URL Configuration:

- Site URL: `http://localhost:8081/account`
- Redirect URL: `http://localhost:8081/auth/callback`
- Redirect URL: `vyro://auth/callback`

Legg til faktisk HTTPS-adresse før webpublisering. På telefon betyr localhost telefonen selv; bruk mobilappens deep link i et development build eller en tilgjengelig HTTPS-adresse.

Nye signup-/recovery-lenker bruker PKCE og må åpnes i samme nettleser/app som startet forespørselen. `auth/callback` utveksler koden og sender recovery videre til `auth/new-password`. Eldre tokenfragmenter støttes via Supabase `setSession`; URL-påstander gir aldri tilgang alene. Utgåtte lenker gir norsk feilmelding. Router erstatter callback-ruten etter vellykket behandling.

Registrering uten sesjon viser at e-post må bekreftes, aldri at brukeren er innlogget. Bekreftelsen kan sendes på nytt. Glemt passord sender en gjenopprettingslenke; passordet endres først når brukeren selv lagrer et nytt.

## E-post før lansering

Egen SMTP er **ikke konfigurert** per 23. oktober. Supabases innebygde tjeneste har mottaker- og hastighetsbegrensninger. Koble til en e-postleverandør med verifisert avsenderdomene i Authentication → Emails → SMTP Settings før åpen registrering. SMTP-hemmeligheter hører kun hjemme der, aldri i Expo. E-postbekreftelse er fortsatt påkrevd.

Se [Supabases SMTP-veiledning](https://supabase.com/docs/guides/auth/auth-smtp).

## Kontroll

Fra `mobile`: kjør `node scripts/check-supabase.cjs`, `node scripts/test-database.cjs`, `node scripts/test-turf-database.cjs` og `npm test`.

Live-kontrollen leser Auth-innstillinger, kontrollerer anonym tilgang med `limit=0` og måler ett avvist innloggingsforsøk med en tilfeldig reservert adresse. Den oppretter ingen kontoer, sender ingen e-post og henter ingen kundeposter. Auth kan logge forsøket. Den beviser ikke vellykket innlogging eller eierpolicyer mellom autentiserte brukere; PGlite tester sistnevnte isolert.

Gjeldende evidens og utestede steg står i `docs/testing.md`. Fullført nyregistrering, faktisk e-postlevering, to ekte kontoer og fysisk enhet må fortsatt verifiseres før lansering.
