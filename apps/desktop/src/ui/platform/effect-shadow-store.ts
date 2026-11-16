import { createLiveStore } from "./live-store.js";

interface EffectShadowReport {
  readonly hasShadow: boolean;
  readonly selector: string;
}

const effectShadowStore = createLiveStore<EffectShadowReport | null>(null);

const setEffectShadow = (selector: string, hasShadow: boolean): void => {
  const last = effectShadowStore.get();

  if (last?.selector === selector && last.hasShadow === hasShadow) {
    return;
  }

  effectShadowStore.set({ hasShadow, selector });
};

export { effectShadowStore, setEffectShadow };

export type { EffectShadowReport };
