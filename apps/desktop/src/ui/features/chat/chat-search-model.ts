import { createLiveStore } from "../../platform/live-store.js";

const chatSearchOpen = createLiveStore(false);
const chatSearchAvailable = createLiveStore(false);

const focusChatSearchButton = (): void => {
  globalThis.requestAnimationFrame(() =>
    document.querySelector<HTMLElement>(".pane-head-search")?.focus()
  );
};

export { chatSearchAvailable, chatSearchOpen, focusChatSearchButton };
