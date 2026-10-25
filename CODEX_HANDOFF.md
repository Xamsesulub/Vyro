# Til Codex på PC: fortsett herfra

Oppdatert 25. oktober 2026 etter oppsett og innloggingstest på PC. Fortsett fra denne statusen, ikke start implementasjonen på nytt.

## Neste oppgave

Google Cloud-prosjektet `vyro-512719` og en Web application OAuth-klient er opprettet. Google er aktivert i **eksisterende Supabase-prosjekt**, og brukeren bekreftet vellykket Google-innlogging på `http://localhost:8081` 25. oktober 2026. Google-flagget er aktivert i PC-ens ignorerte `mobile/.env.local`; Apple er fortsatt av. Hemmeligheter skal ikke kopieres hit.

Neste oppgave er Apple-oppsett, EAS-prosjekt og signering for en egen VYRO-installasjon, deretter fysisk iPhone-test av begge innloggingsvalgene. Sjekk nåværende Apple-/Expo-kontostatus før oppsett. En gammel Google-klienthemmelighet ble erstattet under oppsettet; deaktivering av den gamle er ennå ikke bekreftet.

Les [docs/social-login.md](docs/social-login.md) for konkret oppsett, callback-adresser, krav og akseptansetest. Eieren fullfører selv kontoinnlogging, medlemskap, avtaler og betaling. Ikke be om passord/private nøkler i chatten. Legg leverandørhemmeligheter direkte i Supabase-dashboardet, aldri i Git eller `EXPO_PUBLIC_*`.

## Det vi nettopp har laget

- Valgfritt etternavn ved e-postregistrering. Telefonnummer er droppet etter brukerens valg.
- Etternavn lagres privat i Auth-metadata (`last_name`), separat fra offentlig visningsnavn. Det kan endres eller fjernes under **Innstillinger → Konto og utlogging**. Ingen ny SQL-migrering trengs.
- Google via Supabase PKCE og systemets innloggingsnettleser på iPhone; samme fane på web.
- Apple via den native Apple-knappen, ID-token og nonce på iPhone; Supabase OAuth på web. Apple «Skjul e-postadressen min» er håndtert i koden, men ikke testet med en ekte konto.
- E-postinnlogging beholdes. `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` og `EXPO_PUBLIC_APPLE_AUTH_ENABLED` er **av som standard**. Knappene er skjult før oppsettet er klart. På iPhone krever Google-knappen også at Apple er aktivert og tilgjengelig.
- SDK-kompatible `expo-apple-authentication` og `expo-web-browser` er installert, og `app.json` har Apple Sign in-konfigurasjonen. Behold bundle ID **`app.vyro.mobile`**.
- Appen slår ikke sammen kontoer basert på navn eller ubekreftet e-post. Faktisk kontokobling mellom eksisterende e-postkonto og Google/Apple må testes i Supabase.

Relevante filer: `mobile/src/app/account.tsx`, `mobile/src/features/auth/`, `mobile/src/components/SocialSignIn.tsx`, `mobile/src/components/AccountLastName.tsx`, `mobile/app.json` og `mobile/.env.example`.

## Start på PC-en

1. Les `AGENTS.md` og `mobile/AGENTS.md`. Sjekk `git status` og hent siste `main`; behold eventuelle lokale endringer. Dette arbeidet pushes fra skygrenen `work` til GitHubs `main`.
2. Arbeid i `mobile`, med Node 24.19.0 som i EAS-oppsettet. Kjør `npm ci` etter oppdatering av pakkene.
3. Bruk eksisterende Supabase-prosjekt og lokale offentlige miljøverdier. `mobile/.env.local` skal være ignorert av Git. Ikke opprett ny database eller kjør gamle migreringer på nytt bare fordi denne PC-en er ny.
4. Følg [innloggingsoppsettet](docs/social-login.md). Google trenger en **Web application** OAuth-klient fordi Supabase håndterer leverandørens callback. Skill `https://<prosjekt>.supabase.co/auth/v1/callback` fra appens returadresse `vyro://auth/callback`.
5. Sett opp riktig Apple-team, EAS-prosjekt og signering for en egen VYRO-installasjon. Skymiljøet var ikke logget inn i Expo, og ekte Team ID/EAS-prosjekt er ikke lagt inn i appkonfigurasjonen. Ikke finn på verdier.
6. Test leverandørflaggene i en separat testkonfigurasjon. **Dagens `preview`-profil arver EAS-miljøet `production`**; opprett/velg et eget testmiljø hvis produksjonsverdiene skal holdes uendret. Aktiver produksjonsvalgene etter ekte innloggingstest.
7. Bygg og installer VYRO på fysisk iPhone. Expo Go viser ikke disse innloggingsvalgene. Et nytt QR-bilde eller vanlig Reload erstatter ikke et nytt native bygg/signering.
8. Test ny/eksisterende konto, avbrudd, skjult Apple-e-post, retur til appen, appstart, utlogging og etternavn. Bekreft at Hjem, Du og Innstillinger viser samme kontostatus. Følg hele akseptanselisten i `docs/social-login.md`.

## Verifisert og utestet

Før denne overleveringen bestod **263 tester i 49 suiter**, TypeScript-kontroll og lint uten varsler. iOS Hermes- og webeksport bestod. Expo-introspeksjon bekreftet Apple Sign in-entitlement og lokalisert knapp. Nettleserkontroll ved 390 og 320 piksler bestod med oppdiktet offentlig Supabase-testkonfigurasjon og blokkert nettverk.

**Google-innlogging på lokal web er bekreftet av brukeren.** En lesende kontroll av Supabases Auth-innstillinger ga HTTP 200 med Google aktivert og Apple deaktivert. Apple-innlogging, faktisk kontokobling, full akseptansetest, signering, fysisk iPhone og ny Xcode-kompilering av disse endringene gjenstår. Ingen TestFlight-versjon eller produksjonsflagg er publisert fra dette oppsettet. Se [docs/testing.md](docs/testing.md) for evidens og begrensninger. Midlertidige eksportfiler/skjermbilder i skymiljøets `.expo` og `/tmp` følger ikke med Git.

Ved kodeendringer: kjør `npm run typecheck`, `npm run lint` og relevante tester fra `mobile`. `npm test` kjører hele Jest-pakken. En push kan starte Apple-bygget i GitHub Actions; sjekk den konkrete nye kjøringen før du sier at siste native bygg består.

## Tidligere arbeid som skal beholdes

- Bakgrunnsopptak ved låst skjerm og appbytte er implementert i `cd7dec3`. Det krever egen installasjon og posisjonstilgang «Alltid»/presis posisjon. Helt avslått telefon kan ikke registrere GPS. Se [docs/background-recording.md](docs/background-recording.md).
- Live Activity med tid, kilometer, tempo og periodisk kartutsnitt er implementert, men fysisk låseskjermtest gjenstår. Det er ikke full Apple Kart-navigasjon.
- Apple Watch-app og privat synkronisering til iPhone er implementert. Den eldre kjøringen for `0901069` kompilerte Watch og iPhone med Xcode 27.1; det beviser ikke fysisk funksjon eller at et senere bygg består. Se [docs/apple-watch.md](docs/apple-watch.md).
- Snittempo er testet med full distansepresisjon; skjermbildene beviser ikke lik GPS-måling som Strava. Se [docs/pace-comparison.md](docs/pace-comparison.md).
- Behold eksisterende kart, soner, sosial funksjon og oblig-materiale. Brukeren trakk tilbake den gamle forespørselen om å slette oblig-materialet.

Fortsett med konto- og byggeoppsettet sammen med brukeren, og oppdater denne meldingen når status endres.
