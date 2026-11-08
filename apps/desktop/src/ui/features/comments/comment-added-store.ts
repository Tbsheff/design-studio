import { createLiveStore, useLive } from "./deps.js";

const ADDED_MS = 2400;

let addedTimer: ReturnType<typeof globalThis.setTimeout> | null = null;

const justAddedStore = createLiveStore(false);

const markAdded = (): void => {
  if (addedTimer !== null) {
    globalThis.clearTimeout(addedTimer);
  }

  justAddedStore.set(true);
  addedTimer = globalThis.setTimeout(() => {
    addedTimer = null;
    justAddedStore.set(false);
  }, ADDED_MS);
};

const useJustAdded = (): boolean => useLive(justAddedStore);

export { markAdded, useJustAdded };
