# Google, Apple og valgfritt etternavn

## Status, 26. oktober 2026

Appdelen er implementert. Google Cloud-prosjektet `vyro-512719` og en Web application OAuth-klient er opprettet. Google er aktivert i eksisterende Supabase, bekreftet med en lesende kontroll av Auth-innstillingene. Eieren bekreftet vellykket Google-innlogging på `http://localhost:8081` 25. oktober 2026. Google er aktivert i PC-ens ignorerte `.env.local`, mens Apple fortsatt er deaktivert. Apple-oppsett, signering og fysisk iPhone-test gjenstår. E-postinnlogging beholdes. Telefonnummer samles ikke inn.

Lokal Google-test er ikke en full akseptansetest eller produksjonsaktivering. Den gamle Google-klienthemmeligheten skal deaktiveres etter rotasjonen; dette er ennå ikke bekreftet. Ingen hemmeligheter lagres i denne dokumentasjonen.

Google er nå **på som standard i Git-versjonen** når Supabase er konfigurert, både på web og i VYROs egen iPhone-installasjon. Den tidligere aktiveringen lå bare i PC-ens ignorerte `.env.local`; derfor kunne knappen mangle i andre bygg. Google var dessuten feilaktig avhengig av at Apple var klar på iPhone. Begge forhold er rettet. «Fortsett med Google» er tilgjengelig ved både registrering og innlogging: samme Supabase OAuth-flyt oppretter en ny bruker eller returnerer den eksisterende Google-kontoen uten eget VYRO-passord.

`EXPO_PUBLIC_GOOGLE_AUTH_ENABLED=false` kan fremdeles deaktivere Google eksplisitt i et annet miljø uten leverandøroppsett. `.env.example` bruker nå `true`; hvis en eldre lokal-/EAS-miljøfil uttrykkelig har `false`, endre eller fjern det overstyret og start Metro på nytt / lag en ny eksport eller et nytt bygg. `EXPO_PUBLIC_APPLE_AUTH_ENABLED` er fortsatt av som standard og må settes til `true` først etter Apple-oppsett. Knappene har uavhengig tilgjengelighet. Ingen OAuth-hemmeligheter eller Supabase-nøkler er lagt i Git.

Expo Go støtter ikke denne OAuth-returadressen. Appen forklarer dette ved innlogging/registrering i Expo Go og beholder e-postalternativet. Bruk web eller en egen VYRO-installasjon for Google; Expo anbefaler development build for native OAuth-test. Apple-oppsett og App Store-krav må fortsatt fullføres før butikkinnsending, men de blokkerer ikke Google-testing i en egen installasjon.

## Etternavn og offentlig navn

- Registrering med e-post har et valgfritt etternavnsfelt, maks 50 tegn. Visningsnavnet beholdes som et separat felt.
- Etternavnet lagres som `last_name` i brukerens Supabase Auth-metadata, ikke i den delte `public.profiles`-tabellen. Ingen databasemigrering trengs. Metadata er kontoinformasjon, aldri en kilde til tilgangsrettigheter.
- Innloggede brukere kan legge til, endre eller fjerne etternavnet under **Du → Rediger profil**. Det gjelder også Google-/Apple-brukere.
- Profilnavn endres under **Du → Rediger profil → Visningsnavn**. Navn fra Google kopieres ikke automatisk til den offentlige profilen; eksisterende database-trigger gir nye sosiale kontoer navnet «Løper». Apple ber bare om e-post, ikke fullt navn. Brukeren velger selv sitt offentlige navn.
- Apple «Skjul e-postadressen min» støttes: innlogging avhenger av det bekreftede Apple-tokenet, ikke en bestemt e-postadresse.

## Det eieren må opprette

1. **Google Cloud-prosjekt**, eid av kontoen/organisasjonen som skal eie VYRO: <https://console.cloud.google.com/>. Vanlig Google OAuth krever ikke kjøp av en SMS-tjeneste eller et eget VYRO-passord.
2. **Apple Developer-medlemskap**, eid av den som skal publisere VYRO: <https://developer.apple.com/programs/enroll/>. Medlemskap, juridiske avtaler og eventuell betaling fullføres av eieren. Det samme medlemskapet brukes til signering, TestFlight og App Store.
3. Tilgang til **det eksisterende Supabase-prosjektet**: <https://supabase.com/dashboard>. Ikke opprett en ny database for dette. Et faktisk EAS-prosjekt og signeringsoppsett trengs også for telefoninstallasjonen; se [TestFlight](testflight.md).

Del bare prosjektidentifikatorer og ikke-hemmelige oppsettverdier ved behov. Passord, Google client secret, Apples private `.p8`-nøkkel og Supabase service-role skal ikke sendes i chat, Git eller `EXPO_PUBLIC_*`. Leverandørhemmeligheter legges direkte i Supabase-dashboardet.

## Google i Supabase

