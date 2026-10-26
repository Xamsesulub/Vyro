# VYRO på TestFlight

## Status

Kontrollert på PC 26. oktober 2026: EAS er innlogget som `xamse10`, og appen er koblet til [@xamse10/vyro](https://expo.dev/accounts/xamse10/projects/vyro), prosjekt-ID `a7a8d578-5dbe-4bae-8835-b54a0a5469c5`. EAS-miljøet `preview` har eksisterende Supabase-adresse og offentlig klientnøkkel, Google=true og Apple=false. Apple-medlemskap, innlogging og Team ID `YACWFNB642` er bekreftet. Apple har registrert de nye iOS-ID-ene og appgruppen; EAS har aktive ad hoc-profiler for hovedapp, widget og Watch med den registrerte iPhonen. **[Preview-bygg 1](https://expo.dev/accounts/xamse10/projects/vyro/builds/ece64080-7b92-44cc-94c2-6ec168efc98d) er ferdig** (`FINISHED`, `0.1.0`, signert IPA, Xcode `ARCHIVE SUCCEEDED`). Åpne lenken i Safari på den registrerte iPhonen for installasjon. Fysisk funksjon er fortsatt utestet; ingen TestFlight-innsending er startet.

`mobile/eas.json` bruker butikkdistribusjon også for TestFlight, EAS-miljøet `production`, automatisk byggnummer fra EAS og fysisk iPhone som mål. Innsendingen velger riktig Apple-app interaktivt første gang. Ingen oppdiktet Expo-ID, Apple-ID eller demokonto er satt inn.

Den interne `preview`-profilen bruker nå sitt eget EAS-miljø `preview`; den arver ikke lenger produksjonsvariablene. Produksjonsmiljøet er ikke konfigurert i denne runden. Google på fysisk iPhone er fortsatt utestet. iOS bruker Apple Maps uten Mapbox-nøkkel.

For å teste låst skjerm og appbytte uten å gå via TestFlight først, finnes nå en intern `preview`-profil. Etter samme konto-/signeringsoppsett registreres iPhonen med `npx eas-cli@latest device:create`, og `npm run ios:preview` lager et eget installasjonsbygg uten Metro-server. Expo Go støtter ikke denne funksjonen på iPhone. Se [bakgrunnsopptak og fysisk testplan](background-recording.md).

## Koble kontoene én gang

Et aktivt [Apple Developer-medlemskap](https://developer.apple.com/programs/enroll/) trengs for fysisk iPhone-distribusjon via EAS. Expo-prosjektet er allerede koblet til. På en ny maskin logger du inn i den eksisterende Expo-kontoen; ikke opprett et nytt prosjekt:

```sh
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

`app.json` inneholder allerede riktig eier og `extra.eas.projectId`. iOS bruker nå `app.vyro.xamse10` som bundle identifier: Apple avviste den tidligere `app.vyro.mobile` som utilgjengelig for teamet ved første signering 26. oktober 2026. Widget-/Watch-ID og appgruppe følger samme nye prefiks. Android-ID er uendret. Første bygg leder deg gjennom Apple-innlogging, tofaktor og signering. Eieren fullfører medlemskap, avtaler og eventuell betaling selv. Passord, tofaktorkoder, signeringsfiler og API-nøkler skal ikke inn i chat eller Git.

## Innlogging og kart i selve appen

I Expo-prosjektets **Environment variables** er disse satt for **preview** med synlighet **Sensitive**. Kontroller og sett produksjonsverdier separat før TestFlight:

| Variabel | Verdi |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | HTTPS-adressen til det eksisterende Supabase-prosjektet som har VYRO-kontoene |
| `EXPO_PUBLIC_SUPABASE_KEY` | Prosjektets offentlige `sb_publishable_`-nøkkel |
| `EXPO_PUBLIC_GOOGLE_AUTH_ENABLED` | `true` i preview |
| `EXPO_PUBLIC_APPLE_AUTH_ENABLED` | `false` inntil Apple-oppsett og testing er fullført |

Disse verdiene bygges inn i appen. Synlighet «Sensitive» skjuler dem i byggelogger, men gjør dem ikke hemmelige i appen. Bruk aldri Supabase service-role/`sb_secret_` eller andre serverhemmeligheter i `EXPO_PUBLIC_`. Apple MapKit på iOS trenger verken karttoken eller MapKit JS-oppsett. Mapbox er bare beholdt i web-forhåndsvisningen.

Kontroller innstillingene uten å starte et skybygg:

```sh
npx eas-cli@latest env:exec preview "npm run release:check"
```

Kontrollen kjøres også automatisk før EAS installerer avhengighetene. Den avviser manglende/feilformatert konfigurasjon og kjente servernøkler i offentlige variabler, uten å skrive verdiene til loggen. Den beviser ikke at nøklene har tilgang eller at en ekte bruker kan logge inn. Lokale `.env.local`-filer lastes ikke opp; EAS må ha egne verdier. Vanlig lokal utvikling og frakoblet eksport krever ikke denne utgivelseskontrollen.

I Supabase **Authentication → URL Configuration**, kontroller at `vyro://auth/callback` er tillatt. Behold eksisterende HTTPS-callback for web. TestFlight-appen bruker samme Supabase-kontoer som web når prosjektinnstillingene er de samme. En eksisterende, bekreftet konto kan logge inn med e-post/passord uten å motta en ny e-post hver gang. Nyregistrering, bekreftelse og glemt passord krever fungerende e-postlevering; egen SMTP er fortsatt uavklart i gjeldende dokumentasjon. Ikke slå av e-postbekreftelse for å omgå dette.

Bekreftelses- og gjenopprettingslenker må åpnes på telefonen som startet forespørselen, og tilbake i VYRO, fordi PKCE-verifikatoren er lagret der. Innlogging lagres i iOS Keychain gjennom SecureStore. Lokalt navn eller ventende e-postbekreftelse gir aldri en innlogget sesjon.

## Bygg og last opp

For første interne iPhone-test: fullfør medlemskap/Team ID og signering nedenfor, registrer telefonen med `npx eas-cli@latest device:create`, og kjør `npm run ios:preview`. Installer via lenken fra et vellykket bygg. Dette bygger inn JavaScript og trenger ikke Metro. TestFlight er et separat distribusjonssteg; det er ikke startet automatisk.

Appen har nå også et Apple Watch-mål. Faktisk Team ID `YACWFNB642` er satt som `expo.ios.appleTeamId` i `mobile/app.json`, og EAS må signere både `app.vyro.xamse10.watchkitapp` og det eksisterende widget-målet. Se [Apple Watch-oppsettet](apple-watch.md) for byggekontroll, installasjon og fysisk akseptansetest. Klokkestøtten er ikke prøvd i et signert bygg her.

Etter at kontoer og miljøvariabler er koblet, kjør fra `mobile`:

```sh
npm run typecheck
npm run lint -- --no-cache
npm test
npm run ios:testflight
```

Siste kommando kjører `eas build --platform ios --profile testflight --auto-submit`. Følg EAS-lenkene til både bygg og innsending; et ferdig bygg er ikke bevis på vellykket opplasting. Hvis opplastingen feiler etter et vellykket bygg, bruk `npm run ios:submit` og velg det aktuelle bygget i stedet for å bygge på nytt. Kjør fra denne komplette arbeidskopien, eller push og hent endringene før bygging på en annen maskin.

`submit.testflight.ios` er tom med hensikt inntil riktig Apple-app velges. Etter første oppsett kan appens numeriske `ascAppId` fra **App Store Connect → App Information → Apple ID** lagres der. Automatisert innsending uten terminaldialog krever også konfigurert App Store Connect API-nøkkel i EAS. Ikke bruk bundle identifier som `ascAppId`.

Apple kan be om informasjon om kryptering. Kontroll 26. oktober 2026 bekreftet at AES-GCM i installert Expo Crypto bruker Apples CryptoKit på iOS, i tillegg til HTTPS og Keychain. Eieren svarte ja på EAS-spørsmålet om standard/unntatt kryptering; EAS satte `ITSAppUsesNonExemptEncryption=false` i `ios.infoPlist`. Vurder på nytt hvis krypteringsimplementasjonen endres.

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
