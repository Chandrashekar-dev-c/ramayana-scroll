// Poses as joint angles, and the blend between two of them.
// Angles in degrees from straight down; positive swings toward the facing side.
// arm: [shoulder, elbow bend]; leg: [thigh, knee bend].
export const POSES = {
  stand: { armF: [8, 12], armB: [-8, -12], legF: [5, 0], legB: [-5, 0] },
  stand2: { armF: [13, 20], armB: [-4, -18], legF: [6, 0], legB: [-4, 0], head: 3 },
  walk0: { armF: [28, 18], armB: [-26, -8], legF: [26, -4], legB: [-22, -16], y: 0 },
  walk1: { armF: [10, 14], armB: [-10, -12], legF: [6, 0], legB: [4, -42], y: -3 },
  walk2: { armF: [-22, 10], armB: [24, 16], legF: [-22, -16], legB: [26, -4], y: 0 },
  walk3: { armF: [-8, 12], armB: [10, 14], legF: [4, -42], legB: [6, 0], y: -3 },
  draw0: { armF: [84, 4], armB: [58, 30], legF: [14, 0], legB: [-14, 0], bow: 0.15 },
  draw1: { armF: [90, 0], armB: [-16, 112], legF: [16, 0], legB: [-16, 0], bow: 0.55 },
  draw2: { armF: [90, 0], armB: [-78, 152], legF: [18, 0], legB: [-18, 0], bow: 1, lean: -4 },
  shoot: { armF: [90, 0], armB: [-104, 70], legF: [18, 0], legB: [-18, 0], lean: 3 },
  jump: { armF: [70, 25], armB: [-60, -20], legF: [42, -62], legB: [-12, -52], air: true },
  crouch: { lean: 58, armF: [45, 70], armB: [20, 60], legF: [82, -128], legB: [48, -118] },
  hurt: { lean: -16, armF: [-34, -20], armB: [-66, -10], legF: [-8, 0], legB: [-22, -12], head: -12 },
  kneel: { armF: [20, 30], armB: [-10, 20], legF: [84, -96], legB: [-6, -88], lean: 6 },
  sit: { armF: [30, 40], armB: [10, 40], legF: [86, -84], legB: [78, -100] },
  namaste: { armF: [10, -128], armB: [-10, 128], legF: [5, 0], legB: [-5, 0], lean: 5, fold: true },
  bow: { armF: [10, -128], armB: [-10, 128], legF: [5, 0], legB: [-5, 0], lean: 30, head: 14, fold: true },
  hold: { armF: [72, 22], armB: [52, 34], legF: [8, 0], legB: [-8, 0] },
  give: { armF: [84, 8], armB: [-8, -12], legF: [10, 0], legB: [-10, 0], lean: 6 },
  raise: { armF: [158, 12], armB: [-158, -12], legF: [8, 0], legB: [-8, 0] },
  point: { armF: [96, 0], armB: [-8, -12], legF: [8, 0], legB: [-8, 0] },
  carry: { armF: [168, -24], armB: [-168, 24], legF: [8, 0], legB: [-8, 0] },
  kick: { armF: [-30, 10], armB: [-50, -10], legF: [84, -8], legB: [-6, 0], lean: -12 },
  swing0: { armF: [166, 26], armB: [-30, -20], legF: [16, 0], legB: [-16, 0], lean: -8, obj: -34 },
  swing1: { armF: [62, 6], armB: [-40, -20], legF: [24, -6], legB: [-20, 0], lean: 18, obj: 78 },
  charge: { lean: 44, armF: [-40, -20], armB: [-70, -10], legF: [38, -20], legB: [-34, -30], head: -20 },
  charge2: { lean: 44, armF: [-60, -10], armB: [-30, -20], legF: [-30, -34], legB: [36, -16], head: -20 },
  fly: { lean: 82, armF: [96, 0], armB: [80, 10], legF: [-66, 0], legB: [-78, -12], air: true, head: -60 },
  fly2: { lean: 78, armF: [100, 0], armB: [70, 14], legF: [-74, -10], legB: [-64, 0], air: true, head: -58 },
  climb: { armF: [160, 20], armB: [-120, -60], legF: [50, -90], legB: [-10, -40], air: true },
  grieve: { lean: 24, armF: [30, 100], armB: [-20, 120], legF: [84, -96], legB: [-6, -88], head: 26 },
  hide: { lean: 40, armF: [40, 90], armB: [20, 80], legF: [80, -130], legB: [50, -120], head: -10 },
  cast: { armF: [120, 10], armB: [-30, -30], legF: [16, 0], legB: [-16, 0], lean: -6 },
  dead: { armF: [20, 10], armB: [-20, -10], legF: [8, 0], legB: [-8, 0] },
};
export const WALK = ['walk0', 'walk1', 'walk2', 'walk3'];

const PAIRS = ['armF', 'armB', 'legF', 'legB'];
const NUMS = ['lean', 'head', 'y', 'bow', 'obj'];
/** Blend two poses by k (0 = a, 1 = b). Angles move together, so a figure changes pose
 * the way a puppet does: every joint travels at once, then settles. */
export function blendPose(a, b, k) {
  if (k <= 0) return a; if (k >= 1) return b;
  const out = {};
  for (const p of PAIRS) { const x = a[p] || [0, 0], y = b[p] || [0, 0]; out[p] = [x[0] + (y[0] - x[0]) * k, x[1] + (y[1] - x[1]) * k]; }
  for (const n of NUMS) { const x = a[n] || 0, y = b[n] || 0; if (x || y) out[n] = x + (y - x) * k; }
  const pick = k < 0.5 ? a : b;
  if (pick.air) out.air = true;
  if (pick.fold) out.fold = true;
  return out;
}

