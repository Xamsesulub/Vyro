# Ruteforslag i Norge

Status 26. oktober 2026: **aktivert i eksisterende Supabase-prosjekt `diviitenhbidwrcpmkxr`**. Den nye migreringen er kjørt, serverhemmeligheter er satt, og `route-suggestions` versjon 1 er aktiv med `verify_jwt = true`. Ekte søk fra localhost ga tre rundturer i Oslo; en privat «Testløype · Oslo» på 2,84 km ble lagret og gjenfunnet etter reload, med kartlinje og bakgrunnskart. Dette er ikke en gjennomført treningsøkt. Fysisk iPhone og resten av akseptanselisten gjenstår.

Databasen hadde ingen CLI-migreringshistorikk. Bare `202610260001_route_suggestions.sql` ble kjørt via `supabase db query --linked --project-ref … --file …`; eldre migreringer ble ikke kjørt. De fem rutetabellene finnes nå. **Ikke kjør filen på nytt eller bruk ukontrollert `db push`**; historikken må først avstemmes mot det eksisterende skjemaet. Supabase Cron-jobben `vyro-route-suggestions-prune` kjører som `postgres` kl. 03:20 UTC daglig. Planleggingen er kontrollert, men første automatiske kjøring er ikke observert.

## Brukerflyt

**Kart → Ruteforslag**: søk etter sted eller velg «Nær meg», velg Løping/Gange/Fottur og omtrent 3/5/10/15 km, trykk «Finn løyper». Kartets valgte sted følger med inn. Et søk gir inntil tre beregnede rundturer, med faktisk lengde, eventuell stigning, kart og kilde. Ingen automatisk søking ved oppstart eller hvert tastetrykk.

**Se og lagre løypa** åpner detaljene. Brukeren velger et privat navn og trykker «Lagre løypa». Kvittering vises først etter svar fra databasen. **Kart → Lagret** henter kontoen sin liste, også på en ny telefon. «Bruk løypa» legger den som lilla veiledning i GPS-opptakeren; brukeren starter opptaket selv. Forslaget blir aldri en gjennomført tur, et innlegg eller et gyldig soneforsøk. Ingen svingvarsler er implementert.

Søk er ikke begrenset til en liste med byer. Geografifilteret dekker fastlands-Norge, Svalbard og Jan Mayen med romslige geografiske bokser; dette er ikke en nøyaktig landegrense. Tilgjengeligheten bestemmes av rutetjenestens OpenStreetMap-dekning. Det kan mangle en egnet rundtur, særlig utenfor tettsteder. Underlag, vinterforhold, adkomst og sikkerhet er ikke verifisert. Derfor heter funksjonen **Ruteforslag**, ikke kuraterte eller kvalitetsgodkjente anbefalinger.

Eksisterende stedssøk brukes: Apple-geokoding på iPhone og Mapbox på web. Androids tekstbaserte stedssøk er fortsatt ikke implementert; «Nær meg» bruker den eksisterende posisjonstjenesten. Native stedssøk, kart og tillatelser må testes på fysisk enhet.

## Data og lagring

