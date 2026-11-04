import { createLiveStore, useLive } from "./deps.js";

const tabOrderStore = createLiveStore(false);

const setTabOrder = (isOn: boolean): void => {
  tabOrderStore.set(isOn);
};

const toggleTabOrder = (): void => {
  tabOrderStore.set(!tabOrderStore.get());
};

const useTabOrderOn = (): boolean => useLive(tabOrderStore);

export { setTabOrder, toggleTabOrder, useTabOrderOn };
