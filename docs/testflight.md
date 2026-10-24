# VYRO på TestFlight

## Status

TestFlight-oppsettet er klargjort lokalt. Ingen signert IPA er bygget, ingen Apple-opplasting er utført, og ingen TestFlight-invitasjon finnes fra denne økten. Ved siste kontokontroll meldte EAS CLI «Not logged in» og byggforsøket stoppet med «An Expo user account is required to proceed». Expo-prosjekt-ID, Apple-signering/App Store Connect-tilgang og offentlige Supabase-innstillinger må kobles til i skymiljøet. iOS bruker nå Apple Maps uten Mapbox-nøkkel. Oppdaterte testresultater og iOS JavaScript-eksport står i `testing.md`; det erstatter ikke et signert bygg.

`mobile/eas.json` bruker butikkdistribusjon også for TestFlight, EAS-miljøet `production`, automatisk byggnummer fra EAS og fysisk iPhone som mål. Innsendingen velger riktig Apple-app interaktivt første gang. Ingen oppdiktet Expo-ID, Apple-ID eller demokonto er satt inn.

Brukeren har bekreftet at Expo-konto og Apple Developer-medlemskap mangler. Neste økt kan fortsette med apputvikling; TestFlight krever først at disse kontoene opprettes og kobles til. Den offentlige web-testlenken og produksjonsdatabasen er ikke oppdatert med de lokale endringene.

## Koble kontoene én gang

