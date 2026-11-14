# Mars Storm Crew (Vượt Bão Sao Hỏa)

_Formerly "SOL CREW: Stay Alive!"._

A browser game for ages 7–12, built for NASA Space Apps 2026 (*Build a Junior Astronaut Mission Trainer*).
You are Mission Commander of a Mars station during the 2018 global dust storm, the storm that ended Opportunity.
Seven decisions over 30 sols. Water can be drunk or used as a radiation wall, never both.

English by default, Vietnamese with the **VI** button (or `?lang=vi`).
On iPhone, Safari → Share → **Add to Home Screen** opens the game full screen in landscape.
The Commander can pick a face and type a nickname (kept only in this browser). At the end, a certificate PNG is drawn in the browser and downloaded; nothing is uploaded, and it says it is not an official NASA document.

Play: https://www.stormcrew.space

Demo seeds: `?seed=998` real storm, `?seed=3989` real storm + second storm, `?seed=1` false alarm, `?seed=8` false alarm + second storm, `?seed=3` false alarm where the meter clue misleads. The end screen shows each game's mission code so a class can replay the same storm.
`npm run snapshot` saves a 30-day DONKI summary (radiation storms, strong flares, CMEs forecast to reach Mars) to `public/donki-snapshot.json` as an offline fallback.

## Run it

```bash
npm install
python scripts/setup_assets.py --portraits <portraits.zip> --icons <icons.zip> --marsbase <Mars_Base.7z> --bg <mountains.png>
npm run dev
```

`npm test` runs the balance and string checks, `npm run build` makes `dist/`.

### Asset packs (not in this repo)

Their licenses do not allow sharing the raw files, so `public/assets/` is git-ignored.
Each teammate downloads the packs and runs `scripts/setup_assets.py` (needs `pip install pillow numpy py7zr`).
It copies the sprites and UI kit pieces (panels, buttons, bars, dialog frames) and composes `scenes/clear.webp` and `scenes/storm.webp`.
Sounds are synthesized in the browser (`src/ui/sound.ts`), so there are no audio files.
Each argument takes a `.zip`, a `.7z` or an extracted folder.

| Pack | Used for |
|---|---|
| Cozy Space Portraits | crew faces |
| Cozy Space Icons & UI | HUD icons |
| Mars Base Pixel Art (MutterPixel Studio) | station buildings, rocks, water tank |
| Mountain strip PNG (dry, no water) | horizon (source to be credited) |

Without the packs the game still runs; pictures are just blank.

## How it works

- `src/engine/` is a pure simulation: `simulate(choices, luck)` always gives the same run, so *What if?* re-runs it with one choice changed.
- `src/data/delay.ts`: Earth–Mars light time per day from JPL Horizons.
- `src/data/tau.ts`: dust haze. Only sol 14 (10 June 2018, Opportunity, about 10.8; one NASA figure shows 10.5) is a real measurement; the rest is a game curve.
- `src/engine/debrief.ts`: the end-of-mission report. It replays the run with every other option at each decision (same luck) to rate safety, radiation, discoveries and smart choices, and to name the best choice and one worth retrying. It is built from the simulation itself: no language model is used.
- Every bulletin carries a label: Real data, Based on a real event, Scenario, or Game number.

## NASA data we use and why

- **Opportunity dust level (NASA/JPL):** tau about 10.8 on 10 June 2018 is the real anchor of the dust curve (Day 14). Dust sets solar power, so it drives the power, heat, air and food choices.
- **Curiosity RAD (NASA OSDR RadLab, Zeitlin et al. 2018):** the Day 17 solar storm is based on the September 2017 solar particle event, when the dose rate at Gale more than doubled (about 8 to 18 µGy/h). The real numbers appear after Day 14 and Day 17.
- **JPL Horizons:** the real Earth–Mars distance for each day gives the one-way signal delay on the "Ask Earth" card.
- **NASA DONKI (live, with saved fallback):** the end screen counts the last 30 days of radiation storms, strong flares and CMEs forecast to reach Mars, so the shelter question meets today's Sun. Saved data is labeled with its date.
- **Labels in the game** say what is real data, based on a real event, a scenario, or a game number. NASA Mars Trek, CSA and OSDR links help teachers go further.

## Sources

- Opportunity dust opacity, June 2018: NASA/JPL
- Curiosity RAD radiation, September 2017 solar event: Zeitlin et al. 2018
- Radiation on Mars measured by Curiosity: RAD data in NASA OSDR RadLab (https://visualization.osdr.nasa.gov/radlab/gui/data-api/)
- Earth–Mars distance: JPL Horizons
- Live space weather (radiation storms, strong flares, CMEs forecast to reach Mars): NASA DONKI (`ccmc.gsfc.nasa.gov/DONKI-API`, with `api.nasa.gov` as backup)
- The September 2017 storm in DONKI: https://ccmc.gsfc.nasa.gov/DONKI/view/SEP/13101/-1
- Storm shelters with water walls can cut the radiation dose by about half: NASA RadWorks study (https://ntrs.nasa.gov/citations/20150001237)
- Where Opportunity (Meridiani) and Curiosity (Gale) are: NASA Mars Trek (https://trek.nasa.gov/mars/)
- For teachers: Canadian Space Agency food-production toolkit (https://www.asc-csa.gc.ca/eng/youth-educators/toolkits/food-production/)
- More free space activities for kids and clubs: Canadian Space Agency (https://www.asc-csa.gc.ca/eng/youth-educators/resources-stem-and-youth-organizations.asp)
- Real experiments on young plants and space-like radiation: NASA OSDR (OSD-46) (https://osdr.nasa.gov/bio/repo/data/studies/OSD-46)

## Deploy

```bash
npm run build
vercel deploy dist --prod
```
Deploy the built `dist/` from a machine that has run the setup script. A Git-connected build would have no art.

## License

Code: MIT. Art: Cozy Space Portraits and Cozy Space Icons & UI by Bramble & Byte; Mars Base Pixel Art by MutterPixel Studio (not included). Font: Be Vietnam Pro, SIL OFL 1.1.
