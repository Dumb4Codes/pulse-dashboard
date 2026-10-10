import type { NextRequest } from 'next/server';
import { makeLiveItem, parseInterval } from '@/lib/server/liveItem';

// A stream is per-connection, never cacheable and never prerendered.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/** Idle proxies drop silent connections; a comment line every 15s keeps this one warm. */
const HEARTBEAT_MS = 15_000;

/**
 * Server-sent events: `GET /api/stream?interval=<seconds>` (1-60, default 20).
 *
 * Every interval it writes `data: <ContentItem JSON>\n\n` (see `makeLiveItem`); every 15s it writes
 * the comment `: ping\n\n`. `no-transform` also stops `next start`'s gzip layer from buffering the
 * stream. Both timers are cleared when the client disconnects (`req.signal` aborts) or the consumer
 * cancels the stream, so a closed tab never leaves a timer running on the server.
 */
export async function GET(req: NextRequest): Promise<Response> {
  const intervalMs = parseInterval(req.nextUrl.searchParams.get('interval')) * 1000;
  const encoder = new TextEncoder();
  let stop: () => void = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let sent = 0;
      const timers: ReturnType<typeof setInterval>[] = [];

      stop = () => {
        if (closed) return;
        closed = true;
        for (const timer of timers) clearInterval(timer);
        req.signal.removeEventListener('abort', stop);
        try {
          controller.close();
        } catch {
          // Already closed or cancelled by the consumer.
        }
      };

      const send = (chunk: string) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(chunk));
        } catch {
          stop();
        }
      };

      if (req.signal.aborted) {
        stop();
        return;
      }
      req.signal.addEventListener('abort', stop, { once: true });

      // Flushes the headers right away so EventSource fires `open` without waiting a full interval.
      send(': connected\n\n');
      timers.push(setInterval(() => send(`data: ${JSON.stringify(makeLiveItem(sent++))}\n\n`), intervalMs));
      timers.push(setInterval(() => send(': ping\n\n'), HEARTBEAT_MS));
    },
    cancel() {
      stop();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // nginx-style proxies otherwise buffer the response.
      'X-Accel-Buffering': 'no',
    },
  });
}
