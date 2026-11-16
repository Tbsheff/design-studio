import { createLiveStore, useLive } from "./live-store.js";

const PICTURE_MIN = 1;

const PICTURE_MAX = 5;

const selectionPictureStore = createLiveStore(true);

const isPictureCount = (count: number): boolean =>
  count >= PICTURE_MIN && count <= PICTURE_MAX;

const isSelectionPictureOn = (): boolean => selectionPictureStore.get();

const setSelectionPictureOff = (): void => {
  selectionPictureStore.set(false);
};

const resetSelectionPicture = (): void => {
  selectionPictureStore.set(true);
};

const useSelectionPicture = (count: number): boolean =>
  useLive(selectionPictureStore) && isPictureCount(count);

const toggleSelectionPicture = (): void => {
  selectionPictureStore.set(!selectionPictureStore.get());
};

export {
  isPictureCount,
  isSelectionPictureOn,
  resetSelectionPicture,
  setSelectionPictureOff,
  toggleSelectionPicture,
  useSelectionPicture,
};
