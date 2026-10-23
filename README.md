# VYRO · Move Beyond

En norsk React Native-app for iOS og Android med Expo og TypeScript. Den nyere versjonen har lyst design, Mapbox, GPS-opptak i forgrunnen og Supabase-innlogging og deling. Eksempeldata og simuleringer holdes atskilt fra ekte GPS-økter. Fysisk verifikasjon på telefon gjenstår.

## Start

Node.js 22.13 eller nyere anbefales for den installerte Expo SDK 58-versjonen.

```sh
cd mobile
npm ci
npm start
```

Native kart bruker `@rnmapbox/maps` og krever et development build; Expo Go inneholder ikke Mapbox-modulen. Nettleserforhåndsvisningen kan brukes uten et native bygg.

På en ny PC må `mobile/.env.local` kopieres fra det eksisterende lokale oppsettet eller fylles ut etter `mobile/.env.example`. Filen er ignorert av Git og følger ikke med når prosjektet hentes. Mapbox krever en offentlig `pk.`-nøkkel; Supabase krever prosjekt-URL og en publishable key. Se [Mapbox-oppsett](docs/mapbox-setup.md) og [Supabase-oppsett](docs/supabase-setup.md). Uten disse vises oppsettsmeldinger for kart og innlogging. Backend kjører hos Supabase og har ingen egen lokal startkommando i dette prosjektet.

```sh
npm run web -- --localhost --port 8081
npm run typecheck
npm run lint
npm test
npm run export:web
```

For en lokal forhåndsvisning av eksporten: `node scripts/preview.cjs`, deretter åpne `http://127.0.0.1:8101`. Stopp serveren med Ctrl+C. Kjør eksporten før serveren startes.

På Windows, bruk `npm.cmd` hvis PowerShell blokkerer npm.ps1. Native iOS-bygg krever macOS eller EAS. Ingen betalte tjenester er opprettet.

## Det som er implementert

- Onboarding med aktivitet, ukemål, erfaring og valgfritt navn.
- Hjem, Kart, Registrer, Løpere og Du med Expo Router; fremgang ligger under Du.
- Lyst tema som standard, valgfritt mørkt tema, norsk tekst og VYRO-identitet.
- Reanimated-animasjoner og trykkfeedback med støtte for redusert bevegelse.
- Mapbox på web og native, kartkontroller og rutevisning.
- Separat simulator og GPS-opptak i forgrunnen, med pause, oppsummering og lokal lagring.
- Kryptert lokal øktlagring og gjenoppretting i pauset tilstand etter omstart.
- Supabase-innlogging, registrering med e-postbekreftelse og passordgjenoppretting; aktivitetsfeed, følgerelasjoner og eksplisitt deling av GPS-økter.
- Turf-funksjoner og PostgreSQL-migreringer; faktisk GPS og flerbrukerflyt må fortsatt verifiseres på enhet.
- Originalt appikon og splash-konfigurasjon.

GPS krever posisjonstillatelse. Private økter publiseres ikke automatisk; simuleringer kan ikke deles som ekte økter. Deling har en egen forhåndsvisning og bekreftelse. Oppsett og tidligere backend-verifikasjon er dokumentert i [live-social-setup](docs/live-social-setup.md), [sosialt og turf](docs/social-and-turf.md) og [sikkerhet](docs/security.md).

## Neste leveranse

Fysisk GPS- og native karttesting, deling mellom to ekte kontoer, bakgrunnsopptak og lanseringskrav gjenstår. REA er valgfritt ved relevant teknisk analyse og er ingen runtime-avhengighet. Designinspirasjon fra Kokonut UI, Motion.dev og Anime.js omsettes til native komponenter og Reanimated-animasjoner, med enkel treningsflyt først. Se [designreferansene](docs/design-references/strava/README.md) og [designsystemet](docs/design-system.md).

Se [roadmap](docs/roadmap.md), [arkitektur](docs/architecture.md), [designsystem](docs/design-system.md) og [testplan](docs/testing.md).
