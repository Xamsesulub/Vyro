# Fotball i VYRO

Velg **Fotball** i Tren, start GPS-opptaket og ha telefonen med deg under aktiviteten. Etter Stopp vises økten med tid, distanse, snittfart og tilgjengelig GPS-maksfart. **Rute** viser bevegelseslinjen på satellittkart; **Varmekart** viser hvor bevegelsen er tettest. Begge er tilgjengelige før lagring, i den private treningsloggen og i eksplisitt delte fotballinnlegg. Ett opptak har én idrett.

## Hva målingene betyr

- Varmekart bruker bare den aktuelle øktens lagrede GPS-rute. Like avstander gis lik vekt, uavhengig av målefrekvens. Grønt/gult/rødt er relativt innen denne økten, ikke sammenlignbare absolutte tall mellom spillere. Det måler ikke ståtid, ballberøringer, sprintantall, posisjon på laget eller formell banedekning.
- GPS-maksfart er den høyeste rettlinjede forflytningen over et sammenhengende vindu på 5–8 sekunder. Målinger krever rapportert nøyaktighet på høyst 10 meter og høyst tre sekunder mellom punktene. Pauser, feil tidsrekkefølge, store GPS-hopp og upresise målinger bryter vinduet. Små bevegelser innen kombinert GPS-usikkerhet regnes ikke som fart. Dette er et konservativt GPS-estimat, ikke en sertifisert eller øyeblikkelig toppfart.
- Makstallet beregnes ved lagring på telefonen og ved validert Watch-import. Eldre økter uten et slikt tall viser «—». Eldre gyldige GPS-ruter kan fortsatt vise varmekart.
- Ruten har samme opptaks-/pausegrenser som resten av VYRO. Kartet tegner ingen forbindelse over pause- eller personverngap. Kalorier og puls legges ikke til uten reelle støttede målinger.

GPS på en telefon er ikke presis nok til å dokumentere eksakt spillerposisjon på meternivå, særlig innendørs eller ved bygninger. Satellittbilder kan også være eldre enn banen. Fysisk test ute på banen gjenstår.

## Personvern og deling

Økten er privat som standard. Ved deling skjules 500 meter rundt start/slutt, som for andre økter. Dette kan skjule en hel fotballbane. **Del hele fotballruten** er derfor et frivillig, avslått valg som viser en forhåndsvisning før publisering. Valget deler også start, slutt og eventuell vei til/fra banen. Det nullstilles når en annen økt velges og lagres ikke som en generell innstilling.

Bare rutekoordinater, pausegrenser og eksplisitte øktmålinger publiseres. Rå tidspunkt, GPS-nøyaktighet, private notater og konkurransebevis følger ikke med. Følgere er standardpublikum; eksisterende regler for visning, sletting og reaksjoner beholdes. Varmekartet beregnes fra den ruten mottakeren faktisk har tilgang til. Det finnes ingen offentlig varmekartfil eller ny tjeneste som mottar private ruter.

## Implementasjon og kontroll

`features/football` inneholder tetthetsberegning, et lite PNG-bilde, fartsvindu og eksplisitt delingsvalg. Bildet plasseres geografisk på Apple-kartet med native Overlay og på web med en bildekilde. Pausegrenser og kamerautsitt beholdes ved Rute/Varmekart-bytte. Beregningen har grenser på 20 000 GPS-punkter, et 192 × 192-bilde og begrenset sampling/utjevning; ingen ny pakke, ekstern API eller bakgrunnsinnsamling er lagt til.

Migrering `202610270003_football_analysis.sql` legger til valgfri `posts.max_speed_kmh`, en fotballvariant av eksisterende publisering og validering av samme måling i private sikkerhetskopier. Anonym publisering er avvist, og eksisterende eierskaps-/publikumsregler gjelder. Se `testing.md` for gjennomførte kontroller og fysisk testplan.
