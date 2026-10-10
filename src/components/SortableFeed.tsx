'use client';

import {
  memo,
  useCallback,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import { Reorder, useDragControls, useReducedMotion, type DragControls } from 'framer-motion';
import { GripVertical } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { ContentItem } from '@/lib/types';
import { useAppDispatch } from '@/store/hooks';
import { setOrder } from '@/store/slices/feedOrder';
import { ContentCard } from './ContentCard';

interface SortableFeedProps {
  items: ContentItem[];
}

/** Entrance stagger: the first nine cards of the first batch arrive 40ms apart, the rest together. */
const STAGGER_MS = 40;
const STAGGER_CAP = 8;

interface DragHandleProps {
  itemId: string;
  controls: DragControls;
  hintId: string;
  onMove: (id: string, delta: -1 | 1) => void;
}

/**
 * The only part of a card that starts a drag (dragging the whole card would swallow clicks on the
 * heart and the call to action). A real `<button>`, so it is in the tab order: ArrowUp / ArrowDown
 * move the card one place, which is the keyboard and screen-reader equivalent of dragging.
 * 44px target, `touch-none` so a finger on the grip drags instead of scrolling the page.
 */
const DragHandle = memo(function DragHandle({ itemId, controls, hintId, onMove }: DragHandleProps) {
  const { t } = useTranslation();

  function onPointerDown(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return; // primary button / touch contact only
    controls.start(event);
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== 'ArrowUp' && event.key !== 'ArrowDown') return;
    event.preventDefault(); // the page must not scroll while the card moves
    onMove(itemId, event.key === 'ArrowUp' ? -1 : 1);
  }

  return (
    <button
      type="button"
      data-handle-id={itemId}
      aria-label={t('card.drag')}
      aria-describedby={hintId}
      onPointerDown={onPointerDown}
      onKeyDown={onKeyDown}
      className="grid size-11 cursor-grab touch-none place-items-center rounded-xl text-muted transition-colors hover:bg-surface-2 hover:text-ink active:cursor-grabbing"
    >
      <GripVertical aria-hidden="true" className="size-5" strokeWidth={1.75} />
    </button>
  );
});

interface SortableRowProps {
  item: ContentItem;
  /** Position in the first batch (drives the entrance stagger), or -1 for items that arrived later. */
  firstBatchIndex: number;
  hintId: string;
  onMove: (id: string, delta: -1 | 1) => void;
}

/**
 * One draggable card. The `li` carries the drag transform, layout animation and lift; the card
 * inside carries its own hover lift and an entrance (CSS, on a wrapper, so it never fights the
 * transform Framer writes to the `li`). Memoised, because a long list re-renders on every swap.
 */
const SortableRow = memo(function SortableRow({ item, firstBatchIndex, hintId, onMove }: SortableRowProps) {
  const controls = useDragControls();
  const reduceMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  // Captured once: changing a running animation's delay would make it jump.
  const [delay] = useState(() => Math.min(Math.max(firstBatchIndex, 0), STAGGER_CAP) * STAGGER_MS);

  const handle = useMemo(
    () => <DragHandle itemId={item.id} controls={controls} hintId={hintId} onMove={onMove} />,
    [item.id, controls, hintId, onMove],
  );

  return (
    <Reorder.Item
      value={item}
      as="li"
      dragListener={false}
      dragControls={controls}
      // Swaps glide to their new slot; `position` (not full layout) so card text is never scale-distorted.
      // MotionConfig reducedMotion="user" (set in ShellMotion) makes these layout moves instant.
      layout="position"
      whileDrag={reduceMotion ? undefined : { scale: 1.015 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      data-dragging={dragging || undefined}
      className="relative rounded-card transition-shadow duration-200 data-dragging:select-none data-dragging:shadow-(--shadow-lift)"
    >
      <div className="animate-rise-sm" style={delay ? { animationDelay: `${delay}ms` } : undefined}>
        <ContentCard item={item} handle={handle} />
      </div>
    </Reorder.Item>
  );
});

/**
 * The feed as a re-orderable list. Pointer and touch: drag a card by its grip. Keyboard and
 * assistive tech: focus a grip and press ArrowUp / ArrowDown; each move is announced in a polite
 * live region ("Moved X to position 2 of 9") and focus stays on the grip of the card that moved
 * (React re-parents the nodes when the order changes, which can drop focus).
 *
 * The order lives in the store (`feedOrder.ids`, persisted), not here. A drag fires `onReorder` for
 * every swap, so the list follows the finger live and the saved order is always current.
 */
export function SortableFeed({ items }: SortableFeedProps) {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const hintId = useId();
  const listRef = useRef<HTMLOListElement>(null);
  const [announcement, setAnnouncement] = useState('');

  // Pure: derived once from the items present when the list first mounts.
  const [firstBatch] = useState(() => new Map(items.map((item, index) => [item.id, index])));

  // `onMove` must stay referentially stable (it feeds memoised rows), so it reads the latest list from a ref.
  const latest = useRef(items);
  const refocus = useRef<string | null>(null);
  useLayoutEffect(() => {
    latest.current = items;
    const id = refocus.current;
    if (id === null) return;
    refocus.current = null;
    const handle = [...(listRef.current?.querySelectorAll<HTMLElement>('[data-handle-id]') ?? [])].find(
      (node) => node.dataset.handleId === id,
    );
    if (handle && document.activeElement !== handle) handle.focus();
  }, [items]);

  const onMove = useCallback(
    (id: string, delta: -1 | 1) => {
      const list = latest.current;
      const from = list.findIndex((item) => item.id === id);
      if (from === -1) return;
      const title = list[from].title;
      const to = from + delta;
      if (to < 0 || to >= list.length) {
        setAnnouncement(t(delta < 0 ? 'sr.alreadyFirst' : 'sr.alreadyLast', { title }));
        return;
      }
      const next = [...list];
      next.splice(to, 0, next.splice(from, 1)[0]);
      refocus.current = id;
      dispatch(setOrder(next.map((item) => item.id)));
      setAnnouncement(t('sr.moved', { title, pos: to + 1, total: list.length }));
    },
    [dispatch, t],
  );

  const onReorder = useCallback(
    (next: ContentItem[]) => {
      dispatch(setOrder(next.map((item) => item.id)));
    },
    [dispatch],
  );

  return (
    <>
      <Reorder.Group
        ref={listRef}
        as="ol"
        axis="y"
        values={items}
        onReorder={onReorder}
        aria-label={t('feed.title')}
        data-feed-list=""
        className="grid gap-5"
      >
        {items.map((item) => (
          <SortableRow
            key={item.id}
            item={item}
            firstBatchIndex={firstBatch.get(item.id) ?? -1}
            hintId={hintId}
            onMove={onMove}
          />
        ))}
      </Reorder.Group>

      <p id={hintId} hidden>
        {t('feed.dragHint')}
      </p>
      <div data-feed-announcer="" role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {announcement}
      </div>
    </>
  );
}
