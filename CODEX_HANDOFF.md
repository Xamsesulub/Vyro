# Til Codex på PC: fortsett herfra

Oppdatert 26. oktober 2026 etter forenkling av soner og retting av Google-valgets tilgjengelighet. PC-push `b0039b1` («Google test bestått») og designrunden er bevart. Fortsett fra denne statusen, ikke start implementasjonen på nytt.

## Siste arbeid: enklere soner

**Kart → Soner** åpner nå egne og venners soner med «Legg ut sone». Kort flyt: velg tur → se kart/navn → eksplisitt publiser. Fast knapp og feilmeldinger, serverbekreftelse og gjenfinning av eksisterende forsøk. «Mine» inkluderer også soner du opprettet før andre overtok dem. Serverfiltrering før sidegrensen erstatter den feilaktige globale 100-grensen; detaljer hentes direkte etter ID. Aktivitetssiden har «Legg ut som sone» / «Send soneforsøk».

Ingen endring av GPS-/personvernkrav, konkurranseregler, Google-oppsett eller database. Ingen nye migreringer/pakker/native konfigurasjon. **307 tester / 56 suiter**, typecheck, lint, 35 sonekontroller i PGlite og iOS/web-eksport består. Mobil nettlesertest bruker lokal PostgreSQL og oppdiktede data; fysisk iPhone/ekte Supabase skal fortsatt kontrolleres. Brukerens tre historiske forsøk er ikke lest eller endret. Se nyeste [testavsnitt](docs/testing.md) og [soneflyt](docs/social-and-turf.md).

## Siste retting: Google ved registrering og innlogging

Google er aktivert som standard i den versjonerte koden når Supabase finnes. Aktiveringen lå tidligere bare i PC-ens ignorerte `.env.local`, og en ekstra iPhone-regel skjulte Google når Apple ikke var klar. Den avhengigheten er fjernet. Apple er fortsatt av som standard. `.env.example` bruker nå Google=true; et uttrykkelig Google=false i eldre lokal-/EAS-miljø overstyrer fortsatt standarden og må fjernes/endres hvis Google ønskes.

Både «Opprett konto» og «Logg inn» tilbyr «Fortsett med Google» uten at VYROs navne-/e-post-/passordfelt må fylles ut. Supabase oppretter nye Google-brukere eller gjenbruker eksisterende konto via samme PKCE-flyt. Ingen nye Google-/Supabase-kontoer, nøkler eller serverendringer. Expo Go får en forklaring og e-postalternativ; faktisk Google på iPhone krever VYROs egen installasjon. **291 tester / 54 suiter**, typecheck, lint og iOS/web-eksport uten Google-/Apple-flagg består. Nettlesertesten verifiserer begge Google-valg og PKCE-retur til Hjem med mockbackend, også etter reload/utlogging. Les nyeste verifikasjon i `docs/testing.md` og oppdatert oppsett i `docs/social-login.md`.

## Nyeste arbeid: Hjem, Du og innstillinger

Brukeren ba om Strava-inspirert design på referansebildenes sider, særlig Innstillinger, og riktig Hjem etter innlogging. Dette er implementert med VYROs egen merkevare. Detaljene står øverst i [docs/roadmap.md](docs/roadmap.md) og [docs/strava-feature-map.md](docs/strava-feature-map.md).

- Ny introduksjon med tre sider, «Kom i gang» og «Logg inn». Gyldig sesjon hopper over introduksjonen; Hjem har uketall, blandet aktivitetsstrøm og privat GPS-logg. Oppdatering beholder innlegg ved nettfeil, og kontobytte forkaster gamle svar.
- Du: Fremgang/Aktiviteter/Mer, 12 uker, aktive dager/uker på rad, eksisterende ukemål og treningsfiltre. Simuleringer/eksempler teller aldri. Følgere/følger er faktiske backendtall og lister, ikke lokale eksempler.
- Rediger profil: offentlig visningsnavn + valgfrie **private** etternavn, biografi, sted og hovedidrett i Auth-metadata. Ikke flytt dem til en offentlig tabell uten en ny produktbeslutning. «Del profil» deler bare offentlig navn/brukernavn; ingen falsk profil-URL.
- Innstillinger: egne sider for konto/e-post/passord, personvern, data/sikkerhetskopi, utseende, kart, Hjem/eksempler og hjelp. Trening/Watch beholder eksisterende funksjon med nytt toppfelt. Systemtema, standardkart, startstrøm og kontobundet delingsforvalg lagres. Ingen nye pakker/migreringer/native innstillinger.
- Første kontroll på PC/iPhone: last siste kode og test Hjem etter innlogging/omstart, Du-fanene, profil-Lagre med tastaturet åpent, små/store tekststørrelser, mørkt/systemtema og kartvalget i både Kart og Tren. Sjekk ekte følgerantall, lagring/feil og e-postbekreftelse mot eksisterende Supabase. Ikke publiser testinnlegg uten å velge det selv.

## Neste oppgave

Google Cloud-prosjektet `vyro-512719` og en Web application OAuth-klient er opprettet. Google er aktivert i **eksisterende Supabase-prosjekt**, og brukeren bekreftet vellykket Google-innlogging på `http://localhost:8081` 25. oktober 2026. Google-flagget er aktivert i PC-ens ignorerte `mobile/.env.local`; Apple er fortsatt av. Hemmeligheter skal ikke kopieres hit.

