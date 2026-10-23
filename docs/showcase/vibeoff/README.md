# VYRO på VibeOff, 23. oktober 2026

## Publisert

Brukeren logget inn og ba eksplisitt om publisering. «Publish my build» ble fullført på kontoen `@hamse`. VibeOff bekreftet «Your build is live» og synlighet **Public**. Offentlig lenke: https://vibeoff.ai/build/vi-bygde-vyro-for-a-gjore-lopeturen-enklere-a-folge-4394bc53. Forsidevideoen på 20,13 sekunder og Live link til den offentlige VYRO-appen er kontrollert. Bevis: `../../evidence/vibeoff-published-2026-10-23.jpg`. Notatene nedenfor beskriver forberedelsen av utkastet før publisering.

Fem originale JPEG-skjermbilder tatt med nettleserverktøyet fra den faktiske Expo-webeksporten ved commit `aeac163`. Ingen AI-genererte bilder, etterredigering eller nye produktkomponenter. Skjermbildene er fra nettleser, ikke en fysisk telefon.

Senere samme dag ble `00-walkthrough.mp4` tatt opp fra webeksporten etter `48ad14e` og lagt først i det samme utkastet. Dette er 20,13 sekunder ekte skjermopptak av kart, start av simulering, levende målinger, pause og oppsummering. Fem opptakssegmenter er satt sammen uten ventetiden mellom verktøykallene; det er ikke et sammenhengende GPS-opptak. Fiktive data og simulering er merket i selve appen.

Videoen er H.264/yuv420p, 1280 × 800, 30 bilder/sekund, uten lyd, 645 017 byte. Originale nettleserbilder ble kodet med FFmpeg; ingen skjermbilder eller tall ble generert eller manipulert. Hele MP4-filen lot seg dekode, og avspilling på VibeOff ble bekreftet med `readyState: 4`, 20,13 sekunders varighet og økende avspillingstid. Bevis: `../../evidence/vibeoff-video-cover-2026-10-23.jpg`. Råopptak og det separate FFmpeg-verktøyet ligger i ignorert `mobile/.hosting-artifacts`; ingen appavhengigheter er lagt til.

## Isolert demovisning

Fra `mobile`, etter vanlig eksport:

```powershell
npm run export:web
node scripts/showcase.cjs
```

Åpne `http://localhost:8103`. Serveren er bundet til IPv6-loopback. Den serverer eksisterende `dist`, setter fiktiv sesjon og eksempeldata på denne separate opprinnelsen, og omdirigerer appens Supabase-fetch til en lokal fixture. Mutasjoner avvises. Posisjonsinnsamling er sperret. Mapbox viser det faktiske bakgrunnskartet med kreditering. Dette er en skjermbildedemo, ikke en alternativ backend eller en innloggingstest.

Ada, Noah, Mina og Leo er oppdiktede profiler. Treningsstrømmen bruker oppdiktede eksempeløkter. Profilens statistikk bruker appens eksisterende eksempeldata. Opptaksbildet kommer fra appens innebygde simulering; ingen tall er etterredigert eller presentert som GPS.

## Bilder og tekst

- `00-walkthrough.mp4`: ekte demoopptak; forsidevideo.
- `01-map.jpg`: kart og eksempel-turf.
- `05-workout.jpg`: aktiv simulering med store målinger og pauseknapp.
- `02-feed.jpg`: eksempelinnlegg fra Noah.
- `03-runners.jpg`: de tre fiktive løperprofilene.
- `04-profile.jpg`: Adas profil med eksplisitt eksempelstatistikk.
- `post.json`: norsk tekst, rekkefølge og alternative bildetekster.
- `draft-preview.jpg`: bevis på at VibeOff mottok utkastet; dette er ikke et produktbilde og ble ikke lastet opp som ett.

Utkast `p-4394bc53` ble opprettet én gang via VibeOffs dokumenterte agent-API (HTTP 201, `draft: true`). Gjennomgangssiden og redigeringsskjemaet bekreftet fem bilder, de norske svarene og hele teksten om videre arbeid. Innlegget er **ikke publisert**. Brukeren gjennomgår bildene og publiserer under sin egen konto, slik VibeOff krever.

Etter videooppdateringen viser gjennomgangssiden seks medieelementer, med videoen som «Screen 1 of 6». «Saved» og «Not published» er bekreftet. De fem tidligere skjermbildene og Live link er beholdt. Brukerens innlogging og «Publish my build» gjenstår.

Agentnøkkel, privat gjennomgangslenke og API-respons ligger i ignorert `mobile/.env.vibeoff.local`, aldri i Git. `submit-showcase.cjs` er et eksplisitt engangsskript og nekter ny innsending når filen allerede inneholder en mottatt respons. Ved ukjent nettverksutfall skal eksisterende gjennomgangsside kontrolleres før et eventuelt nytt forsøk.

Senere samme dag: den offentlige testadressen https://vyro-xamse.surelark18.chatgpt.site ble lagt til i «Live link» og kontrollert etter lagring. Brukerens endringer fra «Jeg» til «Vi» ble beholdt. Ingen lenke til utdatert GitHub-kode er lagt inn. Se `../../web-testing-link.md` for drift, gjestetest og gjenstående e-postoppsett.

Kilder: [VibeOffs publiseringsveiledning](https://vibeoff.ai/skill.md) og [regler](https://vibeoff.ai/rules).
