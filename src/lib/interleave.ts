export function interleave<T extends { id: string }>(lists: T[][]): T[] {
  const out: T[] = []; const seen = new Set<string>();
  const max = Math.max(0, ...lists.map(l => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) { const it = l[i]; if (it && !seen.has(it.id)) { seen.add(it.id); out.push(it); } }
  return out;
}
