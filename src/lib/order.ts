export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  const rank = new Map(order.map((id, i) => [id, i]));
  const known = items.filter(i => rank.has(i.id)).sort((a, b) => rank.get(a.id)! - rank.get(b.id)!);
  return [...known, ...items.filter(i => !rank.has(i.id))];
}
