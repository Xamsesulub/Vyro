# VYRO på VibeOff, 23. oktober 2026

Fem originale JPEG-skjermbilder tatt med nettleserverktøyet fra den faktiske Expo-webeksporten ved commit `aeac163`. Ingen AI-genererte bilder, etterredigering eller nye produktkomponenter. Skjermbildene er fra nettleser, ikke en fysisk telefon.

## Isolert demovisning

Fra `mobile`, etter vanlig eksport:

```powershell
npm run export:web
node scripts/showcase.cjs
```

Åpne `http://localhost:8103`. Serveren er bundet til IPv6-loopback. Den serverer eksisterende `dist`, setter fiktiv sesjon og eksempeldata på denne separate opprinnelsen, og omdirigerer appens Supabase-fetch til en lokal fixture. Mutasjoner avvises. Posisjonsinnsamling er sperret. Mapbox viser det faktiske bakgrunnskartet med kreditering. Dette er en skjermbildedemo, ikke en alternativ backend eller en innloggingstest.

Ada, Noah, Mina og Leo er oppdiktede profiler. Treningsstrømmen bruker oppdiktede eksempeløkter. Profilens statistikk bruker appens eksisterende eksempeldata. Opptaksbildet kommer fra appens innebygde simulering; ingen tall er etterredigert eller presentert som GPS.

## Bilder og tekst

- `01-map.jpg`: kart og eksempel-turf; forsidebilde.
- `05-workout.jpg`: aktiv simulering med store målinger og pauseknapp.
- `02-feed.jpg`: eksempelinnlegg fra Noah.
- `03-runners.jpg`: de tre fiktive løperprofilene.
- `04-profile.jpg`: Adas profil med eksplisitt eksempelstatistikk.
- `post.json`: norsk tekst, rekkefølge og alternative bildetekster.
- `draft-preview.jpg`: bevis på at VibeOff mottok utkastet; dette er ikke et produktbilde og ble ikke lastet opp som ett.

Utkast `p-4394bc53` ble opprettet én gang via VibeOffs dokumenterte agent-API (HTTP 201, `draft: true`). Gjennomgangssiden og redigeringsskjemaet bekreftet fem bilder, de norske svarene og hele teksten om videre arbeid. Innlegget er **ikke publisert**. Brukeren gjennomgår bildene og publiserer under sin egen konto, slik VibeOff krever.

Agentnøkkel, privat gjennomgangslenke og API-respons ligger i ignorert `mobile/.env.vibeoff.local`, aldri i Git. `submit-showcase.cjs` er et eksplisitt engangsskript og nekter ny innsending når filen allerede inneholder en mottatt respons. Ved ukjent nettverksutfall skal eksisterende gjennomgangsside kontrolleres før et eventuelt nytt forsøk.

Ingen localhost-lenke eller lenke til utdatert GitHub-kode er lagt i innlegget. Arbeidet er lagret lokalt i Git; ingen push er gjort i denne runden.

Kilder: [VibeOffs publiseringsveiledning](https://vibeoff.ai/skill.md) og [regler](https://vibeoff.ai/rules).
