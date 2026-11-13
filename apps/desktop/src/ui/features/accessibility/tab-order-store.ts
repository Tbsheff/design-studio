import { createLiveStore, useLive } from "./deps.js";

type OverlayMode = "off" | "reader" | "tabs";

const overlayStore = createLiveStore<OverlayMode>("off");

const toToggled = (mode: OverlayMode): OverlayMode => {
  if (overlayStore.get() === mode) {
    return "off";
  }

  return mode;
};

const setTabOrder = (isOn: boolean): void => {
  if (isOn) {
    overlayStore.set("tabs");

    return;
  }

  overlayStore.set("off");
};

const toggleTabOrder = (): void => {
  overlayStore.set(toToggled("tabs"));
};

const toggleReader = (): void => {
  overlayStore.set(toToggled("reader"));
};

const useOverlayMode = (): OverlayMode => useLive(overlayStore);

const useTabOrderOn = (): boolean => useOverlayMode() === "tabs";

const useReaderOn = (): boolean => useOverlayMode() === "reader";

export {
  setTabOrder,
  toggleReader,
  toggleTabOrder,
  useOverlayMode,
  useReaderOn,
  useTabOrderOn,
};

export type { OverlayMode };
