import { assert, assertEquals } from '@std/assert';
import { constantTimeEqual } from './timing.ts';

// What this CAN'T test, stated plainly: a unit test cannot prove constant-time-ness. Timing a JS
// string compare on a loaded machine measures the scheduler, not the algorithm, and any threshold
// tight enough to catch `===` would flake. So these pin the CONTRACT (it must still be a correct
// equality) and the structure (no early exit on the first differing char) is held by review of the
// five-line primitive itself. The value here is that the equality cannot silently rot.

Deno.test('constantTimeEqual: agrees with === on equality for every relevant shape', () => {
  const cases: [string, string][] = [
    ['', ''],
    ['a', 'a'],
    ['sb_secret_XYZ', 'sb_secret_XYZ'],
    ['a', 'b'],
    ['ab', 'ab'],
    ['ab', 'ba'],             // same chars, wrong order
    ['abc', 'abd'],           // differs at the LAST char (the case `===` returns latest on)
    ['abc', 'zbc'],           // differs at the FIRST char (the case `===` returns earliest on)
    ['abc', 'abcd'],          // prefix — must not be equal
    ['abcd', 'abc'],
    ['', 'a'],
    ['\u0000', '\u0000'],
    ['é', 'é'],
  ];
  for (const [a, b] of cases) {
    assertEquals(constantTimeEqual(a, b), a === b, `constantTimeEqual(${JSON.stringify(a)}, ${JSON.stringify(b)})`);
  }
});

Deno.test('constantTimeEqual: XOR accumulation cannot be fooled by cancelling differences', () => {
  // A naive accumulator that ADDED char deltas would return 0 here (+1 then -1). XOR cannot cancel.
  assert(!constantTimeEqual('ac', 'bb'));
  assert(!constantTimeEqual('ba', 'ab'));
});