1. Konfigurer OAuth-samtykkeskjermen i Google Cloud med VYRO-navn, kontaktadresse, faktisk personvernerklæring og produksjonsdomene. Legg til testbrukere mens prosjektet er i testmodus.
2. Opprett en OAuth-klient av typen **Web application**. Også iPhone-flyten bruker denne klienten, siden Supabase mottar Googles svar i nettleseren.
3. Legg inn **Supabases OAuth callback URL**, nøyaktig slik den vises i Authentication → Sign In / Providers → Google: `https://<prosjektreferanse>.supabase.co/auth/v1/callback`. Dette er en annen adresse enn appens returadresse.
4. Legg klient-ID og client secret inn i Google-leverandøren i Supabase og aktiver den. Behold standard innloggingsscope; VYRO trenger ikke Google-kontakter, kalender eller Drive.
5. Legg `vyro://auth/callback` og hver faktisk webadresse `https://<domene>/auth/callback` inn i Supabase → Authentication → URL Configuration. Bruk eksakte adresser; ingen brede wildcard-domener i produksjon. Web må bruke samme nettleser og opprinnelse før og etter innlogging for PKCE.
6. Bruk standarden (Google på), eller sett Google-flagget eksplisitt til `true` i EAS/testmiljøet. Apple-oppsett er uavhengig. Ikke behold et gammelt `false`-overstyr hvis Google skal brukes.

Google går gjennom systemets autentiseringsnettleser på iPhone. Web bruker samme fane, slik at innlogging ikke avhenger av at en mobilnettleser tillater sprettoppvinduer. Supabase bruker PKCE og beholder/verifiserer engangskoden før appen slipper brukeren inn.

## Apple på iPhone

1. Registrer/behold app-ID **`app.vyro.xamse10`** i Apple-team `YACWFNB642` og aktiver **Sign in with Apple**. Den tidligere ID-en `app.vyro.mobile` ble avvist som utilgjengelig av Apple 26. oktober 2026; dette er første signering, ikke en endring av en publisert app. Behold den nye ID-en ved senere oppdateringer.
2. Aktiver Apple i Supabase Authentication → Sign In / Providers. Konfigurer `app.vyro.xamse10` som tillatt klient-ID/audience for native Apple-token.
3. Bygg en ny VYRO-installasjon. `ios.usesAppleSignIn` og `expo-apple-authentication`-pluginen legger inn `com.apple.developer.applesignin = [Default]`. Signering/provisioning må inkludere rettigheten.
4. Sett Apple-flagget i testmiljøet og bygg på nytt. Test på fysisk iPhone med Apple-konto, både vanlig og skjult e-postadresse.

iPhone bruker Apples innebygde innloggingsknapp og dialog. En ny tilfeldig nonce hashes med SHA-256 til Apple; originalen følger ID-tokenet til Supabase for verifikasjon. Et Apple-svar alene gir aldri en VYRO-sesjon. Det trengs ingen privat Apple-nøkkel i appen.

## Apple på web

Web bruker Supabases OAuth-flyt og krever ytterligere Apple-oppsett:

1. Opprett en **Services ID** knyttet til appens primære Apple App ID.
2. Registrer domenet og Supabases HTTPS callback URL i Apple-oppsettet.
3. Opprett Apple Sign in-nøkkel/Key ID og klienthemmeligheten etter Supabase-veiledningen. Legg Services ID og hemmeligheten i Supabase, ikke i appen. Native bundle ID må fortsatt være tillatt for iPhone.
4. Avtal fornyelse av Apples OAuth-klienthemmelighet før den utløper; den kan ha maksimalt seks måneders gyldighet. Dette gjelder nettleserflyten.
5. Aktiver Apple-flagget for web først når weboppsettet er testet. Native Apple-innlogging kan testes med et separat native-byggmiljø før web er klart.

Hvis e-post skal sendes til Apples relay-adresser, må avsenderdomene/SMTP også settes opp for Apple Private Email Relay. Se også [Supabase-oppsettet](supabase-setup.md) om eksisterende SMTP-behov.

## Akseptansetest før aktivering

- Ny og eksisterende konto: Google, Apple, e-post; hjem/profil/innstillinger må være enige om innlogging, også etter appstart.
- Avbrutt dialog, avslått samtykke, feil/utløpt PKCE-kode, offline og gjentatte trykk: ingen falsk innlogging, e-postalternativet fortsatt tilgjengelig.
- Appretur i signert installasjon og riktig webdomene. Både nettleserresultatet og Router kan levere samme kode; den skal bare utveksles én gang.
- Apple med skjult e-post og senere innlogging uten navnefelter. Ingen telefon-/etternavnspåkreving.
- Eksisterende e-postkonto og Google med samme bekreftede adresse: kontokoblingen må verifiseres i det faktiske Supabase-oppsettet. Appen slår ikke sammen kontoer på egen hånd. En Apple-relay-adresse kan gi en annen konto; ingen sammenslåing basert på navn.
- Etternavn skal kunne utelates, lagres, endres og fjernes. Det skal ikke dukke opp i personsøk, innlegg eller kommentarer uten at brukeren selv skriver det inn i visningsnavnet.

Enhetstester bruker simulerte leverandørsvar og er ikke bevis på at Google-/Apple-kontoer eller signering er ferdig konfigurert. En ny ekte Google-flyt på hvert faktisk webdomene og fysisk iPhone-test gjenstår; den lokale webtesten fra 25. oktober er bekreftet av brukeren.

## Referanser

- [Expo SDK 58 Apple Authentication](https://docs.expo.dev/versions/v58.0.0/sdk/apple-authentication/)
- [Expo SDK 58 WebBrowser](https://docs.expo.dev/versions/v58.0.0/sdk/webbrowser/)
- [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)

Implementasjonen er kontrollert mot Expo SDK 58s versjonerte dokumentasjon via Expo-repositoriet og de installerte SDK-typene/kildekoden. Direkte dokumentnettsteder var blokkert i skymiljøet.
