// Trial registry. Each trial has its own controls, a painted goal, one-line tip and no
// fail state that sends the player to the start.
import { createRow } from './row.js';
import { createFlight } from './flight.js';
import { createStealth, createRooftops } from './lanka.js';
import { createKohbar } from './kohbar.js';

const TRIALS = {
  row: createRow,
  flight: createFlight,
  stealth: createStealth,
  rooftops: createRooftops,
  kohbar: (b, r) => Object.assign(createKohbar(b, r), { fullscreen: true }),
};

export function createTrial(kind, beat, runner) {
  const f = TRIALS[kind];
  if (!f) throw new Error('Unknown trial ' + kind);
  return f(beat, runner);
}
export const TRIAL_KINDS = Object.keys(TRIALS);
