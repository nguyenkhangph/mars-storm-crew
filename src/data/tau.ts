/**
 * Dust opacity (tau) per sol. Sol 14 = 10 June 2018.
 * Only the 10.8 on sol 14 is a real Opportunity measurement (JPL).
 * Everything else is a "Game number": the storm grows in early June and the
 * dust stays thick through sol 30, as it did over Meridiani for weeks
 * (Montabone et al. 2020 show the planet-wide haze lasting into August).
 */
export const TAU_REAL_SOL = 14;
export function tau(sol: number): number {
  if (sol <= 8) return 0.5;
  if (sol <= 14) return 0.5 + ((10.8 - 0.5) * (sol - 8)) / 6;
  if (sol <= 22) return 10.8 - ((10.8 - 9.5) * (sol - 14)) / 8;
  return 9.5 - ((9.5 - 8) * (sol - 22)) / 8;
}
