# Pålitelighet, profil og GPX-eksport

Denne forbedringsrunden bygger på kontosesjons- og feedrettingene. Oblig-/VibeOff-materialet er beholdt.

## Lokal lagring og gjenoppretting

Under opptak samles timer- og GPS-oppdateringer i sjekkpunkter hvert femte sekund. JSON-serialisering og kryptering skjer først ved skriving, ikke ved hvert skjermoppdateringstikk. Køen beholder maksimalt én aktiv skriving og ett nyeste øktbilde; langsom disk bygger ikke opp en kø med utdaterte ruter. Pause, avslutning, lagring, sletting og endring av innstillinger prioriteres umiddelbart. Appens bakgrunnshendelse tømmer køen og pauser når ingen bakgrunns-GPS-tjeneste er aktiv. Se den senere implementasjonen i [produktforbedringer](product-improvements.md).

Dette reduserer skrivearbeidet, men er ikke en garanti mot datatap: brå prosessavslutning kan miste oppdateringer etter siste fullførte sjekkpunkt, normalt fem sekunder pluss skrivetid. Ved disk-/nøkkelfeil kan mer være ulagret. Feil vises, og lokal skriving kan prøves igjen fra Innstillinger. Hele historikken inngår fremdeles i hvert sjekkpunkt; separat øktdatabase bør vurderes etter måling på enheter med svært stor historikk.

Mislykket lesing/dekryptering/JSON-dekoding blokkerer overskriving. Oppstart viser gjenoppretting med «Prøv igjen» fremfor en tom treningslogg. Vellykket ny lesing låser opp den aktuelle lagringsnøkkelen. Et ødelagt separat utkast låser ikke urelaterte lagre. Gamle `vyro-gps-draft-v1`-utkast går nå gjennom samme verifiserte krypteringsmigrering som øvrige øktdata. Originalen slettes først etter verifisert kryptert kopi.

Profil, innstillinger, aktivitetsdetaljer og treningslogg abonnerer bare på tilstanden de trenger, så opptakstimeren ikke tegner disse sidene på nytt hvert sekund. En renderfeil gir en norsk gjenopprettingsside og pauser et pågående opptak. Ukjente lenker får en egen tomtilstand.

## Kontonavn

Innloggede kan endre `profiles.display_name` fra Innstillinger. Dette er navnet som innlegg og kommentarer bruker. Oppdateringen bruker eksisterende eierbasert RLS og trenger ingen ny databasefunksjon. Gjestens lokale navn er separat.

Profilen mellomlagres i minnet i 60 sekunder. Kontobytte tømmer mellomlageret; forsinkede svar fra tidligere konto eller før en vellykket navneendring forkastes. Auth-metadata brukes bare som visningsreserve før profilen er hentet. Endringen av kontonavnet skriver ikke til Auth-metadata.

## GPX-integrasjon

Eierens GPS-økt har «Eksporter rute (GPX)». Brukeren bekrefter at filen inneholder **hele den private ruten**, inkludert start og slutt. Dette er forskjellig fra et skjermet sosialt innlegg. GPX 1.1 beholder pausegrenser som separate sporsegmenter og eksporterer ingen private notater, kontoidentifikatorer eller oppdiktede tidsstempler. Simuleringer, eksempeløkter og andre kontoers økter avvises.

Web laster ned filen lokalt. Native bruker SDK 58-versjonene av `expo-file-system` og `expo-sharing` til systemets delingsark. Ingen offentlig filserver, API-nøkler eller automatisk opplasting er nødvendig. Det kreves et nytt development-/release-build på mobil fordi `expo-sharing` har native kode.

Native eksportfiler er midlertidige ukrypterte filer i appens cache. Vellykket overlevering beholder filen slik at mottakerappen rekker å lese den; filer eldre enn 24 timer ryddes ved neste oppstart eller eksport. Mislykket eksport rydder filen med én gang. Mottakerens eller nettleserens lagrede kopi håndteres av brukeren. GPX-en er en rutefil uten tidsstempler per punkt; importstøtte og aksept som full treningsaktivitet varierer mellom tjenester.

## Automatiske kontroller og utrulling

`.github/workflows/quality.yml` kjører ved PR-er og push til main som endrer app/database: ren npm-installasjon, typecheck, lint, Jest, alle isolerte PostgreSQL-kontroller og eksport for web/Android/iOS. Arbeidsflyten har bare lesetilgang til repoet og trenger ingen produksjonshemmeligheter. Den publiserer ikke appen eller migreringer.

For produksjon gjenstår feed-migreringen i [backend-performance.md](backend-performance.md), reell flerbruker-/belastningstest, fysisk GPS og native delingsark. Egen SMTP for offentlig registrering, kontosletting/full kontoeksport og blokkering/rapportering er fortsatt åpne oppgaver. GPX-eksport er ikke full kontoeksport eller automatisk synkronisering av treningshistorikk.
