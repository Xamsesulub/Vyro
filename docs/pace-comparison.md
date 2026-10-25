# Kontroll av snittempo mot Strava, 25. oktober 2026

## Resultat

Ingen regnefeil funnet i VYROs snittempo for de viste målingene. Beregningen bruker samlet aktiv opptakstid delt på full GPS-distanse i kilometer. Skjermvisningen av distansen avrundes først etter beregningen. Dette er ikke en feltverifikasjon av GPS-nøyaktighet eller av Stravas interne algoritme.

| Bilde | Tid | Vist distanse | Vist snittempo |
| --- | --- | --- | --- |
| VYRO under opptak | 01:13 | 0,11 km | 11:20 min/km |
| VYRO under opptak | 01:42 | 0,15 km | 11:26 min/km |
| VYRO under opptak | 02:21 | 0,21 km | 11:25 min/km |
| VYRO oppsummering | 05:58 | 0,55 km | 10:56 min/km |
| Strava, pauset | 06:36 | 0,59 km | 11:01 min/km |

VYROs oppsummering viser også 5.5 km/t. 10:56 min/km tilsvarer omtrent 5,49 km/t, som vises som 5.5 km/t. Forskjellen mellom de viste sluttempoene er fem sekunder per kilometer. Opptakene viser samtidig 38 sekunder ulik tid og 0,04 km ulik avrundet distanse. Det er ikke bekreftet at opptakene har samme start/stopp, pauser og forløp; en relativ GPS-feil kan derfor ikke beregnes fra denne sammenligningen.

## Presisjon og tidsgrunnlag

- `features/activities/model.ts`: `pace(distance, seconds)` bruker `seconds / distance`, med hele den lagrede distansen. `duration` viser hele sekunder nedover; `km` avrunder til to desimaler. For eksempel gir **545,5 meter på 358 sekunder** 10:56 min/km, 0,55 km og 5.5 km/t. Dette er en illustrativ verdi som passer bildet, ikke gjenfunnet rådata fra brukerens økt.
- Opptakskart, oppsummering, treningslogg og Live Activity bruker samme tempofunksjon. `useAppStore.save` lagrer distanse og tid uten avrunding; presisjonen beholdes ved gjeninnlasting.
- Snittet bruker total tid / total distanse, også når farten varierer. Et vanlig gjennomsnitt av tempoene fra ulike delstrekninger ville gitt feil vektlegging.
- Pause stopper både tids- og distansetelling. Fortsett oppretter et nytt rutesegment, slik at forflytning under pausen ikke telles. Stillstand mens opptaket er aktivt teller som tid; VYRO har ikke automatisk bevegelsespause. «Aktiv tid» betyr opptakstid uten pauser, ikke en beregnet bevegelsestid.
- Bildene viser Expo Go og teksten «Hold appen åpen · opptaket pauser i bakgrunnen». `_layout.tsx` pauser opptaket når appen forlater aktiv tilstand uten aktiv bakgrunnstjeneste. Veksling til Strava eller skjermlås kan derfor avbryte VYROs måling. Nytt signert appbygg og aktivert/tillatt bakgrunnsopptak kreves for denne testformen.

Stravas viste 396 sekunder / 0,59 km ville direkte gitt omtrent 11:11 min/km, ikke 11:01. Derfor kan ikke Stravas skjulte råverdier og tidsgrunnlag rekonstrueres entydig fra bildet. VYROs avrundingsregel skal ikke antas å være Stravas regel. Stravas hjelpeside om tempo og deres API-referanse ble forsøkt lest, men begge svarte HTTP 403 i dette miljøet; ingen påstand om identisk automatisk pause eller etterbehandling er verifisert.

## Kontroller

**52 tester i seks suiter består**, inkludert seks nye regresjonstilfeller:

- Fire illustrative målesett som viser hvorfor tempo må beregnes før avstandsavrunding.
- Syntetiske GPS-punkter med 300 m ved 1 m/s, to minutters pause med forflytning, og 200 m ved 2 m/s. Kun 500 m og 400,25 sekunders aktiv opptakstid telles; snittet blir 13:20 min/km. Dette er testdata, ikke en virkelig GPS-måling.
- Lagre og gjeninnlese 0,5455 km / 358,25 sekunder uten presisjonstap.

Eksisterende tester dekker også GPS-filter, signalgap, stillstand, pauser, bakgrunnsopptak og Live Activity. Typecheck og lint uten cache består. Ingen produksjonskode, GPS-terskel, pausefunksjon eller beregningsregel er endret.

## Fysisk sammenligning som gjenstår

Bruk en kjent utendørs rute på minst 1–2 km, samme start/stopp og samme manuelle pauser. Med Expo Go må VYRO være i forgrunnen hele opptaket; samtidige opptak på én telefon krever et eget bygg med fungerende bakgrunnsopptak. Sammenlign både distanse, opptakstid, pauser og spor etterpå. GPS-filteret i VYRO forkaster unøyaktige punkter over 30 m, steg under 3 m og urimelig fart; gap over 30 sekunder telles ikke som en rett strek. Effekten på akkurat denne turen kan bare vurderes med faktiske opptaksdata.
