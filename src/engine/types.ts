export type Label = 'real' | 'based' | 'scenario' | 'game';

export type Choices = {
  4?: number; // parts of water pumped into the shelter wall (0-6)
  8?: 'ice' | 'bags' | 'science';
  11?: 'safety' | 'science' | 'reserve';
  14?: 'keep' | 'dim' | 'off';
  17?: 'shelter' | 'ask';
  21?: 'keep' | 'drain';
  26?: 'clean' | 'burst';
};
export type DecisionSol = keyof Choices;

/** hintCorrect: whether the day-17 meter hint (both meters vs one) tells the truth. */
export type Luck = { falseAlarm: boolean; secondStorm: boolean; hintCorrect?: boolean };

export type Row = {
  sol: number;
  tau: number;
  power: number; // kWh generated this sol
  batt: number;
  o2: number;
  water: number;
  food: number;
  wall: number;
  dose: number;
  sci: number;
  life: number; // 0-100, lowest of O2, water, food vs. their start
  powerPct: number; // battery, 0-100
};

export type Failure = 'o2' | 'water' | 'food' | 'dose';
export type Run = { rows: Row[]; fail: { kind: Failure; sol: number } | null };
