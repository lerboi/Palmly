import { handSignature } from '../handSignature';

// A plausible right palm in canonical space (wrist pinned at (0.5, 0.866), middle MCP at
// (0.5, 0.501) by the cv1 warp). Only the 21-point layout matters to the math.
const palm = (): [number, number][] => [
  [0.5, 0.866], // 0 wrist
  [0.42, 0.82], [0.36, 0.75], [0.32, 0.69], [0.29, 0.64], // thumb 1-4
  [0.42, 0.52], [0.41, 0.42], [0.4, 0.36], [0.4, 0.31], // index 5-8
  [0.5, 0.501], [0.5, 0.39], [0.5, 0.32], [0.5, 0.26], // middle 9-12
  [0.58, 0.52], [0.59, 0.42], [0.6, 0.36], [0.6, 0.31], // ring 13-16
  [0.65, 0.56], [0.67, 0.48], [0.68, 0.43], [0.69, 0.39], // pinky 17-20
];

describe('handSignature', () => {
  it('produces splay-robust chain lengths + palm width, rounded to 4dp', () => {
    const sig = handSignature(palm());
    expect(sig).not.toBeNull();
    expect(sig!.fingers).toHaveLength(4);
    // middle finger chain: (0.5,0.501)→(0.5,0.39)→(0.5,0.32)→(0.5,0.26) = 0.241
    expect(sig!.fingers[1]).toBeCloseTo(0.241, 4);
    // palm width: (0.42,0.52)↔(0.65,0.56)
    expect(sig!.palm_width).toBeCloseTo(Math.hypot(0.23, 0.04), 4);
    // thumb is excluded by design (most pose-variable digit)
    expect(sig!.fingers.every((f) => f > 0 && f < 1)).toBe(true);
  });

  it('is invariant under finger SPLAY (rotation about the MCP) of the index finger', () => {
    const base = handSignature(palm())!;
    const splayed = palm();
    // rotate the index chain (6,7,8) about MCP(5) by ~15°
    const [mx, my] = splayed[5];
    const rot = (p: [number, number]): [number, number] => {
      const [dx, dy] = [p[0] - mx, p[1] - my];
      const a = (15 * Math.PI) / 180;
      return [mx + dx * Math.cos(a) - dy * Math.sin(a), my + dx * Math.sin(a) + dy * Math.cos(a)];
    };
    splayed[6] = rot(splayed[6]);
    splayed[7] = rot(splayed[7]);
    splayed[8] = rot(splayed[8]);
    const sig = handSignature(splayed)!;
    expect(sig.fingers[0]).toBeCloseTo(base.fingers[0], 3); // chain length preserved
    expect(sig.palm_width).toBeCloseTo(base.palm_width, 4);
  });

  it('returns null for short landmark arrays', () => {
    expect(handSignature(palm().slice(0, 10))).toBeNull();
    expect(handSignature([])).toBeNull();
  });
});
