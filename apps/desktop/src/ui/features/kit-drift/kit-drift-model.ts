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

const toTone = (item: KitDriftView): string => {
  if (item.confidence === "high") {
    return "low";
  }

  return "medium";
};

export { toDetail, toHighIds, toPlace, toSelector, toTone };

export type { KitDriftView };
