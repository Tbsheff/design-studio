import { useSyncExternalStore } from "react";

const SLOT = '[data-topbar-slot="matrix"]';

const subscribe = (notify: () => void): (() => void) => {
  const observer = new MutationObserver(notify);

  observer.observe(document.body, { childList: true, subtree: true });

  return () => observer.disconnect();
};

const read = (): HTMLElement | null =>
  document.querySelector<HTMLElement>(SLOT);

const readServer = (): HTMLElement | null => null;

const useSlot = (): HTMLElement | null =>
  useSyncExternalStore(subscribe, read, readServer);

export { useSlot };
