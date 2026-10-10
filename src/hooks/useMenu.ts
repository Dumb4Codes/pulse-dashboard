'use client';

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';

const ITEM_SELECTOR = '[role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"]';

/**
 * Behaviour for a disclosure menu (WAI-ARIA "menu button" pattern), shared by the language
 * switcher and the account menu. The platform popover API is not used on purpose: it needs CSS
 * anchor positioning to place the panel under its trigger, which is not available in every browser
 * we target, and it cannot be exercised in jsdom.
 *
 * - Click / Enter / Space toggles; ArrowDown / ArrowUp on the trigger open and focus first / last item.
 * - Inside: ArrowDown / ArrowUp / Home / End move focus (wrapping); Escape closes and returns focus
 *   to the trigger; Tab closes and lets focus continue from the trigger.
 * - A pointer press outside closes it (focus is left where the user clicked).
 * - On open, focus moves into the menu: the checked item if there is one, otherwise the first.
 *
 * Wire-up: spread `triggerProps` on the button, `menuProps` on the element carrying `role="menu"`,
 * and put `rootRef` on a wrapper around both so outside-press detection knows the boundary.
 */
export function useMenu() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const focusTarget = useRef<'first' | 'last'>('first');
  const menuId = useId();

  const items = useCallback(
    () => Array.from(menuRef.current?.querySelectorAll<HTMLElement>(ITEM_SELECTOR) ?? []),
    [],
  );

  const close = useCallback((restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!open) return;
    const list = items();
    const checked = list.find((el) => el.getAttribute('aria-checked') === 'true');
    const target = focusTarget.current === 'last' ? list[list.length - 1] : (checked ?? list[0]);
    target?.focus();
    focusTarget.current = 'first';

    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [open, items]);

  const onTriggerKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
    event.preventDefault();
    focusTarget.current = event.key === 'ArrowUp' ? 'last' : 'first';
    if (open) items()[event.key === 'ArrowUp' ? items().length - 1 : 0]?.focus();
    else setOpen(true);
  };

  const onMenuKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    const list = items();
    const index = list.findIndex((el) => el === document.activeElement);
    const move = (next: number) => {
      event.preventDefault();
      list[(next + list.length) % list.length]?.focus();
    };
    switch (event.key) {
      case 'ArrowDown':
        move(index + 1);
        break;
      case 'ArrowUp':
        move(index <= 0 ? list.length - 1 : index - 1);
        break;
      case 'Home':
        move(0);
        break;
      case 'End':
        move(list.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        break;
      case 'Tab':
        // No preventDefault: focus is parked on the trigger first, so the browser's own Tab
        // step continues from there (next / previous control around the menu button).
        close();
        break;
      default:
    }
  };

  return {
    open,
    close,
    rootRef,
    triggerRef,
    menuRef,
    triggerProps: {
      id: `${menuId}-trigger`,
      'aria-haspopup': 'menu' as const,
      'aria-expanded': open,
      'aria-controls': open ? menuId : undefined,
      onClick: () => setOpen((value) => !value),
      onKeyDown: onTriggerKeyDown,
    },
    menuProps: {
      id: menuId,
      role: 'menu' as const,
      'aria-labelledby': `${menuId}-trigger`,
      onKeyDown: onMenuKeyDown,
    },
  };
}
