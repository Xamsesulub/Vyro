# VYRO – funksjonskart mot Strava

Oppdatert 20. oktober 2026. Brukeren ønsker Stravas funksjonsomfang og enklere, lys utforming. Dette er målbildet, ikke en erklæring om full funksjonslikhet.

Kilder: [Strava Help Center](https://support.strava.com/en-us/), [abonnementsfunksjoner](https://support.strava.com/en-us/articles/15402044-what-features-are-included-in-a-strava-subscription), [Runkeepers treningsskjerm](https://help.runkeeper.com/en/hc/understanding-your-android-tracking-screen), samt brukerens seks Strava-skjermbilder. Funksjoner varierer med plattform og abonnement; listen grupperer funksjoner og er ikke en fullstendig spesifikasjon av alle Strava-detaljer.

| Område | Implementert i VYRO | Gjenstår |
| --- | --- | --- |
| Hjem | Lokal aktivitetsfeed, detaljer | Følgere, ekte sosial feed, kudos, kommentarer, bilder |
| Kart | Egen fane, native eksempelkart; web-illustrasjon | Rutesøk, ruteplanlegger, lagrede ruter, navigasjon, offline kart, varmekart |
| Registrer | Aktivitetsvalg, simulert tid/distanse/tempo, pause, fortsett, avslutt, privat lokal lagring | Ekte GPS, bakgrunnsopptak, sensorer, autostopp, runder, live-deling |
| Grupper | Faner for Utfordringer og Klubber med ærlig tomtilstand | Konto, søk, medlemskap, klubber, utfordringer, rangering, moderering |
| Du | Profil, Fremgang/Aktiviteter/Mer, treningslogg, ukemål, innstillinger | Følgere, synkronisering, rekorder, relativ prestasjon, treningsbelastning, utstyr |
| Segmenter | Ikke implementert | Segmentmatching, rekorder, rangering og live-segmenter |
| Integrasjoner | Ikke implementert | Garmin, Apple Watch, Health, import/eksport og øvrige enheter |
| Konto og betaling | Ikke implementert | Supabase Auth, PostgreSQL/RLS, abonnement, eksport og kontosletting |

Fjernet fra den synlige flyten: firetrinns introduksjon, erfaringsspørsmål, bevegelsesmiks, dekorative mål-ringer, fiktiv påmelding/heiarop, egen Fremgang-hovedfane og lange motivasjons-/personvernkort. Lagrede økter beholdes. Ingen eksisterende økter blir endret til ekte GPS-opptak.

Lys bakgrunn er standard. Eksisterende versjon-0-profiler migreres én gang til lyst tema, med økter og øvrige valg bevart. Mørkt tema er fortsatt et valg under innstillinger. VYRO beholder sitt eget navn, ikon og fargeidentitet.
