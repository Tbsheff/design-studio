import { createLiveStore } from "../../platform/live-store.js";

const toolsBarStore = createLiveStore<HTMLFieldSetElement | null>(null);

const setToolsBar = (element: HTMLFieldSetElement | null): void =>
  toolsBarStore.set(element);

export { setToolsBar, toolsBarStore };
