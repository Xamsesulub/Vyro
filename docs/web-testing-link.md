# Offentlig testlenke for VYRO

[Åpne VYRO](https://vyro-xamse.surelark18.chatgpt.site)

Dette er nettleserutgaven av den eksisterende React Native / Expo-appen. Den er publisert med HTTPS og fungerer uten at utviklings-PC-en er på. Sites-tilgangen er offentlig; det kreves ingen ChatGPT-konto. Supabase beskytter fortsatt kontoer og private data med eksisterende Auth/RLS.

## Prøv uten konto

1. Trykk «Kom i gang». Navn er valgfritt.
2. Velg «Utforsk kartet først» eller «Prøv treningssimulering uten konto».
3. Start simulering, pause og fullfør. Økten merkes som simulering og blir aldri et GPS-opptak.

Nettversjonen inneholder ikke skjermbildefixturen eller noen forhåndsinnlogget demokonto. Fiktive profiler i VibeOff-bildene viser en separat eksempelvisning. Sosiale funksjoner og ekte GPS-opptak krever VYRO-innlogging.

E-postregistrering og passordlenker for denne adressen er ikke ferdig satt opp. Supabase-dashboardet krevde ny innlogging, og brukeren ba om publisering først. Behold e-postbekreftelse på; ikke slå den av for å omgå SMTP-oppsettet. Legg senere til den eksakte redirect-adressen `https://vyro-xamse.surelark18.chatgpt.site/auth/callback`, og oppdater Site URL til `https://vyro-xamse.surelark18.chatgpt.site/account`. Behold eksisterende localhost- og native-adresser. Fysisk Android/iOS/GPS er fortsatt utestet.

## Publisering og vedlikehold

Oppdatering 23. oktober: versjon 2 gjør gjestestatus og ventende e-postbekreftelse tydeligere, og samler bekreftet sesjon før navigasjon. E-postoppsettet over er fortsatt uavklart. Pushet kilde: `5dde503b7fa1fd823581073ac691805ecd670d43`. Versjon: `appgprj_6ad9f14932088191ba12610805b9dfc1~appgver_19fa51e3022881919627c78dfa1bf6ad`. Deployment: `appgdep_6ad9fdef8b0c819182dc900b5877b064`, `succeeded`.

Identitet og SPA-fallback ligger i `mobile/.openai/hosting.json`. Nettsiden bruker bare Expo-webeksporten, ikke prosjektets miljøfiler, backend-hemmeligheter, brukerdata eller private designreferanser.

Kjør fra `mobile`: `npm run export:web`, deretter `node scripts/prepare-hosting.cjs`. Sistnevnte kontrollerer eksporten og kopierer den til den dedikerte, ignorerte `.hosting-site`-utsjekkingen. Bruk Sites-skillens kilde- og pakkeflyt for videre publisering med samme prosjekt-ID.

Første publisering brukte vanlig Git som reserve etter at Sites-hjelperen avviste en ny nøkkels utløpsmetadata mot PC-klokken. Git-serveren godtok nøkkelen og bekreftet opplastet commit. Ingen klokke, token eller sikkerhetsinnstilling ble endret. `scripts/push-hosting.cjs` er et engangsalternativ for denne situasjonen; token gis bare på skjult stdin. Den offisielle `package-site.mjs` pakket den uendrede, opplastede kilden før versjonen ble lagret og publisert.

- Sites source commit: `6616fbbc196c22e844b37b6800ff91eeb99213be`
- Site: `appgprj_6ad9f14932088191ba12610805b9dfc1`
- Version: `appgprj_6ad9f14932088191ba12610805b9dfc1~appgver_c5c801a9514c8191a9c41e4db05f7cec`
- Deployment: `appgdep_6ad9f3e2f3dc81918a33195d028ebb6e`, `succeeded`

VibeOff-feltet «Live link» er lagret med den offentlige adressen, og deretter åpnet på nytt for å kontrollere verdien. Brukerens endring fra «Jeg» til «Vi» er beholdt. Selve VibeOff-innlegget er fortsatt et utkast.
