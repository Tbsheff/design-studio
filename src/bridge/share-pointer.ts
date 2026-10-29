import type { BridgeToParent } from '../shared/contracts.js';

type PointerBody = Omit<Extract<BridgeToParent, { type: 'share-pointer' }>, 'ns' | 'token'>;

const SEND_MS = 50;

export function createSharePointer(post: (body: PointerBody) => void): { set(on: boolean): void } {
  let on = false;
  let pending: PointerBody | null = null;
  let timer = 0;

  const flush = (): void => {
    timer = 0;
    if (pending) post(pending);
    pending = null;
  };
  const queue = (body: PointerBody): void => {
    pending = body;
    if (!timer) timer = window.setTimeout(flush, SEND_MS);
  };
  const onMove = (event: PointerEvent): void => queue({ type: 'share-pointer', x: event.clientX, y: event.clientY, inside: true });
  const onLeave = (): void => queue({ type: 'share-pointer', x: 0, y: 0, inside: false });

  return {
    set(next) {
      if (next === on) return;
      on = next;
      if (on) {
        window.addEventListener('pointermove', onMove, { capture: true, passive: true });
        document.documentElement.addEventListener('pointerleave', onLeave);
        return;
      }
      window.removeEventListener('pointermove', onMove, { capture: true });
      document.documentElement.removeEventListener('pointerleave', onLeave);
      window.clearTimeout(timer);
      timer = 0;
      pending = null;
    },
  };
}
