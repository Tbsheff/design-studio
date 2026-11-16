import { effectShadowStore } from "../../platform/effect-shadow-store.js";
import { useLive } from "../../platform/live-store.js";

interface EffectShadow {
  readonly hasEffectShadow: boolean;
}

const useEffectShadow = (selector: string | null): EffectShadow => {
  const report = useLive(effectShadowStore);

  return {
    hasEffectShadow:
      report !== null && report.selector === selector && report.hasShadow,
  };
};

export { useEffectShadow };

export type { EffectShadow };
