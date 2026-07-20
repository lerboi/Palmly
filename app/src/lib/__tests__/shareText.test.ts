import { composeShareText } from '../shareText';

describe('composeShareText (share message per channel, UIUX §2.6)', () => {
  it('returns the essence alone when there is no invite link', () => {
    expect(composeShareText('a Water hand')).toBe('Palmly read my palm — a Water hand');
  });

  it('adds the explicit compare invite for messaging channels', () => {
    const t = composeShareText('a Water hand', 'https://palmly.app/i/x', 'whatsapp');
    expect(t).toContain('compare palms');
    expect(t).toContain('https://palmly.app/i/x');
  });

  it('defaults (no channel) to the messaging-style compare invite', () => {
    expect(composeShareText('h', 'https://palmly.app/i/y')).toContain('See what yours says');
  });

  it('uses a short visual caption for Instagram / TikTok', () => {
    const ig = composeShareText('a Water hand', 'https://palmly.app/i/x', 'instagram');
    expect(ig).toContain('Try yours');
    expect(ig).not.toContain('See what yours says');
    expect(composeShareText('h', 'https://palmly.app/i/x', 'tiktok')).toContain('Try yours');
  });
});