Et aktivt [Apple Developer-medlemskap](https://developer.apple.com/account/) og en [Expo-konto](https://expo.dev/signup) trengs. Bruk eksisterende VYRO-prosjekt og Apple-team hvis disse allerede finnes. Kjør fra `mobile` i en terminal du kontrollerer:

```sh
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest init
```

`init` kobler appen til Expo og lagrer `extra.eas.projectId` i `app.json`. Velg riktig eier/prosjekt. Behold `app.vyro.mobile` som bundle identifier hvis dette er registrert på ditt Apple-team. Ikke endre identiteten til en eksisterende Apple-app. Første bygg leder deg gjennom Apple-innlogging, tofaktor og signering. Passord, tofaktorkoder, signeringsfiler og API-nøkler skal ikke inn i chat eller Git.

## Innlogging og kart i selve appen

I Expo-prosjektets **Environment variables**, legg inn disse variablene for **production** med synlighet **Sensitive** eller **Plain text**:

| Variabel | Verdi |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | HTTPS-adressen til det eksisterende Supabase-prosjektet som har VYRO-kontoene |
| `EXPO_PUBLIC_SUPABASE_KEY` | Prosjektets offentlige `sb_publishable_`-nøkkel |

Disse verdiene bygges inn i appen. Synlighet «Sensitive» skjuler dem i byggelogger, men gjør dem ikke hemmelige i appen. Bruk aldri Supabase service-role/`sb_secret_` eller andre serverhemmeligheter i `EXPO_PUBLIC_`. Apple MapKit på iOS trenger verken karttoken eller MapKit JS-oppsett. Mapbox er bare beholdt i web-forhåndsvisningen.

Kontroller innstillingene uten å starte et skybygg:

```sh
npx eas-cli@latest env:exec --environment production "npm run release:check"
```

Kontrollen kjøres også automatisk før EAS installerer avhengighetene. Den avviser manglende/feilformatert konfigurasjon og kjente servernøkler i offentlige variabler, uten å skrive verdiene til loggen. Den beviser ikke at nøklene har tilgang eller at en ekte bruker kan logge inn. Lokale `.env.local`-filer lastes ikke opp; EAS må ha egne verdier. Vanlig lokal utvikling og frakoblet eksport krever ikke denne utgivelseskontrollen.

I Supabase **Authentication → URL Configuration**, kontroller at `vyro://auth/callback` er tillatt. Behold eksisterende HTTPS-callback for web. TestFlight-appen bruker samme Supabase-kontoer som web når prosjektinnstillingene er de samme. En eksisterende, bekreftet konto kan logge inn med e-post/passord uten å motta en ny e-post hver gang. Nyregistrering, bekreftelse og glemt passord krever fungerende e-postlevering; egen SMTP er fortsatt uavklart i gjeldende dokumentasjon. Ikke slå av e-postbekreftelse for å omgå dette.

Bekreftelses- og gjenopprettingslenker må åpnes på telefonen som startet forespørselen, og tilbake i VYRO, fordi PKCE-verifikatoren er lagret der. Innlogging lagres i iOS Keychain gjennom SecureStore. Lokalt navn eller ventende e-postbekreftelse gir aldri en innlogget sesjon.

## Bygg og last opp

Etter at kontoer og miljøvariabler er koblet, kjør fra `mobile`:

```sh
npm run typecheck
npm run lint -- --no-cache
npm test
npm run ios:testflight
```

Siste kommando kjører `eas build --platform ios --profile testflight --auto-submit`. Følg EAS-lenkene til både bygg og innsending; et ferdig bygg er ikke bevis på vellykket opplasting. Hvis opplastingen feiler etter et vellykket bygg, bruk `npm run ios:submit` og velg det aktuelle bygget i stedet for å bygge på nytt. Kjør fra denne komplette arbeidskopien, eller push og hent endringene før bygging på en annen maskin.

`submit.testflight.ios` er tom med hensikt inntil riktig Apple-app velges. Etter første oppsett kan appens numeriske `ascAppId` fra **App Store Connect → App Information → Apple ID** lagres der. Automatisert innsending uten terminaldialog krever også konfigurert App Store Connect API-nøkkel i EAS. Ikke bruk bundle identifier som `ascAppId`.

Apple kan be om informasjon om kryptering. Appen bruker HTTPS, Keychain og AES-GCM via Expo Crypto. Avklar svarene mot faktisk implementasjon; `usesNonExemptEncryption` er ikke fylt inn automatisk bare for å slippe dialogen.

## Installer og logg inn på iPhone

1. Installer [TestFlight fra App Store](https://apps.apple.com/app/testflight/id899247664).
2. Når Apple har behandlet opplastingen, åpne **App Store Connect → VYRO → TestFlight**.
3. Opprett en intern testgruppe, legg til bygget og deg selv som tester fra App Store Connect-teamet. Fullfør eventuelle krav Apple viser før distribusjon.
4. Åpne invitasjonen på iPhonen og installer VYRO. Apple-kontoen brukes til distribusjonen; inne i VYRO bruker du VYRO-kontoens e-post og passord.

Eksterne testere krever egen gruppe og kan kreve Beta App Review. Innsending til TestFlight publiserer ikke automatisk appen offentlig i App Store.

## Kontroll på telefonen

- Logg inn med en ekte bekreftet VYRO-konto. Hjem, Du og Innstillinger skal vise samme innloggede bruker. Start appen på nytt og kontroller at kontoen gjenopprettes uten innloggingsside på Hjem.
- Test registrering/bekreftelse og glemt passord fra telefonen med faktisk e-postlevering. En avvist/utløpt lenke skal vise feil, ikke gi tilgang. Logg ut og sjekk at private data ikke vises for neste konto.
- Kontroller satellittbilder og rutepanelets drag på iPhone. Test GPS, pause, låst skjerm og bakgrunnsopptak fysisk.
- Feed- og backupmigreringene `202610230001` og `202610230002` er fortsatt ikke rullet ut fra dette miljøet. Se `backend-performance.md` og `product-improvements.md` før disse funksjonene erklæres klare for betabruk.

`.easignore` beholder oblig-/presentasjonsmaterialet i repoet, men utelater det og lokale miljø-/signeringsfiler fra EAS-opplastingen. Web-testlenken oppdateres separat.

Kilder: [EAS-konfigurasjon](https://docs.expo.dev/build/eas-json/), [miljøvariabler](https://docs.expo.dev/eas/environment-variables/), [byggnummer](https://docs.expo.dev/build-reference/app-versions/), [TestFlight](https://docs.expo.dev/submit/testflight/), [innsending](https://docs.expo.dev/submit/ios/).
