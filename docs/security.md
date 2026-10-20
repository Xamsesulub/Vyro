# Sikkerhet og personvernstatus

Supabase Auth og PostgreSQL med eierbasert RLS brukes for profiler, følgerforhold, økter, innlegg, likes, kommentarer og reposts. Klienten bruker bare publiserbar nøkkel. SQL-policytester finnes i mobile/scripts/test-database.cjs.

GPS-ruter og aktive utkast lagres privat på enheten med AsyncStorage. Denne lagringen er ikke kryptert. Deling er eksplisitt og sender rute, distanse og tid til Supabase via publish_workout; private notater sendes ikke. Lokal sletting trekker ikke tilbake et delt innlegg: dette gjøres separat fra Hjem. Kontoens økter filtreres etter eier.

Posisjon samles bare i forgrunnen. Opptak pauser ved bakgrunnsbytte; bakgrunnstillatelser er av. Fysiske telefonprøver og gjennomgang av tokenlagring, lagringstid og slette-/eksportflyter gjenstår før lansering.

Webkart bruker lokalt pakket Leaflet og CARTO/OpenStreetMap-fliser (eller konfigurert Mapbox). Kartleverandøren mottar IP-adresse og kartutsnitt. Native bruker react-native-maps. Plattformnøkler og leverandørvilkår må verifiseres før distribusjon.

Tidligere avhengighetskontroll rapporterte åpne sårbarhetsvarsler i verktøykjeden. Dette arbeidet er ingen sikkerhetsgodkjenning for produksjon.
