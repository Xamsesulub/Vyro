# Testing

## Innlogging og sosial database, siste kontroll 20. oktober 2026

Typecheck, lint og web-eksport består. 22 app-tester og 24 lokale PostgreSQL/PGlite-påstander består. REA bekrefter innloggings-/registreringsskjermene og kontokrav ved direkte navigering til deling og GPS. Se `analysis/auth-social-review.md`.

Migreringen er ikke kjørt i Supabase; live følging/deling mellom to kontoer og fysisk GPS-test gjenstår. Ingen test-e-poster eller treningsdata er sendt til andre. Eldre testnotater nedenfor beskriver tidligere prototypeversjoner.

## Automatiske kontroller

Kjør fra `mobile`: `npm run typecheck`, `npm run lint`, `npm test` og `npm run export:web`. Jest dekker simulatorens overganger, pause/resume, tid og distanse, ukeberegning, privat og idempotent lagring samt gjenoppretting.

Dette verifiserer ikke ekte GPS, native kart, batteribruk, bakgrunnsopptak eller Supabase-policyer. Disse funksjonene er ikke implementert i første fase.

## Utført 19. oktober 2026

- TypeScript: bestått.
- ESLint: bestått, ingen feil eller advarsler.
- Jest: 2 suites / 10 tester bestått. Inkluderer vedvarende lagringsfeil uten rekursiv skriveløkke.
- Expo Doctor: 20 av 20 kontroller bestått.
- Web-eksport: bestått.
- `expo export --platform all`: bestått for web og Hermes-pakker til både Android og iOS. Dette er JavaScript/bytecode-pakking, ikke APK/IPA eller enhetstest. Hermes feilet først i sandkassens temp-mappe; samme kode pakket riktig utenfor sandkassen.
- Nettlesertest ved 390 × 844: onboarding, hjem, simulatorstart/pause/avslutt, lagring, gjenåpning etter reload, fremgang og valg av diagramdag er kontrollert.
- Siste bygg: fellesskapets lokale påmelding/heiarop samt profilens lys/mørk-bryter er kontrollert i nettleseren.
- Appikonet er visuelt kontrollert. Splash er konfigurert, men ikke validert i native release-build.
- Fysisk iOS/Android-test er ikke utført.
- npm audit: 57 varslede pakker; se `security.md`. Ingen tvungne SDK-nedgraderinger er brukt.

Windows-sandkassen blokkerte først Jest sin `realpath`-operasjon. Testene bestod utenfor sandkassen. Dette krevde ingen endring i testlogikken.

## Manuell akseptansetest på telefon

Etter UX-forenklingen: kontroller Tren ved 390 × 844 og 320 × 640. Under en aktiv økt skal distanse, aktiv tid, snittempo og Pause være synlige uten rulling. Rull innholdet og bekreft at Pause blir stående nederst. Pause/Fortsett skal beholde samme plassering; Avslutt vises separat etter pause. Prøv også stor systemskrift og skjul/vis eksempelkart. Fysisk enhetskontroll gjenstår.

Kontrollert i nettleseren etter forenklingen: aktiv økt ved 320 × 640 viser alle tre målinger og Pause uten rulling. Knappen blir stående ved rulling og byttes til Fortsett på samme sted. Skjul kart og pauset visning er kontrollert ved 390 × 844. Typecheck, lint, 10 tester og web-eksport består. Disse skjermkontrollene erstatter ikke native testing eller test med stor systemskrift.

1. Start appen på en liten Android-telefon og en iPhone. Kontroller onboarding, tilbakeknapper, valgfritt navn, aktivitet og mål.
2. Åpne alle fem faner. Test med stor skrift, VoiceOver/TalkBack og redusert bevegelse. Kontroller kontrast og at kontroller ikke skjules bak systemnavigasjon.
3. Start simulering. Vent minst 10 sekunder. Pause: tid og distanse skal stå stille. Fortsett: kun aktiv tid teller.
4. Send appen i bakgrunnen og åpne igjen. Økten skal være pauset. Avslutt appen og åpne på nytt: lokalt øktbilde skal kunne fortsettes.
5. Avslutt via pause, endre navn og notater, lagre. Økten skal være privat og merket simulering. Åpne den fra historikken. Last appen på nytt og kontroller persistens.
6. Prøv forkasting og sletting, både avbryt og bekreft. Kontroller at øvrige økter beholdes.
7. Slå av eksempeldata. Hjem/fremgang/historikk skal bare vise egne simuleringer. Bytt lys/mørk modus, ukemål og foretrukne aktiviteter.
8. Trykk på diagrammets søyler. Meld på/av demo-utfordringen og gi/angre heiarop. Ingenting skal sendes til andre.
9. Verifiser Apple Maps/Google Maps, panorering og markører på telefon. Web viser kun ruteillustrasjon. Ingen lokasjonstillatelse skal etterspørres.
10. Bekreft appikon og splash i en faktisk native release-build. Expo Go er ikke nok for splash-validering.

## Senere tracking-akseptanse

REA CLI 6.7.0: start → pause → fortsett bestod etter siste forenkling ved 390 × 844. Full evidens og skjermbilder er lagret under `docs/analysis/`. Typecheck, lint, 10 tester og web-eksport bestod. Dette gjelder nettleserprototypen, ikke native GPS.

Ekte GPS krever separate fysiske tester: låst skjerm, bakgrunn, unøyaktig signal, nettbrudd, appavbrudd, lavt batteri, pause/resume, filtrering, duplikatfri sync og korrekt distanse mot kjent strekning. Simulatorresultater må aldri rapporteres som GPS-testresultater.

20. oktober 2026: Lys redesign kontrollert med REA MCP ved 390 × 844 og 320 × 640. Hele simuleringsflyten, profil, grupper, treningslogg og innstillinger bestod etter retting av navigasjonsfeil. Typecheck, lint, 11 tester og web-eksport bestod. Se analysis/light-design-review.md for evidens og begrensninger.

20. oktober 2026: Supabase-klient konfigurert. Skrivebeskyttet Auth settings-kontroll returnerte HTTP 200 og godkjente publishable key. Typecheck, lint, 17 tester og web-eksport bestod. Ingen kontoer eller databaseposter ble opprettet; innlogging, RLS og native sesjonsfornyelse er ikke ende-til-ende-verifisert.

Databaseutrulling 20. oktober 2026: SQL Editor rapporterte suksess. Kontroll i produksjonsprosjektet bekreftet 7 tabeller med RLS, 18 policies, ingen anon SELECT-rettigheter, authenticated EXECUTE på publish_workout og aktiv profil-trigger. Skrivebeskyttede REST-kall til alle 7 tabellene returnerte 401/42501 uten brukerinnlogging. To-konto-flyt og fysisk GPS gjenstår.
