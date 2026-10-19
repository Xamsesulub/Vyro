# VYRO · Move Beyond

En React Native-app for iOS og Android. Første leveranse er en norsk, interaktiv **visuell prototype** med Expo og TypeScript. All treningsdata er eksempeldata eller simuleringer.

## Start

Node.js 22.13 eller nyere anbefales for den installerte Expo SDK 58-versjonen.

```sh
cd mobile
npm ci
npm start
```

Skann QR-koden med en Expo Go-versjon som støtter SDK 58. Telefon og utviklingsmaskin må kunne nå hverandre på nettverket. Ved SDK-mismatch: bruk en kompatibel Expo Go-versjon eller en development build. Ingen konto, API-nøkler eller posisjonstillatelser kreves for demoen.

```sh
npm run web        # nettleserforhåndsvisning; illustrasjon i stedet for native kart
npm run typecheck
npm run lint
npm test
npm run export:web
```

For en lokal forhåndsvisning av eksporten: `node scripts/preview.cjs`, deretter åpne `http://127.0.0.1:8101`. Stopp serveren med Ctrl+C. Kjør eksporten før serveren startes.

På Windows, bruk `npm.cmd` hvis PowerShell blokkerer npm.ps1. Native iOS-bygg krever macOS eller EAS. Ingen betalte tjenester er opprettet.

## Det som er implementert

- Onboarding med aktivitet, ukemål, erfaring og valgfritt navn.
- Hjem, Tren, Fremgang, Fellesskap og Profil med Expo Router.
- Mørkt og lyst tema, norsk tekst og original VYRO-identitet.
- Diskret Reanimated trykkfeedback; rolige kort uten inngangsanimasjon.
- Native kart på telefon; en tydelig merket ruteillustrasjon på web.
- Simulator med start/pause/fortsett, oppsummering, lokal lagring og sletting.
- Gjenoppretting av simulatoren i pauset tilstand etter omstart.
- Interaktive diagrammer, lokalt ukemål, eksempelaktiviteter og lokale sosiale demo-interaksjoner.
- Originalt appikon og splash-konfigurasjon.

Prototypen ber ikke om GPS-tillatelse. Native kart laster kartfliser fra plattformens kartleverandør. Treningsdata lastes ikke opp. AsyncStorage brukes bare til ikke-sensitive prototypeinnstillinger og simuleringer; dette er ikke den endelige lagringsløsningen for GPS-ruter eller autentisering.

## Neste leveranse

Supabase/PostgreSQL, autentisering og RLS kommer i fase 3. Expo Location og fysisk verifisert GPS-tracking kommer i fase 4. Sosial backend, ekte ruteanbefalinger og AI kommer senere. Brukeren krever REA i videre analysearbeid; verktøyet må være tilgjengelig gjennom MCP før dette kan gjennomføres. REA er ingen runtime-avhengighet. Se [designreferansene](docs/design-references/strava/README.md).

Se [roadmap](docs/roadmap.md), [arkitektur](docs/architecture.md), [designsystem](docs/design-system.md) og [testplan](docs/testing.md).
