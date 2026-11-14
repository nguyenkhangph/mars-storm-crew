import type { DecisionSol, Label } from '../engine/types';
import type { Mood, Role } from './assets';

/** Source label of each bulletin and of each explanation shown after a choice. */
export const BULLETIN_LABEL: Record<DecisionSol, Label | 'hidden'> = {
  4: 'real', 8: 'scenario', 11: 'real', 14: 'real', 17: 'hidden', 21: 'scenario', 26: 'real',
};
/** null = a science explanation, shown without a data label. */
export const AFTER_LABEL: Record<DecisionSol, Label | null> = {
  4: null, 8: 'scenario', 11: 'real', 14: 'scenario', 17: 'based', 21: 'scenario', 26: 'real',
};
export const SPEAKERS: Record<DecisionSol, [Role, Role]> = {
  4: ['doctor', 'life'], 8: ['rover', 'scientist'], 11: ['power', 'scientist'], 14: ['botanist', 'power'],
  17: ['doctor', 'scientist'], 21: ['life', 'doctor'], 26: ['power', 'scientist'],
};

/** Faces each speaker shows once they finish talking. */
export const MOODS: Record<DecisionSol, [Mood, Mood]> = {
  4: ['neutral', 'neutral'], 8: ['happy', 'happy'], 11: ['surprised', 'neutral'], 14: ['sad', 'angry'],
  17: ['surprised', 'neutral'], 21: ['sad', 'surprised'], 26: ['neutral', 'happy'],
};

/** Dust level shown behind each intro shot. */
export const CUT_TAU: Record<string, number> = { space: 0.5, clear: 0.5, storm: 9, signal: 10.8, crew: 9, commander: 9, sol: 0.5, logo: 9 };
