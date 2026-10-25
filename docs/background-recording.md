# Opptak med låst skjerm og i andre apper

## Status, 25. oktober 2026

VYRO har bakgrunns-GPS for et eget iPhone-bygg. Nye installasjoner har «Fortsett med låst skjerm» valgt som standard; eksisterende lagrede valg beholdes. Valget vises nå før Start og under Innstillinger → Varsler og opptak. Start ber om nødvendig posisjonstilgang, og GPS brukes bare under en økt som brukeren starter.

**Expo Go på iPhone støtter ikke bakgrunns-GPS.** En ny QR-kode eller Reload i Expo Go kan ikke endre dette. Der pauses økten når appen forlater forgrunnen, og en tydelig melding forklarer begrensningen. Nettleseren krever også at VYRO holdes åpen.

Telefonen må være slått på. Låst skjerm og vanlig appbytte støttes av native-bakgrunnstjenesten; helt avslått telefon og en app som brukeren har tvangsavsluttet, støttes ikke. Etter krasj eller ny oppstart åpnes et bevart utkast pauset; VYRO starter ikke ny GPS-innsamling automatisk.

## Endringer

- Bekrefter at den native GPS-tjenesten er registrert før appen viser at bakgrunnsopptak er aktivt. Feil ved oppstart pauser økten og gir en forklaring.
- Aktivt bakgrunnsopptak fortsetter gjennom `inactive` og `background`. Tid beregnes fra faktiske tidsstempler og oppdateres ved bakgrunnspunkter og retur til appen, også når JavaScript-timere har vært suspendert.
- Kontrollerer tjeneste og tillatelse ved retur. Ved avbrutt tjeneste eller tapt tillatelse pauses økten med ruten beholdt. Et forsinket kontrollsvar kan ikke pause et nyere opptakssegment.
- Beholder GPS-stopp ved Pause, Fullfør og kontobytte, separate rutesegmenter og private, krypterte sjekkpunkter. Krypteringsnøkkelen er allerede konfigurert for tilgang etter første opplåsing; ingen svekkelse av lagringen er gjort.
- Innstillingene har snarvei til telefonens innstillinger. På iPhone brukes **Posisjon → Alltid** og **Presis posisjon**. Hvis «Tillat én gang» ble valgt, kan iOS avvise bakgrunnstillatelse uten ny dialog; tillatelsen må da endres i Innstillinger.

## Installerbar testversjon

`mobile/eas.json` har nå profilen `preview`: intern distribusjon til fysisk iPhone, med JavaScript innebygd i appen. Den trenger ingen kjørende Expo-/Metro-server. Den arver eksisterende produksjonsmiljø og bruker samme VYRO-kontooppsett. Dette er ikke en ny konto eller en publisering til App Store.

Ved kontroll i dette skymiljøet svarer Expo CLI **Not logged in**. EAS-prosjekt og Apple-team/signering er ikke konfigurert, og ingen installasjonslenke eller signert IPA er laget. Koble faktiske kontoer og offentlige Supabase-innstillinger etter [TestFlight-guiden](testflight.md). Apple Watch- og widget-målene trenger også riktige profiler.

Etter kontooppsett, fra `mobile`:

```sh
npx eas-cli@latest device:create
npm run ios:preview
```

Registrer iPhonen via lenken fra `device:create` **før** bygging. Installer det ferdige bygget fra EAS-lenken. Intern iPhone-distribusjon krever Apple Developer-signering og at telefonen er med i profilen. Alternativt brukes det eksisterende TestFlight-oppsettet. Det er ingen grunn til å registrere en klokke for å teste GPS-opptak på telefonen.

## Verifikasjon

- **233 tester i 45 suiter består**, inkludert kontroller av låsing/appbytte, bakgrunnspunkter, tid/lagring uten timerkjøring, manuell pause, tapt tjeneste/tillatelse, gamle kontrollsvar, Expo Go, standardvalg, eksisterende opt-out og innstillingsflyt. Native posisjonstjenester er mock i disse testene.
- Typecheck, lint uten cache, iOS Hermes-eksport og web-eksport består. Expo-introspeksjon bekrefter `UIBackgroundModes: location` og tillatelsestekstene. `preview` er intern distribusjon med fysisk iPhone som mål.
- Chromium ved 390 × 844 og 320 × 640 viser begrensningen før Start uten å skjule startknappen. Ingen falsk aktiveringsbryter på web og ingen JavaScript-sidefeil. Dette tester ikke native bakgrunnsopptak.
- Tidligere native simulatorbygg med Watch og Live Activity bestod på commit `0901069`. Denne endringen er kontrollert med JavaScript-/konfigurasjonstestene over, ikke med et nytt signert eller fysisk bygg.

## Test på iPhone før funksjonen godkjennes

1. Installer eget VYRO-bygg, logg inn og behold «Fortsett med låst skjerm» på. Start en kort tur og gi «Alltid»/presis posisjon. Kontroller at opptaket viser at det fortsetter med låst skjerm.
2. Gå med låst skjerm i noen minutter, og bruk en annen app under deler av turen. Kontroller sammenhengende spor, riktig tid/distanse og ingen automatisk pause ved retur.
3. Trykk Pause, gå videre og Fortsett. Forflytningen i pausen skal ikke telles eller kobles inn i ruten. Fullfør og lagre, og kontroller økten etter omstart.
4. Nekt bakgrunnstillatelse, trekk tilbake tillatelsen og stopp tjenesten. Appen skal forklare stoppet og beholde ruten. En glemt tillatelse skal ikke fremstå som aktiv GPS.
5. Prøv kontobytte/utlogging, lavt batteri, dårlig GPS og en lengre tur. Kontroller sjekkpunkter og batteribruk. Tvangsavslutting eller telefon av skal ikke gi oppdiktet rute eller automatisk gjenopptakelse.

Fysisk iPhone-test er ikke utført her. SDK-kilder: [Expo SDK 58 Location](https://docs.expo.dev/versions/v58.0.0/sdk/location/), [versjonert dokumentkilde](https://github.com/expo/expo/blob/main/docs/pages/versions/v58.0.0/sdk/location.mdx), [intern distribusjon](https://docs.expo.dev/build/internal-distribution/). Dokumentene ble lest fra Expos offisielle GitHub-kilde fordi dokumentnettstedet svarte HTTP 403.
