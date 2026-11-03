import { createLiveStore } from "../../platform/live-store.js";

export const chatSearchOpen = createLiveStore(false);
export const chatSearchAvailable = createLiveStore(false);

export function focusChatSearchButton(): void {
  window.requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(".pane-head-search")?.focus()
  );
}
