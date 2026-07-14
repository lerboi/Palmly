import { PREVIEW_THREAD, citationLabel } from '../chat';

describe('chat (P9.T6)', () => {
  it('formats a citation label from feature keys (deduped, readable line names)', () => {
    expect(citationLabel(['heart_line.depth.deep'])).toBe('Cites your heart line');
    expect(citationLabel(['heart_line.depth.deep', 'life_line.length.long'])).toBe('Cites your heart line & life line');
    expect(citationLabel(['heart_line.a', 'heart_line.b'])).toBe('Cites your heart line');
    expect(citationLabel([])).toBe('');
  });

  it('preview thread has a cited assistant answer (grounding made visible)', () => {
    const assistant = PREVIEW_THREAD.find((m) => m.role === 'assistant');
    expect(assistant?.citations?.length ?? 0).toBeGreaterThan(0);
    expect(citationLabel(assistant?.citations ?? [])).toContain('heart line');
  });
});
