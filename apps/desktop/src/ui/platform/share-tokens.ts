import { createLiveStore } from "./live-store";

const tokenStore = createLiveStore<ReadonlyMap<string, string>>(new Map());

const sessionTokens = {
  get: (linkId: string): string | null => tokenStore.get().get(linkId) ?? null,
  has: (linkId: string): boolean => tokenStore.get().has(linkId),
  set: (linkId: string, token: string): void => {
    tokenStore.set(new Map([...tokenStore.get(), [linkId, token]]));
  },
};

export { sessionTokens, tokenStore };
