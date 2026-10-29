import { useEffect, useRef } from 'react';

const INPUT = '.prompt [data-slot="composer-input"]';

function focusIsFree(): boolean {
  const active = document.activeElement;
  if (active && active !== document.body && active.isConnected) return false;
  return !document.querySelector('[role="dialog"], [aria-modal="true"], .inline-prompt');
}

function focusComposer(): void {
  window.requestAnimationFrame(() => {
    if (focusIsFree()) document.querySelector<HTMLTextAreaElement>(INPUT)?.focus({ preventScroll: true });
  });
}

export function useComposerFocus(running: boolean, ready: boolean): void {
  const was = useRef<boolean | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (was.current !== running) focusComposer();
    was.current = running;
  }, [running, ready]);
}
