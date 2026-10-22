# Sikkerhet og personvernstatus — 20. oktober 2026

## Tillegg fra skymiljøet, 22. oktober 2026

Gamle GPS-utkast krypteres nå med verifisert migrering. Lese-/dekodingsfeil blokkerer overskriving og kan prøves igjen. Profilredigering bruker eksisterende RLS, og mellomlagret profil tømmes ved kontobytte. GPX-eksport krever bekreftelse og eierkontroll; den inneholder den originale ruten, men ingen private notater. Eksporterte filer er ukrypterte og må kunne leses av valgt mottaker. Native mellomfiler ryddes etter 24 timer ved neste oppstart/eksport. Se [presis oppførsel](app-reliability.md).

Passordgjenoppretting er implementert i en senere kodeendring enn sikkerhetsgjennomgangen nedenfor, men full e-postflyt/SMTP er fortsatt ikke verifisert her. GPX er ikke full kontoeksport. Ingen ny penetrasjonstest eller produksjonsgodkjenning er utført.


Dette er en avgrenset kode-, database- og avhengighetsgjennomgang, ikke en penetrasjonstest eller godkjenning for lansering.

## Verifisert og rettet

- Supabase-klienten bruker publiserbar nøkkel. Ingen service-role/secret-key-funn i søket i app-/SQL-koden. Bare .env.example er sporet av Git. Historikken og eksterne byggetjenester er ikke fullstendig hemmelighetsskannet.
- Private GPS-økter har eierbasert RLS. Profiler og eksplisitt delte innlegg er lesbare for innloggede brukere; ny delingsskjerm viser en skjermet rute før publisering. Private notater sendes ikke. React viser innlegg/kommentarer som tekst, ikke HTML.
- Native innlogging bruker nå expo-secure-store/Keychain/Keystore, med enhetsbundet lagring. Eksisterende AsyncStorage-session migreres først etter vellykket sikker skriving. Chunking håndterer lange sesjoner, og serialisering beskytter mot kollisjon mellom refresh og utlogging. Web bruker fortsatt Supabase browser storage. Native trenger nytt development build og fysisk test.
- Migrering 202610200002_security.sql er aktivert i produksjon etter eksplisitt godkjenning. Serveren tillater bare latitude/longitude/breakBefore i ruter, begrenser ruten til 20 000 punkter / 2 MB og validerer koordinater og typer. Ingen eksisterende økter ble slettet eller omskrevet.
- Atomiske skrivegrenser per bruker per klokkeminutt: 5 activity-insert-forsøk (også idempotente gjentakelser), 20 kommentarer og 60 per type følgerhandling/like/repost. Sletting nullstiller ikke telleren. Serveren setter sosiale tidsstempler. Tellertabellen har ingen klientrettigheter. Dette er ikke global DDoS-beskyttelse eller botbeskyttelse for nye kontoer.
- Produksjonskontroll i SQL Editor: 8 RLS-tabeller, 18 policies, 5 grense-triggere, ingen anonym rutelesing, ingen klientlesing av tellere, ekstra rutefelt avvist. Se evidence/supabase-security-verification.json. Lokale PostgreSQL-tester kontrollerer eierisolasjon, spoofing, validering, rategrense og kaskadesletting.

## Gjenstår før offentlig lansering

