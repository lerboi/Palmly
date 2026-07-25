import { PREVIEW_THREAD, citationLabel, lastUserText, systemMessage, withoutSystem } from '../chat';

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

/**
 * Who is speaking when something fails (Audit-4 SH-6). A network error used to render as an
 * ASSISTANT bubble wearing the Palmly avatar — the reader appearing to apologise for the network.
 */
describe('chat failure notices (SH-6)', () => {
  it('authors failures as the app, never as the assistant', () => {
    const m = systemMessage('e-1', 'That didn’t go through.');
    expect(m.role).toBe('system');
    expect(m.role).not.toBe('assistant');
    expect(m.text).toContain('go through');
  });

  it('retries the last thing the USER asked, not the notice', () => {
    const thread = [
      { id: 'u1', role: 'user' as const, text: 'first question' },
      { id: 'a1', role: 'assistant' as const, text: 'an answer' },
      { id: 'u2', role: 'user' as const, text: 'second question' },
      systemMessage('e1', 'That didn’t go through.'),
    ];
    expect(lastUserText(thread)).toBe('second question');
    expect(lastUserText([])).toBeUndefined();
    expect(lastUserText([systemMessage('e1', 'x')])).toBeUndefined();
  });

  it('clears failure notices on retry instead of stacking them', () => {
    const thread = [
      { id: 'u1', role: 'user' as const, text: 'q' },
      systemMessage('e1', 'fail one'),
      systemMessage('e2', 'fail two'),
    ];
    const cleaned = withoutSystem(thread);
    expect(cleaned).toHaveLength(1);
    expect(cleaned.every((m) => m.role !== 'system')).toBe(true);
  });
});
