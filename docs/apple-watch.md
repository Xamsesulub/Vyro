# VYRO på Apple Watch

## Status, 25. oktober 2026

En første watchOS-app og synkronisering til iPhone er implementert. **Både Watch-appen og hele iPhone-appen bestod usignert simulatorbygg med Xcode 27.1 i GitHub Actions [40188672169](https://github.com/Xamsesulub/Vyro/actions/runs/40188672169), på commit `0901069`. Dette inkluderer den native WatchConnectivity-modulen og eksisterende Live Activity-mål. Signering, installasjon og fysisk testing gjenstår.** Dette er ikke en publisert eller godkjent klokkeapp. Nytt iPhone-/Watch-bygg kreves; Expo Go støtter ikke WatchConnectivity eller den lokale native-modulen. Den eksisterende iPhone-appen kan fortsatt åpnes i Expo Go med klokkestøtten deaktivert.

Klokkemålet krever watchOS 10 eller nyere. Android/Wear OS og Garmin er ikke del av denne leveransen.

## Brukerflyt etter et godkjent bygg

1. Installer VYRO på iPhone og den parede Apple Watch. Åpne iPhone-appen og logg inn.
2. Under **Innstillinger → Apple Watch**, slå på **Koble denne kontoen til Apple Watch**. Åpne VYRO på klokken slik at kontokoblingen mottas.
3. Velg Løping, Gange, Sykling eller Fottur og trykk Start. Gi posisjonstilgang og tillat å lagre treningsøkter i Helse. Pulstilgang er separat; manglende/utdatert puls vises som «—».
4. Klokken tar opp utendørs GPS og viser aktiv tid, kilometer, snitt min/km og puls. Pause/Fortsett skiller rutesegmenter og stopper/fortsetter aktiv tid. Avslutt gir valg mellom Lagre, Forkast og Tilbake.
5. Åpne VYRO på iPhone etter turen, eller trykk Synkroniser nå. Økten vises i **Du → Treningslogg** som en privat GPS-økt med Apple Watch i tittelen. Vanlig eksplisitt deling og ruteeksport kan brukes etterpå.

Første kobling krever iPhone. Senere opptak kan foregå uten telefonen; WatchConnectivity overfører når systemet har kontakt. Apple bestemmer når bakgrunnsoverføring utføres. En telefon som er slått av kan ikke motta økten umiddelbart. Start samme tur på én enhet for å unngå to separate opptak.

## Data og feiltilfeller

- Posisjon samles først etter Start og innvilget tillatelse. Helse brukes til workout-session/bakgrunnskjøring og puls. Når Lagre velges, forsøker HealthKit også å lagre treningsøkten. Feil der fjerner ikke den fullførte VYRO-kopien. VYROs rute lagres ikke automatisk som en HealthKit-rute.
- Kun konto-ID sendes til klokken; ingen Supabase-token, passord eller servernøkkel. Kontoen låses til økten ved start. Kontobytte/utlogging pauses når oppdatert kontokobling mottas av klokken. En frakoblet klokke kjenner ikke en kontobyttehendelse før den mottar den. En gammel økt importeres aldri til en annen konto.
- Klokken lagrer et privat, filbeskyttet utkast omtrent hvert tiende sekund og ved pause. Ved krasj gjenopprettes utkastet pauset, og en tilgjengelig HealthKit-session kobles til igjen uten automatisk GPS-start. Punkter siden siste vellykkede lagring kan gå tapt. Hvis sessionen er avsluttet av systemet, kan utkastet lagres eller forkastes; Fortsett er deaktivert.
- Fullførte utkast flyttes atomisk til en privat utboks. Filen beholdes til iPhone har validert dataene, lagret økten og en duplikatkvittering i kryptert lagring, og sendt bekreftelse tilbake. Filoverføring alene sletter ingenting. Mottak mens JavaScript er suspendert lagres i en filbeskyttet iPhone-innboks av en Expo AppDelegate-abonnent.
- Mottaket kontrollerer ID/eier, format, tid, antall punkter, nøyaktighet og hastighet og beregner distansen fra GPS-punktene. Pauser og GPS-gap over 30 sekunder lager separate segmenter. Nøyaktighet over 30 meter, steg under 3 meter og fart over 15 m/s håndteres som i appens eksisterende GPS-filter. Maksimalt 20 000 punkter per tur, 50 ventende turer på klokken og 100 filer i telefoninnboksen begrenser ressursbruk. Ingen gamle filer slettes automatisk for å gi plass.
- Rutene publiseres ikke automatisk. Puls og HealthKit-data sendes ikke gjennom VYRO-synkroniseringen eller til VYROs backend. Klokkeøktene inneholder ikke konkurransebevis og overtar ikke soner automatisk. Dette er utendørsopptak; en tur uten gyldig GPS-bevegelse kan ikke lagres som en VYRO-GPS-økt.
- Ingen klokke-kartvisning, turn-by-turn-navigasjon, komplikasjon eller fjernstyring av et pågående iPhone-opptak er implementert.

## Bygging

Koden ligger i `mobile/targets/watch/` og `mobile/modules/vyro-watch/`. `@bacons/apple-targets@5.0.0` lager watchOS-målet under Expo Prebuild. Den genererte `ios/`-mappen skal ikke redigeres for hånd. Eksisterende Live Activity-mål beholdes.

Følg [TestFlight-oppsettet](testflight.md). Expo-konto/EAS-prosjekt, Apple Developer-medlemskap og signering må være koblet til. Sett det faktiske Apple-teamets ti-tegns **Team ID** som `expo.ios.appleTeamId` i `mobile/app.json` før signert bygg. Dette er en teamidentifikator, ikke et passord. Ikke bruk en eksempelverdi.

EAS-konfigurasjonen inkluderer følgende mål:

| Mål | Bundle identifier | Bruk |
| --- | --- | --- |
| VYRO | `app.vyro.mobile` | iPhone |
| ExpoWidgetsTarget | `app.vyro.mobile.widgets` | Eksisterende Live Activity |
| VyroWatch | `app.vyro.mobile.watchkitapp` | Apple Watch, HealthKit |

EAS må opprette/benytte signeringsprofiler for alle målene. Watch-target har HealthKit-rettighet, beskrivende tillatelsestekster og `workout-processing` i bakgrunnsmodus. Appversjon og byggnummer hentes fra iPhone-målet. Hent faktiske Supabase-innstillinger etter TestFlight-guiden før testing av konto/import.

På en Mac kan en usignert kontroll av watchOS-målet kjøres fra `mobile`:

```sh
npm ci
npx expo prebuild --platform ios --no-install
node scripts/check-watch-target.cjs
xcodebuild -project ios/VYRO.xcodeproj -target VyroWatch -sdk watchsimulator -configuration Debug CODE_SIGNING_ALLOWED=NO build
```

GitHub Actions-filen `.github/workflows/apple-watch.yml` er lagt til for generering, kontroll av mål/innbygging og usignert Swift-kompilering av Watch-appen og iPhone-appen på macOS. De første kjøringene bestod Watch-kompilering og CocoaPods-installasjon, men iPhone-steget feilet med «Could not resolve package dependencies». Etter byttet til Xcode 27.1 består hele workflowen. GitHub-maskinen `macos-15` bruker Xcode 16.4 som standard; workflowen bruker nå `xcode-27` med eksplisitt Xcode 27.1, samme versjon som Expos SDK 58-byggemaskin. Se [Expos byggeinfrastruktur](https://docs.expo.dev/build-reference/infrastructure/) og [GitHubs tilgjengelige Xcode-versjoner](https://github.com/actions/runner-images/blob/main/images/macos/xcode-27-arm64-Readme.md). Workflowen lagrer nå compilerlogger og viser konkrete Xcode-feil som annotasjoner og i sammendraget; kode 65 alene forklarer ikke årsaken. Den krever ikke Apple-konto for simulatorbygg. Simulatorbygg verifiserer ikke reell GPS, puls eller transport mellom parede enheter.

## Fysisk akseptansetest før godkjenning

- Installer begge apper, koble kontoen og sjekk at klokken viser riktig startflyt. Nekt GPS, nekt Helse, tillat trening men nekt puls. Ingen start skal late som om opptak er aktivt etter feil; manglende puls skal ikke bli en oppdiktet måling.
- Gå/løp en kjent rute. Kontroller tid, distanse, puls, pause/fortsett og at pausen ikke tegner en rett linje mellom to steder. Test med telefonen hjemme og med skjermen dempet/låst. Kontroller batteribruk på en lengre tur.
- Avslutt/lagre, slå av kontakten, start appene på nytt, koble til igjen og synkroniser flere ganger. Kontroller én privat økt i iPhone-loggen og at klokkens ventende kopi forsvinner først etter bekreftet lagring. Kontroller også slettet økt + en gjentatt leveranse.
- Bytt/logg ut konto under økten og under overføring. Gammel økt skal tilhøre opprinnelig konto, og pausen skal slå inn når klokken mottar endringen. Kontroller at ingen ny konto ser gammel rute.
- Avbryt appen under en tur og under lagring. Kontroller pauset gjenoppretting, separat rutesegment og at lagret utboks ikke blir et aktivt opptak igjen. Test lite diskplass, svakt GPS-signal og tapt HealthKit-session.
- Kontroller små/større klokker, stor tekst og VoiceOver, samt faktisk TestFlight-installasjon og signering. **Ingen av disse fysiske kontrollene er utført her.**

SDK-referanser: [Apple WatchConnectivity](https://developer.apple.com/documentation/watchconnectivity), [HealthKit workout sessions](https://developer.apple.com/documentation/healthkit/hkworkoutsession), [Expo AppDelegate-abonnenter](https://docs.expo.dev/modules/appdelegate-subscribers/), [Apple Targets](https://github.com/EvanBacon/expo-apple-targets). Direkte Apple/Expo-dokumentsider ble blokkert av nettverksproxyen; Expo-kilden og versjonslåst plugin-kode, samt Apple SDK-headerfiler i et offentlig SDK-speil, ble kontrollert.
