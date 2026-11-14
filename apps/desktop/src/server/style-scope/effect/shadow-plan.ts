import { parseClass } from "./deps.js";
import type { EffectItem } from "./deps.js";
import {
  isShadowClass,
  isShadowItem,
  toVariantTokens,
} from "./engine/index.js";
import type { ClassChange } from "./set-plan.js";
import type { ShadowSite } from "./shadow-site.js";

interface ShadowPlan {
  readonly change: ClassChange;
  readonly layerEffects: readonly EffectItem[];
}

const toShadowPlan = (
  site: ShadowSite,
  effects: readonly EffectItem[],
  isSet: boolean
): ShadowPlan => {
  if (!isSet || site.classes === null) {
    return { change: { add: [], remove: [] }, layerEffects: effects };
  }

  const wanted = toVariantTokens(
    effects.filter((item) => isShadowItem(item)),
    "",
    site.scale
  );

  const wantedSet = new Set(wanted);
  const present = new Set(site.classes);

  const remove = site.classes.filter(
    (token) =>
      parseClass(token).variants === "" &&
      isShadowClass(token, site.scale) &&
      !wantedSet.has(token)
  );

  return {
    change: { add: wanted.filter((token) => !present.has(token)), remove },
    layerEffects: effects.filter((item) => !isShadowItem(item)),
  };
};

const toMergedChange = (
  first: ClassChange,
  second: ClassChange
): ClassChange => ({
  add: [...first.add, ...second.add],
  remove: [...first.remove, ...second.remove],
});

export { toMergedChange, toShadowPlan };

export type { ShadowPlan };
