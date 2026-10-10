import { parseParams } from '@/lib/params';
const p = (s: string) => parseParams(new URLSearchParams(s));
describe('parseParams', () => {
  it('defaults', () => expect(p('')).toMatchObject({ page: 1, q: '', tags: [] }));
  it('clamps page to 1..5 and survives NaN', () => { expect(p('page=99').page).toBe(5); expect(p('page=-3').page).toBe(1); expect(p('page=abc').page).toBe(1); });
  it('keeps only valid categories; empty falls back to all 7', () => { expect(p('categories=sports,evil,tech').categories).toEqual(['sports']); expect(p('categories=nope').categories).toHaveLength(7); });
  it('trims and clamps q to 100 chars', () => { expect(p('q=%20%20hi%20').q).toBe('hi'); expect(p('q=' + 'x'.repeat(500)).q).toHaveLength(100); });
  it('sanitises hashtags', () => expect(p('tags=%23Tech,<script>,ok_1').tags).toEqual(['tech', 'ok_1']));
});
