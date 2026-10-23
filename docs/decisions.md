# Tekniske valg

- Stack følger brukerens valg: React Native, Expo, TypeScript, Supabase/PostgreSQL, Expo Location, native kart, Reanimated og Zustand.
- Første leveranse begrenses til fase 1–2. Supabase og Expo Location aktiveres ikke før prototypen er verifisert.
- SDK-versjon følger det faktiske `create-expo-app`-oppsettet (58). Avhengigheter installeres med `expo install`; lockfil versjoneres.
- React Native StyleSheet og semantiske tokens fremfor å introdusere NativeWind før det er behov. Ingen web-UI-biblioteker.
- Kokonut UI, Motion.dev og Anime.js brukes som designinspirasjon. Animasjoner implementeres med React Native Reanimated. Enkel betjening av GPS/trening prioriteres foran dekorasjon; se `design-system.md` for verktøyfordelingen.
- Enkle diagrammer bygges med native Views og trykkbare søyler. Mer omfattende analyse kan introdusere et chart-bibliotek senere.
- Plattformfonter for rask og frakoblet oppstart.
- Ingen agenter eller REA kjøres uten et konkret behov. REA er valgfritt for relevant teknisk analyse, i tråd med brukerens presisering 23. oktober 2026, og er ikke del av mobilappen.
- Ingen automatiske commits, distribusjon eller kontoopprettelse i denne leveransen.

Offisielle referanser brukt ved oppsett: [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/), [Expo Router](https://docs.expo.dev/router/installation/), [Reanimated](https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/), [native kart](https://docs.expo.dev/versions/v58.0.0/sdk/map-view/), [splash screen](https://docs.expo.dev/versions/v58.0.0/sdk/splash-screen/).
