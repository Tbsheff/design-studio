import { createLiveStore } from "./live-store.js";

const scaleMode = createLiveStore<boolean>(false);

const scaleFocusCount = createLiveStore<number>(0);

const requestScaleMode = (): void => {
  scaleFocusCount.set(scaleFocusCount.get() + 1);
};

const stopScaleMode = (): void => {
  scaleMode.set(false);
};

export { requestScaleMode, scaleFocusCount, scaleMode, stopScaleMode };
