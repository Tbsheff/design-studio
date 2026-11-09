import type { ComponentUseCountSchema } from "@design-studio/actions/component/schema";

import type { Item } from "./components-panel-model.js";
import { COPY } from "./copy.js";

type ComponentUsageView = typeof ComponentUseCountSchema.Type;

type ComponentUsageSite = ComponentUsageView["samples"][number];

const SHORT_PATH_PARTS = 2;

const toUsageKey = (usage: ComponentUsageView): string =>
  `${usage.file}#${usage.name}`;

const toUsageMap = (
  ...pages: readonly (readonly ComponentUsageView[])[]
): ReadonlyMap<string, ComponentUsageView> =>
  new Map(pages.flat().map((usage) => [toUsageKey(usage), usage]));

const toUnusedKeys = (
  usages: readonly ComponentUsageView[]
): ReadonlySet<string> => new Set(usages.map((usage) => toUsageKey(usage)));

const toUnusedItems = (items: Item[], unused: ReadonlySet<string>): Item[] =>
  items.filter((item) => unused.has(item.key));

const toChipLabel = (count: number): string => `${COPY.usageUnused} (${count})`;

const toCountLabel = (usage: ComponentUsageView): string => {
  if (usage.importCount === 0) {
    return COPY.usageUnused;
  }

  return String(usage.importCount);
};

const toCountTip = (usage: ComponentUsageView): string =>
  `${COPY.usageCountTip}. ${usage.importCount}${COPY.usageImportsSuffix}${usage.routeCount}${COPY.usageRoutesSuffix}`;

const toSitePlace = (site: ComponentUsageSite): string =>
  `${site.file}:${site.line}`;

const toSiteLabel = (site: ComponentUsageSite): string => {
  const tail = site.file.split("/").slice(-SHORT_PATH_PARTS).join("/");

  return `${tail}:${site.line}`;
};

const toEmptyText = (
  query: string,
  isUnusedOnly: boolean,
  shown: readonly Item[]
): string | null => {
  if (isUnusedOnly && query === "" && shown.length === 0) {
    return COPY.usageEmptyUnused;
  }

  return null;
};

export {
  toChipLabel,
  toCountLabel,
  toCountTip,
  toEmptyText,
  toSiteLabel,
  toSitePlace,
  toUnusedItems,
  toUnusedKeys,
  toUsageMap,
};

export type { ComponentUsageSite, ComponentUsageView };
