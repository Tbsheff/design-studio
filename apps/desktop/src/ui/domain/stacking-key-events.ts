import type { AppKey } from "@design-studio/contracts";

const STACKING_KEY_EVENT = "studio:stacking-key";

type StackingAppKey = Extract<
  AppKey,
  "layer-back" | "layer-backward" | "layer-forward" | "layer-front"
>;

interface StackingKeyDetail {
  readonly id: StackingAppKey;
}

export { STACKING_KEY_EVENT };

export type { StackingAppKey, StackingKeyDetail };
