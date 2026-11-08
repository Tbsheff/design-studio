import { createLiveStore } from "./live-store.js";

const sampleDataDialog = createLiveStore<boolean>(false);

const openSampleDataDialog = (): void => {
  sampleDataDialog.set(true);
};

const closeSampleDataDialog = (): void => {
  sampleDataDialog.set(false);
};

export { closeSampleDataDialog, openSampleDataDialog, sampleDataDialog };
