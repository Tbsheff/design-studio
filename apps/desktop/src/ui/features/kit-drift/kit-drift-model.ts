import { copy } from "./copy.js";
import { SOURCE_LOC_ATTR } from "./deps.js";
import type { RouteOutput, kitDriftRoutes } from "./deps.js";

type KitDriftView = RouteOutput<
  typeof kitDriftRoutes.listKitDrift
>["items"][number];

const MAX_SWAP_IDS = 20;

const toSelector = (item: KitDriftView): string =>
  `[${SOURCE_LOC_ATTR}="${item.file}:${item.line}:${item.column}"]`;

const toHighIds = (items: readonly KitDriftView[]): string[] =>
  items
    .filter((item) => item.confidence === "high")
    .slice(0, MAX_SWAP_IDS)
    .map((item) => item.id);

const toPlace = (item: KitDriftView): string => `${item.file}:${item.line}`;

const toDetail = (item: KitDriftView): string => {
  if (item.suggestedVariant === null) {
    return item.kitComponent.name;
  }

  return `${item.kitComponent.name} ${item.suggestedVariant}`;
};

const SKELETON_TAG = "skeleton";

const toTagText = (item: KitDriftView): string => {
  if (item.tag === SKELETON_TAG) {
    return copy.skeletonTag;
  }

  return item.tag;
};

const isSwappable = (item: KitDriftView): boolean =>
  item.tag !== SKELETON_TAG || item.confidence === "high";

const toSwapTip = (item: KitDriftView): string => {
  if (isSwappable(item)) {
    return copy.swapTip;
  }

  return copy.handTip;
};

const toTone = (item: KitDriftView): string => {
  if (item.confidence === "high") {
    return "low";
  }

  return "medium";
};

export {
  isSwappable,
  toDetail,
  toHighIds,
  toPlace,
  toSelector,
  toSwapTip,
  toTagText,
  toTone,
};

export type { KitDriftView };