- Edge Function `route-suggestions` verifiserer brukerens JWT gjennom Supabase Auth. ORS-nøkkel og service-role-nøkkel finnes bare på serveren. Klienten kan ikke skrive rutekatalog, cache eller kvotetellere direkte.
- Først ved «Finn løyper» sendes startområdet avrundet til 0,002 grader (omtrent 200 m nord/sør), aktivitet og ønsket lengde. Ingen adresse, bruker-ID, GPS-historikk, fart eller tidspunkter sendes til ORS. Dette er redusert presisjon, ikke en anonymitetsgaranti.
- ORS beregner rundturer på OSM-nettverket med `foot-walking` eller `foot-hiking`. Ferger og vad unngås. Geometri, lengde, startavstand og lukking kontrolleres; manglende segmenter og nesten identiske forslag filtreres bort. Faktisk lengde kan avvike fra ønsket lengde.
- `route_suggestions` inneholder beregnede kartlinjer med generiske navn, uten eier/søkerkobling. Innloggede kan lese dem. `saved_route_suggestions` kobler rute og privat navn til kontoen, med RLS. Brukernavn og søkestreng blir aldri offentlige rutenavn.
- Full geometri for bokmerkede ruter bevares i skyen; det lagres ikke bare en flyktig leverandør-ID. Kontobundne bokmerker er begrenset til 500, listen hentes 20 om gangen uten full geometri. Kontosletting kaskadesletter bokmerkene.
- Inntil 20 sist åpnede/lagrede, serverbekreftede ruter ligger i en kryptert lokal cache, filtrert på konto. Cachen er best effort og erstatter ikke skylagring. Bakgrunnskartets fliser lastes ikke ned for offlinebruk. Gamle bokmerker av egne GPS-turer beholdes som en separat lokal liste.
- Kildekreditering følger løypa, også under opptak: openrouteservice by HeiGIT, OpenStreetMap og CC BY-SA 4.0 med lisenslenke. [Vilkårene](https://account.heigit.org/info/tos) ble kontrollert 26. oktober: ORS-resultater er under CC BY-SA 4.0. Ingen særskilt lagringsgrense er oppgitt der; kilde-/lisensmerking beholdes med lagret geometri. Dette er ikke en generell lisensvurdering av fremtidig eksport eller andre datakilder.

Stravas blå/lilla linjer viser aktivitetsintensitet fra deres brukere. VYRO har ikke disse dataene. Ingen Strava-fliser, kopiert rutekatalog eller kunstig popularitet er lagt inn. Eget varmekart utsettes til det finnes tilstrekkelige frivillig delte, aggregerte data og en personvernmodell. Kartverket/Geonorge/andre kuraterte rutekilder kan supplere senere; ingen slik import er gjort uten avklart tilgang, egnethet og lisens.

## Aktiver på PC i eksisterende Supabase-prosjekt

1. Hent siste `main`. Bruk samme prosjekt som dagens innlogging og soner. **Ikke opprett en ny database eller kjør gamle migreringer på nytt.** Kontroller migreringshistorikken først. Den nye filen er `supabase/migrations/202610260001_route_suggestions.sql`. Den forutsetter eksisterende `valid_vyro_route` og `limit_vyro_write`. Bruk SQL Editor til akkurat denne nye filen, eller verifiser `supabase db push --dry-run` før en CLI-utrulling dersom historikken er korrekt koblet.
2. Opprett/bruk en konto hos [HeiGIT](https://account.heigit.org/) og bruk API-nøkkelen med Directions-tilgang. Kontroller gjeldende plan, lagring, kreditering og kvoter. [Standard-planen](https://account.heigit.org/info/plans) var gratis for alle med Directions V2 2000/døgn og 40/minutt ved kontroll 26. oktober. VYRO bruker lavere grenser: 600/døgn og 30/minutt. Koden bruker `https://api.heigit.org/openrouteservice/v2/directions/foot-walking/geojson` (eller `foot-hiking`). Den eldre adressen `api.openrouteservice.org` avvikles, se [leverandørens kunngjøring](https://ask.openrouteservice.org/t/deprecating-api-openrouteservice-org-in-favour-of-api-heigit-org/7912). Både et direkte leverandørkall og et innlogget appkall gjennom Edge er verifisert.
3. Kopier `supabase/functions/.env.example` til `supabase/functions/.env.local` og fyll inn nøkkelen lokalt. Filen er ignorert av Git. Ikke legg hemmeligheter i chat, appkode eller `EXPO_PUBLIC_*`. Tilpass kvotegrensene til leverandørplanen.
4. Logg inn med prosjektets autoriserte Supabase-konto og kjør fra repo-roten, med den faktiske prosjekt-ID-en i stedet for plassholderen:

   ```bash
   npx supabase login
   npx supabase secrets set --env-file supabase/functions/.env.local --project-ref <eksisterende-prosjekt-id>
   npx supabase functions deploy route-suggestions --project-ref <eksisterende-prosjekt-id>
   ```

   Supabase setter `SUPABASE_URL`, `SUPABASE_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY` i Edge-miljøet. `verify_jwt = true` i `supabase/config.toml` beholdes; funksjonen kontrollerer i tillegg tokenet mot Auth og bruker kun den verifiserte bruker-ID-en. Kontroller gateway/JWT-kompatibilitet mot prosjektets faktiske signeringsoppsett ved første test. Ikke slå av all autentisering for å omgå en feil.
5. Legg inn en daglig jobb som kjører `select public.vyro_prune_route_suggestions();` med server-/databaseautoritet. Dette er allerede satt opp i VYRO: `pg_cron` 1.6.4, jobb `vyro-route-suggestions-prune`, tidsplan `20 3 * * *` (UTC), bruker `postgres`. Kontroller eksisterende jobb før endringer. Migreringen krever ikke at `pg_cron` er installert. Oppryddingen fjerner gamle tellere, utløpt søkecache og ubrukte rutemaler eldre enn 30 dager; bokmerkede ruter beholdes. [Supabase Cron](https://supabase.com/docs/guides/cron/quickstart).
6. Test med en vanlig innlogget bruker før lansering, se listen under. Ingen nye native moduler er lagt til; dette krever oppdatert appkode og backendaktivering, ikke et nytt native bygg på grunn av rutefunksjonen alene.

## Drift og grenser

Per bruker tillates 6 søk/minutt og 60/døgn, også for cachetreff. Et nytt sett reserverer inntil tre leverandørkall. Felles standardbudsjett er 30 kall/minutt og 600/døgn, justerbart med `ORS_REQUESTS_PER_MINUTE` og `ORS_REQUESTS_PER_DAY`. Disse er forsiktige appgrenser, ikke en påstand om leverandørens abonnementskvoter. Grensene håndheves i PostgreSQL på tvers av samtidige Edge-instanser.

Et identisk område/aktivitet/lengde gjenbrukes i ett døgn; tomme treff i 15 minutter. En 60-sekunders lås hindrer duplisert beregning. Leverandørfeil lagres ikke som et vellykket tomt resultat. Database-/budsjettfeil stopper nye leverandørkall. Ingen automatiske klientforsøk i løkke. Funksjonen logger ikke token, koordinater eller leverandørnøkkel.

Manglende utrulling/nøkkel gir «Ruteforslag er ikke aktivert ennå». Lagret kan vise en eldre lokal kopi ved nettfeil, med beskjed. Mislykket lagring skal alltid kunne prøves igjen uten falsk kvittering eller duplikat.

## Akseptanse etter aktivering

1. Søk i Kristiansand, Bergen, Trondheim, Tromsø, Kirkenes og et mindre tettsted. Prøv også et område uten egnet veinett; forvent ærlig tomtilstand. Svalbard/Jan Mayen trenger egen vurdering av datadekning og forhold, ikke bare godkjent koordinatvalidering.
2. Kontroller løping/gange/fottur og hver lengde. Se at kartlinjen følger faktisk gangbart nett, at oppgitt lengde stemmer med geometrien og at kilde vises. Sammenlign minst én kjent lokal løype. Ikke godkjenn en løype som trygg ut fra et API-svar alene.
3. Lagre med privat navn, lukk appen og logg inn på en annen enhet med samme konto. Kontroller navn og full kartlinje. En annen konto skal ikke se bokmerket/navnet. Fjern bokmerket og oppdater den andre enheten.
4. Simuler manglende nøkkel, utløpt innlogging, kvotefeil og nettbrudd. Ingen falsk «lagret», gamle resultater ved kontobytte eller hemmeligheter i feilmeldinger. Lagre på nytt etter avbrutt svar: samme bokmerke, riktig navn.
5. Åpne en lagret løype før nett frakobles. Kontroller lokal kopi og beskjed om bakgrunnskart. «Bruk løypa» skal vise den lilla linjen og null tid/distanse før GPS-start. Løp en kort fysisk test og kontroller pause/gjenoppretting; bare det faktiske sporet skal lagres som aktivitet.
6. Kontroller liten skjerm, tastatur, stor tekst og VoiceOver på iPhone. Bekreft fysisk posisjonstillatelse og at søk på et valgt sted ikke starter treningsopptak.

Lokale tester bruker faktisk Edge-handler og PostgreSQL-migrering, men simulerte ORS-svar. De suppleres nå av den ekte Oslo-testen beskrevet øverst. Dette bekrefter ikke fysisk iPhone, annen enhet/konto eller alle steder/lengder. Se [testing.md](testing.md) for utført verifikasjon.
