# Sosial aktivitetsfeed og turf

**Oppdatert:** Hjem og Løpere er nå koblet til Supabase i kode, med konto og eksplisitt publisering. Databasemigreringen er kjørt i Supabase 20. oktober 2026. Se `live-social-setup.md` for gjeldende status; beskrivelsen nedenfor dokumenterer den tidligere lokale forhåndsvisningen. Turf er fortsatt eksempeldata.

## Implementert 20. oktober 2026

Dette er en lokal, interaktiv forhåndsvisning. Det er ikke en flerbrukertjeneste ennå. Ingen følger, kommentar, like eller repost sendes til andre. Eksempelpersonene er fiktive og kan skjules i innstillingene.

- Hjem har Følger, Delt på nytt og Mine økter. Innlegg er alltid knyttet til en økt, med kart, distanse, tid, tempo og original forfatter.
- Følg/slutt å følge, lik/angre, kommenter/slett egen kommentar og repost/angre lagres lokalt. Repost peker på originalen, og tilbaketrekking fjerner avhengige reaksjoner.
- Del økt tillater bare fullførte GPS-økter med gyldige rutepunkter og positive målinger. Brukeren forhåndsviser ruten og bekrefter kartdelingen. Ingen fri tekst-post eller bilde-post kan opprettes.
- Nåværende opptaker er fortsatt en simulator, så den kan ikke produsere delbare GPS-økter. Deling er heller ikke publisering på nett før backend er implementert.
- Kartet viser turf-eiere blant dem du følger, eller alle eksempel-turfs. Eierskap er eksempeldata og endres ikke av simuleringer.

## Konkurranseregel

En turf er en definert løype med faste kontrollpunkter, retning og aktivitetstype. Distanse bestemmer hvilken løype som konkurreres om. Laveste **totaltid** mellom start og mål vinner; pauser inngår. Ekstra distanse etter mål endrer ikke turf-resultatet. Ved lik tid beholder nåværende eier turfen.

`features/turf/rules.ts` beregner en kandidat ved å kontrollere rekkefølge, GPS-nøyaktighet, dekning, tidsrekkefølge, signalhull og urealistisk fart. Dette er ikke juksesikker GPS-verifisering. Klientberegnede resultater må aldri få oppdatere ekte eierskap direkte. Løypepunktene må samples tett nok i produksjon, og backend må håndtere kryssende ruter, løkker, stopp og GPS-støy med dokumenterte toleranser.

## Ekte kart

Web bruker Leaflet og ekte OpenStreetMap-fliser uten nøkkel. Ingen forhåndsnedlasting/offline-cache er implementert; leverandørens cache-headere og synlig attribution beholdes. Offentlig OSM-flisetjeneste er for begrenset forhåndsvisning, ikke en lovnad om produksjonskapasitet.

Med `EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN=pk.…` i `mobile/.env.local` bruker web og native kart Mapbox Outdoors rasterfliser. Native bruker ellers plattformkart gjennom react-native-maps. Offentlig token må ha riktige URL-/appbegrensninger. Ingen hemmelig Mapbox-token skal legges i appen. Restart/build er nødvendig ved endring av Expo-miljøvariabler.

Strava dokumenterer Mapbox og OpenStreetMap som kartkilder: https://support.strava.com/en-us/articles/15402176-about-strava-maps. VYRO bruker egen konto og token, ingen Strava-nøkler eller private API-er. Leaflet: https://leafletjs.com/reference.html. OSM-policy: https://operations.osmfoundation.org/policies/tiles/.

## Backend som gjenstår

Supabase Auth med ekte brukeridentitet; PostgreSQL-tabeller for profiler, følgerelasjoner, GPS-aktiviteter, øktinnlegg, reaksjoner, kommentarer, reposts, turfs og verifiserte forsøk. RLS skal håndheve eier, originalinnleggets publiseringsstatus, publikum og blokkering også ved repost. Unike relasjoner hindrer doble likes/følger/reposts. Sletting/tilbaketrekking må skjule originalruten og avledede delinger.

Turf-verifisering må kjøre på serveren og lagre forsøk og eventuelt nytt eierskap atomisk med låsing av turf-raden. To samtidige forsøk skal ikke overskrive en raskere vinner. Rå GPS-data, rutematching og totaltid skal verifiseres før rangering; bare et kontrollert serverforløp kan skrive eierskap. Separate sesonger/varighet og soneutvidelser er ennå ikke definert.

Supabase-prosjektet ble konfigurert og Auth-forbindelsen verifisert senere 20. oktober 2026; se `supabase-setup.md`. Mapbox-token mangler fortsatt. `.env.example` beskriver variablene. Kontooppretting i appen, leverandørbetaling, databaseutrulling og ekte GPS/enhetstest er ikke utført.

