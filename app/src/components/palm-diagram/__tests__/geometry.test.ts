import { buildDiagram, differentiateGeometry, handSilhouette, smoothPath, type LineGeometry } from '../geometry';

// Not in reading order on input — buildDiagram must reorder to heart · head · life · fate.
const geo: LineGeometry = {
  head_line: [
    [100, 300],
    [500, 315],
    [900, 320],
  ],
  heart_line: [
    [120, 200],
    [880, 210],
  ],
  life_line: [
    [150, 250],
    [220, 600],
    [300, 900],
  ],
};

describe('palm diagram geometry (P6.T2)', () => {
  it('smoothPath is deterministic and emits a bezier path', () => {
    const a = smoothPath([
      [0, 0],
      [10, 10],
      [20, 0],
    ]);
    expect(a).toBe(
      smoothPath([
        [0, 0],
        [10, 10],
        [20, 0],
      ]),
    );
    expect(a.startsWith('M ')).toBe(true);
    expect(a).toContain('C ');
  });

  it('emits the major lines in classical reading order (heart · head · life · fate)', () => {
    expect(buildDiagram(geo).map((s) => s.line)).toEqual(['heart_line', 'head_line', 'life_line']);
  });

  it('scales into the requested size frame (deterministic per size)', () => {
    expect(buildDiagram(geo, { size: 500 })[0].d).not.toBe(buildDiagram(geo, { size: 1000 })[0].d);
    expect(buildDiagram(geo, { size: 300 })).toEqual(buildDiagram(geo, { size: 300 }));
  });

  it('highlights the requested line and only it', () => {
    const d = buildDiagram(geo, { highlightedLine: 'head_line' });
    expect(d.find((s) => s.line === 'head_line')?.highlighted).toBe(true);
    expect(d.find((s) => s.line === 'heart_line')?.highlighted).toBe(false);
  });

  it('falls back to signatureLines when no explicit highlight (the hero)', () => {
    const d = buildDiagram(geo, { signatureLines: ['heart_line', 'fate_line'] });
    expect(d.find((s) => s.line === 'heart_line')?.highlighted).toBe(true);
    expect(d.find((s) => s.line === 'head_line')?.highlighted).toBe(false);
  });

  it('skips lines with fewer than 2 points', () => {
    const d = buildDiagram({ heart_line: [[1, 1]], head_line: [[0, 0], [10, 10]] });
    expect(d.map((s) => s.line)).toEqual(['head_line']);
  });

  it('attaches CJK labels to the major lines', () => {
    expect(buildDiagram(geo).find((s) => s.line === 'heart_line')?.label?.text).toBe('心');
  });

  it('anchors labels to edge margins (heart/head → right/end, life → left/start)', () => {
    const d = buildDiagram(geo, { size: 1000 });
    const heart = d.find((s) => s.line === 'heart_line')?.label;
    const head = d.find((s) => s.line === 'head_line')?.label;
    const life = d.find((s) => s.line === 'life_line')?.label;
    expect(heart?.anchor).toBe('end');
    expect(head?.anchor).toBe('end');
    expect(life?.anchor).toBe('start');
    // heart + head share the right margin but are nudged apart vertically (no overlap).
    expect(heart?.x).toBe(head?.x);
    expect(Math.abs((heart?.y ?? 0) - (head?.y ?? 0))).toBeGreaterThan(20);
  });

  it('hand silhouette palm bounds ENCLOSE every line point (containment — lines never overshoot)', () => {
    // The core F0.11 invariant, on the reading-order fixture and on an edge-heavy one.
    const fixtures: LineGeometry[] = [
      geo,
      { heart_line: [[40, 60], [960, 70]], head_line: [[50, 940], [900, 930]], life_line: [[500, 30], [520, 980]] },
    ];
    for (const g of fixtures) {
      const { palm } = handSilhouette(g);
      for (const pts of Object.values(g)) {
        for (const [x, y] of pts) {
          expect(x).toBeGreaterThanOrEqual(palm.x0);
          expect(x).toBeLessThanOrEqual(palm.x1);
          expect(y).toBeGreaterThanOrEqual(palm.y0);
          expect(y).toBeLessThanOrEqual(palm.y1);
        }
      }
    }
  });

  it('hand silhouette emits a palm + four fingers + a thumb (six subpaths), deterministically', () => {
    const a = handSilhouette(geo);
    expect(a.parts).toHaveLength(6);
    expect(a.parts.every((d) => d.startsWith('M '))).toBe(true);
    expect(handSilhouette(geo)).toEqual(a); // pure / deterministic
  });

  it('differentiateGeometry mirrors + nudges so a partner never looks cloned (deterministic)', () => {
    const d = differentiateGeometry(geo);
    expect(Object.keys(d)).toEqual(Object.keys(geo));
    // At least one point moved meaningfully from the original (not an identity/near-clone).
    const moved = Object.keys(geo).some((line) =>
      geo[line].some((p, i) => Math.abs(p[0] - d[line][i][0]) > 40 || Math.abs(p[1] - d[line][i][1]) > 15),
    );
    expect(moved).toBe(true);
    expect(differentiateGeometry(geo)).toEqual(d); // deterministic (no RNG)
  });

  it('keeps every label anchor inside the screen-edge gutter (no clipping)', () => {
    const size = 300;
    const gutter = (56 / 1000) * size;
    for (const s of buildDiagram(geo, { size })) {
      if (!s.label) continue;
      expect(s.label.x).toBeGreaterThanOrEqual(0);
      expect(s.label.x).toBeLessThanOrEqual(size);
      expect(s.label.y).toBeGreaterThanOrEqual(gutter - 0.1);
      expect(s.label.y).toBeLessThanOrEqual(size - gutter + 0.1);
    }
  });
});
