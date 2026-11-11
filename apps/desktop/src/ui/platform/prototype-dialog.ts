import { createLiveStore } from "./live-store.js";

const prototypeDialog = createLiveStore<string | null>(null);

const prototypeSource = createLiveStore<string | null>(null);

const openPrototypeDialog = (appProjectId: string): void => {
  prototypeDialog.set(appProjectId);
};

const closePrototypeDialog = (): void => {
  prototypeDialog.set(null);
};

const setPrototypeSource = (appProjectId: string | null): void => {
  prototypeSource.set(appProjectId);
};

export {
  closePrototypeDialog,
  openPrototypeDialog,
  prototypeDialog,
  prototypeSource,
  setPrototypeSource,
};
