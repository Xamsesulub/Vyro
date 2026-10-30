# Sikkerhetsdrift

Status kontrollert 28. oktober 2026. Dette beskriver faktisk oppførsel og gjenstående driftsarbeid, ikke en produksjonsgodkjenning.

## Gjenoppretting av private økter

Brukeren velger Data og sikkerhetskopi, tar vare på den tilfeldige koden i en passordbehandler og bekrefter den før aktivering. På ny telefon brukes samme konto og kode. VYRO kan ikke utlede koden fra serverdata eller tilbakestille krypteringen med et nytt innloggingspassord. Ikke be brukeren sende koden til support.

Å slå av sikkerhetskopiering stopper nye overføringer fra den enheten; det sletter ikke serverkopier. Lokal sletting påvirker ikke en eksisterende backup. «Slett sikkerhetskopier i skyen» krever bekreftelse og beholder nøkkelverifikatoren for å hindre en stille tilbakegang til klartekst. Andre aktiverte enheter kan laste opp sine kopier igjen. Kontosletting fjerner også sikkerhetskopier og verifikator.

Ved migreringsfeil beholdes gammel kopi. Ikke slett gamle rader manuelt for å få synkroniseringen til å se ferdig ut. Undersøk feil uten å logge koder, dekryptert innhold eller GPS-spor. Verifisert tilbakekobling og sammenligning skal lykkes før klartekst slettes.

## Tjenestens database- og bildebackup

Ingen tilgjengelige Supabase-databasebackuper ble funnet, og PITR var av ved kontrollen. Krypterte øktkopier ligger i samme tjeneste og beskytter derfor ikke alene mot tap av hele prosjektet. Databasebackup og Storage-objekter må sikres hver for seg, med begrenset administratortilgang og kryptert lagringssted. Gjenopprett først til et separat miljø og kontroller RLS, Auth, bildehenvisninger og krypterte payloads. Ikke overskriv produksjon for å prøve restore.

Automatisert full backup, ekstern oppbevaring, avtalt lagringstid og en dokumentert gjenopprettingsøvelse må etableres før offentlig lansering. Ingen abonnement er oppgradert i denne leveransen.

## Rapportering og blokkering

Rapporter lagres i `public.safety_reports`. Bare administrator gjennom godkjent servertilgang kan lese og behandle dem. Vanlige brukere kan ikke hente rapportlisten eller andres rapporter. Bruk databasekonsollen til å undersøke rapportert innhold med minst mulig tilgang; ikke kopier private ruter til saksnotater. Kontroller tabellens statusfelt før administrativ statusendring. Ingen automatisk moderator eller varslingsvakt er installert.

En blokkering fjerner eksisterende følgerforhold og forespørsler. Oppheving gjenoppretter dem ikke automatisk. Allerede mottatte varsler, skjermbilder og tidligere lastede bilder kan ikke tilbakekalles. Delte klubbmedlemskap slettes ikke av blokkering, men aktuelle medlemsrader og invitasjoner skjermes av tilgangsreglene.

## Avbrutt kontosletting

En verifisert sletting sperrer nye skriver og pushregistrering før bilder fjernes. Hvis en ekstern operasjon feiler, beholdes kontoen med sletteintensjon og brukeren kan prøve igjen; ny innlogging kan kreves etter 15 minutter. Ikke fjern sperren som en snarvei. Administrator undersøker bare den berørte eierens resterende objekter og auth-rad. Bilder skal ryddes gjennom Storage API før auth-kontoen slettes.

Ved tapt nettverk etter siste svar kan klienten ikke bevise om slettingen fullførte. Kontroller serverstatus før manuell hjelp; ikke rapporter en sletting som vellykket uten bekreftelse. Hvis serveren har slettet kontoen, men lokal lagring feiler, viser appen at lokal opprydding gjenstår. Andre kontoers lokale data skal aldri slettes.

## Lagring, eksport og lansering

Private kopier beholdes til brukeren sletter dem eller kontoen. Det er ingen automatisk alderbasert sletting av rapporter; en konkret oppbevaringsrutine må fastsettes og implementeres før lansering. GPX-eksport finnes, men dekker ikke hele kontoen, sosiale data, bilder eller private notater. Full kontoeksport gjenstår.

Supabase har e-postbekreftelse, minimum åtte tegn og ekstra kontroll ved passordbytte aktivert. Vern mot lekkede passord krever Pro på dette prosjektet. CAPTCHA er av; før aktivering må leverandørnøkler og innlogging/registrering/gjenoppretting fungere sammen på web og native. Ikke slå på en serverinnstilling som låser ute native-klientene.

Native nøkkellagring, gjenoppretting, varsler og sletting må testes fysisk med disponible testkontoer. Gjennomfør også en uavhengig sikkerhetsgjennomgang. Serveren kan validere innsendte spor, men kan ikke bevise at de stammer fra ekte GPS; offisielle konkurranser/premier krever videre antijuksarbeid.
