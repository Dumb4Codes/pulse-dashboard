import { readableOn, relativeLuminance } from '@/lib/color';

describe('relativeLuminance', () => {
  it('is 0 for black, 1 for white, and accepts #rgb shorthand', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#ffffff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#fff')).toBeCloseTo(1, 5);
    expect(relativeLuminance('#F00')).toBeCloseTo(0.2126, 4);
  });

  it('returns null for anything that is not hex', () => {
    for (const bad of ['', 'red', 'rgb(0,0,0)', '#12', '#12345', '#gggggg', 'url(x)']) {
      expect(relativeLuminance(bad)).toBeNull();
    }
  });
});

describe('readableOn', () => {
  it('uses light text on dark swatches and dark text on light swatches', () => {
    expect(readableOn('#111827')).toBe('light');
    expect(readableOn('#7c3aed')).toBe('light');
    expect(readableOn('#fde047')).toBe('dark');
    expect(readableOn('#ffffff')).toBe('dark');
  });

  it('always reaches at least the contrast of the worse-case alternative (>= 4.5 for mid tones too)', () => {
    // Indigo is the default avatar colour: white reaches 4.47:1, black 4.7:1, so black wins.
    expect(readableOn('#6366f1')).toBe('dark');
  });

  it('falls back to light text for unparseable input', () => {
    expect(readableOn('not-a-colour')).toBe('light');
  });
});