1. GPS-ruter, utkast og lokale sosiale kopier er nå AES-256-GCM-kryptert. Native nøkkel ligger enhetsbundet i SecureStore. Web bruker en ikke-eksporterbar CryptoKey i IndexedDB; dette beskytter ikke mot ondsinnet JavaScript på samme origin. Migrering verifiserer lagringen før klartekst slettes. Feil ved dekryptering låser videre skriving for å unngå tap. Fysisk native test, backup-/reinstallasjonsatferd, lagringstid og kontosletting gjenstår. Mistet nøkkel kan ikke gjenopprette lokalt krypterte økter.
2. Nye delinger skjuler punkter innen 500 m fra start/slutt, også senere passeringer, og bryter linjen over skjulte områder. Korte ruter uten synlig segment kan ikke deles. Originalen beholdes lokalt. Publikumsvalg følgere/alle innloggede er implementert med følgere som standard. Migrering 202610200003 er aktivert i produksjon 20. oktober etter eksplisitt godkjenning. SQL-kontroll bekreftet followers-standard, 7 tilgangspolicies, oppdatert publiseringsfunksjon og ingen anonym EXECUTE-rettighet. Gamle innlegg skjermes først ved ny deling; ikke lov brukeren automatisk tilbakevirkende skjerming. Blokkering, rapportering og moderering gjenstår.
3. Serveren kan ikke bevise at et innsendt spor faktisk kommer fra GPS. En modifisert klient kan sende oppdiktede, gyldige koordinater. Turf-migrering 004 legger til serverkontroll av sporet, versjonslåst eierskap, unike kvitteringer og RPC-only skriving, men ikke enhetsattestering. Produksjonsmigrering 004 er aktiv etter eksplisitt godkjenning og vellykket etterkontroll. Ingen premier/offisiell rangering før antijuks og fysisk feltkontroll. Se `social-and-turf.md` for toleranser, eksplisitt publikum og gjenværende risiko.
4. Kontoeksport/-sletting, passordgjenoppretting, to-konto-ende-til-ende-test, backup/gjenoppretting og kontroll av Supabase CAPTCHA/passordpolicy/e-postgrenser gjenstår. Produksjonsdashboard viste ingen backup; gjenoppretting er ikke verifisert.
5. npm audit --omit=dev rapporterer nå 41 berørte avhengigheter (22 high, 19 moderate), ned fra 50. UUID er rettet med et avgrenset xcode→uuid 11.1.1-override; xcode v4-bruk ble verifisert med 1000 gyldige unike ID-er. Ubrukte kartpakker er fjernet. Tre underliggende advisories gjenstår: braces, node-forge og sprintf-js; nyeste registry-versjoner er fortsatt berørt. Mange treff er Expo/Metro/Jest-verktøykjede. Dette er ikke dokumentert som 41 runtime-feil i appen. Ingen tvungen nedgradering eller skjuling av varsler. Se evidence/dependency-audit-summary.json.
6. Mapbox mottar IP, kartutsnitt og eksplisitte søk. Publiserbar token er ikke en hemmelighet; kvoter, URL-restriksjoner for web og produksjonsnøkler må kontrolleres i Mapbox-kontoen. Ingen hemmelig Mapbox-token skal bygges inn.

Fysisk native test og en uavhengig sikkerhetsgjennomgang bør fullføres før kundelansering.

E-postbekreftelse er kontrollert mot offentlig Auth-settings-endepunkt: mailer_autoconfirm=false. Anonym REST-lesing av activities, posts og write_limits gir 401. CAPTCHA og full passordpolicy er fortsatt ikke verifisert.

## Privat sikkerhetskopi og bakgrunnsopptak, 22. oktober 2026

Den nye `workout_backups`-tabellen inneholder hele ruter og notater, separat fra skjermede sosiale innlegg. Eksplisitt aktivering per konto/enhet, eierbasert RLS, immutable/idempotente innsettinger, servervalidering og sletting er implementert og lokalt testet. Migreringen er ikke kjørt i Supabase. Dette er ikke ende-til-ende-kryptering eller full kontoeksport.

Native GPS bruker bare en aktiv, eiet økt; pause/kontobytte stopper tjenesten. Krypteringsnøkkelen endres til iOS `AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY` for skriving med låst skjerm etter første opplåsing. Den migrerer tilgjengeligheten til samme nøkkel, ikke selve treningsdataene. Fysisk OS-/tillatelses-/lagringstest gjenstår. Se [avgrensninger](product-improvements.md).
