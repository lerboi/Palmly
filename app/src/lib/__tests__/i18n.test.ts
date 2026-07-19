import { messages, pseudoLocalize, t } from '../i18n';

describe('i18n catalog + t()', () => {
  it('interpolates {var} placeholders and returns literal strings verbatim', () => {
    expect(t('capture.searching.palm', { handSide: 'left' })).toBe('Hold your left palm up to the camera');
    expect(t('capture.searching.palm', { handSide: 'right' })).toBe('Hold your right palm up to the camera');
    expect(t('capture.too_far')).toBe('Move closer');
  });

  it('leaves unknown/missing placeholders intact instead of throwing in render', () => {
    expect(t('capture.searching.palm')).toContain('{handSide}');
  });

  it('every catalog value is a non-empty source string', () => {
    for (const v of Object.values(messages)) expect(v.length).toBeGreaterThan(0);
  });

  it('pseudoLocalize expands (+~40%) and accents so English-only layouts overflow visibly', () => {
    const src = 'Move closer';
    const p = pseudoLocalize(src);
    expect(p.length).toBeGreaterThan(src.length);
    expect(p).toMatch(/[áéíóúñçŕţđ]/); // accented letters present
    expect(p.startsWith('⟦')).toBe(true);
  });
});
