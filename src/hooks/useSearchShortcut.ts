'use client';

import { useEffect } from 'react';

function isEditable(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

/**
 * Global search shortcuts: `/` (ignored while typing in a field, so it can still be typed) and
 * Ctrl/Cmd+K (works anywhere). Calls `onTrigger` and suppresses the key's default action.
 */
export function useSearchShortcut(onTrigger: () => void): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.isComposing) return;
      const slash = event.key === '/' && !event.ctrlKey && !event.metaKey && !event.altKey;
      const modK = (event.ctrlKey || event.metaKey) && !event.altKey && event.key.toLowerCase() === 'k';
      if (slash && isEditable(event.target)) return;
      if (!slash && !modK) return;
      event.preventDefault();
      onTrigger();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onTrigger]);
}
