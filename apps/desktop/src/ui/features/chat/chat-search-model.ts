import { createLiveStore } from "../../platform/live-store.js";

const chatSearchOpen = createLiveStore(false);
const chatSearchAvailable = createLiveStore(false);

let searchButton: HTMLElement | null = null;

const registerChatSearchButton = (element: HTMLElement | null): void => {
  searchButton = element;
};

const focusChatSearchButton = (): void => {
  globalThis.requestAnimationFrame(() => searchButton?.focus());
};

export {
  chatSearchAvailable,
  chatSearchOpen,
  focusChatSearchButton,
  registerChatSearchButton,
};
