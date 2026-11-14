/**
 * Balance parameters. These are GAME numbers, tuned by the balance test,
 * not physical constants. Units: kWh for power, "days" for O2/water/food,
 * % of the mission dose budget for radiation.
 */
export const P = {
  E0: 190, // kWh per sol from the panels under a clear sky
  baseKwh: 24, // small backup power that does not need sunlight
  dustK: 0.45, // power falls as exp(-dustK * tau)
  dirtRate: 0.012,
  dirtMax: 0.6,
  battStart: 600,
  battCap: 1400,
  draw: 0.27, // share of the battery the station may draw per sol
  lifeKwh: 45, // heating, air, oxygen
  greenhouseKwh: 27,
  o2Start: 14.5,
  waterStart: 31,
  foodStart: 20.2,
  waterUse: 0.59,
  waterElec: 0.27, // water split into oxygen when life support has power
  foodUse: 1, // food eaten per sol
  foodCold: 0.77, // a cold, dim station burns extra food
  shelterKwh: 80, // heaters and air for the shelter during a false alarm
  foodGreenhouse: 0.96,
  iceGain: 5,
  evaKwh: 39,
  cleanKwh: 15, // a short walk to wipe the panels
  burstKwh: 25, // the last experiment
  evaDose: 4,
  bagWall: 2.5,
  bgDose: 0.9,
  sepDose: 100,
  wallK: 3, // wall of k parts cuts dose by e^-1
  shelterFactor: 0.45,
  delayLeak: 0.58, // share of the storm dose taken while waiting for Earth
  falseAlarmP: 0.35,
  sep2Sol: 24,
  sep2Dose: 100,
  sep2P: 0.3,
  sciPerKwh: 0.03,
  sciStay: 16,
  sciBurst: 18,
  maxWall: 6,
  hintAccuracy: 0.8, // the day-17 meter hint is right 4 times out of 5
} as const;

export const DECISION_SOLS = [4, 8, 11, 14, 17, 21, 26] as const;
export const LAST_SOL = 30;
