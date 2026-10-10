import { NextRequest, NextResponse } from 'next/server';
import { findMockItem } from '@/lib/server/mockProvider';

export const dynamic = 'force-dynamic';

/** Ids are `type-category-n-n`, `news-<hash>` or `live-<timestamp>`: letters, digits, `-` and `_` only. */
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

/**
 * One item by id, for a details page opened without the item already in memory (a bookmark, a shared
 * link, a fresh tab). Only the seeded mock catalogue can be rebuilt from an id alone: real NewsAPI /
 * TMDB items are served from what the browser already saved, so anything else answers 404.
 */
export async function GET(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id') ?? '';
  if (!ID_RE.test(id)) return NextResponse.json({ error: 'invalid id' }, { status: 400 });
  const item = findMockItem(id);
  if (!item) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(item);
}
