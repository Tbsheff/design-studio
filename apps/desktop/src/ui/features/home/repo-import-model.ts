import { createLiveStore } from "../../platform/live-store.js";

const repoImportStore = createLiveStore<boolean>(false);

const startRepoImport = (): void => repoImportStore.set(true);

const stopRepoImport = (): void => repoImportStore.set(false);

export { stopRepoImport, startRepoImport, repoImportStore };
