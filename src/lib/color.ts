/** WCAG relative luminance of a `#rgb` / `#rrggbb` colour, or null if the input is not hex. */
export function relativeLuminance(hex: string): number | null {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return null;
  const digits = match[1].length === 3 ? [...match[1]].map((c) => c + c).join('') : match[1];
  const [r, g, b] = [0, 2, 4].map((i) => {
    const channel = parseInt(digits.slice(i, i + 2), 16) / 255;
    return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Picks the legible glyph colour for text drawn on a user-chosen (hence theme-independent) swatch:
 * whichever of white or black reaches the higher WCAG contrast ratio (ties go to light).
 * Unparseable input falls back to light.
 */
export function readableOn(hex: string): 'light' | 'dark' {
  const lum = relativeLuminance(hex);
  if (lum === null) return 'light';
  const contrastWithWhite = 1.05 / (lum + 0.05);
  const contrastWithBlack = (lum + 0.05) / 0.05;
  return contrastWithWhite >= contrastWithBlack ? 'light' : 'dark';
}