Neste oppgave er Apple-oppsett, EAS-prosjekt og signering for en egen VYRO-installasjon, deretter fysisk iPhone-test av begge innloggingsvalgene. Sjekk nåværende Apple-/Expo-kontostatus før oppsett. En gammel Google-klienthemmelighet ble erstattet under oppsettet; deaktivering av den gamle er ennå ikke bekreftet.

Les [docs/social-login.md](docs/social-login.md) for konkret oppsett, callback-adresser, krav og akseptansetest. Eieren fullfører selv kontoinnlogging, medlemskap, avtaler og betaling. Ikke be om passord/private nøkler i chatten. Legg leverandørhemmeligheter direkte i Supabase-dashboardet, aldri i Git eller `EXPO_PUBLIC_*`.

## Det vi nettopp har laget

- Valgfritt etternavn ved e-postregistrering. Telefonnummer er droppet etter brukerens valg.
- Etternavn lagres privat i Auth-metadata (`last_name`), separat fra offentlig visningsnavn. Det kan endres eller fjernes under **Du → Rediger profil** (og den eldre Konto-siden). Ingen ny SQL-migrering trengs.
- Google via Supabase PKCE og systemets innloggingsnettleser på iPhone; samme fane på web.
- Apple via den native Apple-knappen, ID-token og nonce på iPhone; Supabase OAuth på web. Apple «Skjul e-postadressen min» er håndtert i koden, men ikke testet med en ekte konto.
- E-postinnlogging beholdes. Google er **på som standard** med konfigurert Supabase på web/egen iPhone-installasjon. Apple er av som standard og uavhengig av Google. Se rettingen øverst.
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
7. Bygg og installer VYRO på fysisk iPhone. Expo Go forklarer at Google krever egen installasjon eller web, og bruker e-post som alternativ. Et nytt QR-bilde eller vanlig Reload erstatter ikke et nytt native bygg/signering.
8. Test ny/eksisterende konto, avbrudd, skjult Apple-e-post, retur til appen, appstart, utlogging og etternavn. Bekreft at Hjem, Du og Innstillinger viser samme kontostatus. Følg hele akseptanselisten i `docs/social-login.md`.

## Verifisert og utestet

Siste designrunde består **280 tester i 53 suiter**, TypeScript-kontroll og lint uten varsler. iOS Hermes- og webeksport består. Nettleserkontroll ved 390 og 320 piksler består for gjest/innlogget Hjem, profilfaner/redigering, følgelister, innstillingsvalg, kryptert lagring/omstart, nettfeil/nytt forsøk og utlogging. Dette bruker oppdiktede testdata og mockbackend; ingen ekte konto-/e-postendringer er utført. Tidligere Expo-introspeksjon bekreftet Apple Sign in-entitlement og lokalisert knapp. Se nyeste avsnitt i `docs/testing.md` for fysisk akseptanseliste.

**Google-innlogging på lokal web er bekreftet av brukeren.** En lesende kontroll av Supabases Auth-innstillinger ga HTTP 200 med Google aktivert og Apple deaktivert. Apple-innlogging, faktisk kontokobling, full akseptansetest, signering, fysisk iPhone og ny Xcode-kompilering av disse endringene gjenstår. Ingen TestFlight-versjon er publisert og ingen EAS-/servermiljøverdier er endret. Googles klientstandard er nå aktivert i koden, som beskrevet øverst. Se [docs/testing.md](docs/testing.md) for evidens og begrensninger. Midlertidige eksportfiler/skjermbilder i skymiljøets `.expo` og `/tmp` følger ikke med Git.

Ved kodeendringer: kjør `npm run typecheck`, `npm run lint` og relevante tester fra `mobile`. `npm test` kjører hele Jest-pakken. En push kan starte Apple-bygget i GitHub Actions; sjekk den konkrete nye kjøringen før du sier at siste native bygg består.

## Tidligere arbeid som skal beholdes

- Bakgrunnsopptak ved låst skjerm og appbytte er implementert i `cd7dec3`. Det krever egen installasjon og posisjonstilgang «Alltid»/presis posisjon. Helt avslått telefon kan ikke registrere GPS. Se [docs/background-recording.md](docs/background-recording.md).
- Live Activity med tid, kilometer, tempo og periodisk kartutsnitt er implementert, men fysisk låseskjermtest gjenstår. Det er ikke full Apple Kart-navigasjon.
- Apple Watch-app og privat synkronisering til iPhone er implementert. Den eldre kjøringen for `0901069` kompilerte Watch og iPhone med Xcode 27.1; det beviser ikke fysisk funksjon eller at et senere bygg består. Se [docs/apple-watch.md](docs/apple-watch.md).
- Snittempo er testet med full distansepresisjon; skjermbildene beviser ikke lik GPS-måling som Strava. Se [docs/pace-comparison.md](docs/pace-comparison.md).
- Behold eksisterende kart, soner, sosial funksjon og oblig-materiale. Brukeren trakk tilbake den gamle forespørselen om å slette oblig-materialet.

Fortsett med konto- og byggeoppsettet sammen med brukeren, og oppdater denne meldingen når status endres.
