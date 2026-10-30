# Sikkerhet og personvernstatus

## Gjeldende kontroll — 28. oktober 2026

Denne delen erstatter de eldre statuslistene nedenfor. Brukeren opplyser at tidligere delte nøkler er byttet. Nøkkelbytte er ikke utført eller uavhengig kontrollert i denne leveransen.

- **Privat sikkerhetskopi:** eksplisitt aktivering med tilfeldig 256-bits gjenopprettingskode. Hele økten krypteres med AES-GCM på enheten før opplasting. Konto, økt-ID, nøkkel-ID og formatversjon bindes kryptografisk til kopien. Serveren får kryptert innhold og nødvendig metadata, aldri koden. Lokalt lagres koden gjennom den eksisterende krypterte lagringen. Ny telefon krever både innlogging og riktig kode. Mistet telefon og kode betyr at kopien ikke kan åpnes av VYRO. Delte innlegg er fortsatt lesbare for valgt publikum.
- **Eldre kopier:** konverteres i begrensede grupper når brukeren aktiverer og appen er åpen. En eldre kopi slettes først etter nedlasting, dekryptering og innholdskontroll av den nye. Samtidig aktivering på to enheter kan ikke erstatte hverandres nøkkel. Produksjon hadde ingen gammel backup-tabell eller private skyøkter ved aktivering; kompatibilitetstabellen er tom og tillater ikke nye klartekstkopier.
- **Blokkering og rapportering:** gjensidig serverkontroll for sosiale lesinger, relasjoner og nye handlinger. Blokkering fjerner følgerforhold, følgeforespørsler, ventende klubbinvitasjoner og aktuelle varsler med usendte pushjobber. Rapporter kan bare gjelde synlige mål, er begrenset og kan ikke leses av vanlige brukere. Administrativ behandling er fortsatt manuell. Allerede viste opplysninger eller leverte telefonvarsler kan ikke trekkes tilbake.
- **Kontosletting:** egen bekreftelsesskjerm krever `SLETT` og en innlogging opprettet de siste 15 minuttene. Et fornyet token alene teller ikke som ny innlogging. Serveren utleder eier fra verifisert innlogging, sperrer nye skriver og fjerner bare eierens bilder før auth-konto og tilknyttede data slettes. Delvis feil kan prøves på nytt. Klienten rydder bare den slettede kontoens lokale økter og nøkkel, også ved kontobytte underveis. Ingen ekte konto er slettet som test.
- **Passord:** minimum åtte tegn og ekstra kontroll ved passordbytte er lagret og visuelt kontrollert i Supabase. E-postbekreftelse og sikkert e-postbytte er på. Anonym innlogging og manuell identitetskobling er av. Eksisterende innloggingsgrenser er kontrollert. Vern mot kjente lekkede passord krever Pro i gjeldende prosjekt, og er ikke aktivert.
- **Avhengigheter:** tilgjengelige rettelser er lagt inn uten å nedgradere Expo. Siste audit hadde ingen moderate, høye eller kritiske funn. 16 lave treff peker på samme `deepmerge`-advarsel uten tilgjengelig upstream-rettelse. En avgrenset, versjons- og hashkontrollert installasjonsrettelse avviser farlige prototype-nøkler; angreps- og kompatibilitetstester kjøres i CI. Audit-varselet skjules ikke.

Migreringene `202610280005_encrypted_backups`, `202610280006_safety` og `202610280007_account_deletion`, samt Edge-funksjonen `delete-account`, er aktivert i Supabase. Etterkontroll bekrefter RLS, avviste klientrettigheter og skrivevern ved sletting. Uinnlogget kall til sletting gir 401. Se [kontrollresultatet](evidence/security-hardening-2026-10-28.json), [tester](testing.md) og [driftsrutiner](security-operations.md).

**Gjenstår:** nytt signert iPhone-bygg og fysisk test, full database-/Storage-backup med øvd gjenoppretting, CAPTCHA med fungerende native flyt, full kontoeksport utover GPX og en uavhengig sikkerhetsgjennomgang. Supabase viste ingen tilgjengelige databasebackuper og PITR var av. Brukerens krypterte øktkopi erstatter ikke driftsbackup. Ingen betalt oppgradering, Git-push eller nytt iPhone-bygg er gjort i denne leveransen.

## Historisk gjennomgang — 20.–28. oktober 2026

Følgende daterte notater dokumenterer tidligere tilstand, ikke en oppdatert liste over uløste feil.

## Endret skjerming for treningsinnlegg — 28. oktober 2026

Etter brukerens uttrykkelige valg er radius for nye delinger av økter redusert fra 500 til 200 meter rundt start og slutt, inkludert senere passeringer. Kartforhåndsvisning og opplasting bruker samme verdi. Original, tid og total distanse endres ikke; eksisterende innlegg omskrives bare hvis eieren deler på nytt. Senere 28. oktober er samme radius også innført for nye soneforsøk; serverens krav om minst 200 meter sammenhengende synlig løype beholdes. Egne bidrag til rutebibliotek beholder 500 meter. Eldre beskrivelser nedenfor er historisk status.

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
