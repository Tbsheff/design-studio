import type { TokenUsageSchema } from "@design-studio/actions/token/schema";
import { SOURCE_LOC_ATTR } from "@design-studio/contracts";
import type { CompiledTokenEntry } from "@design-studio/contracts";

import { COPY } from "./copy.js";

type TokenUsageView = typeof TokenUsageSchema.Type;

type TokenUsageSite = TokenUsageView["samples"][number];

const toUsageMap = (
  ...pages: readonly (readonly TokenUsageView[])[]
): ReadonlyMap<string, TokenUsageView> =>
  new Map(pages.flat().map((item) => [item.name, item]));

const toUnusedNames = (items: readonly TokenUsageView[]): ReadonlySet<string> =>
  new Set(items.map((item) => item.name));

const toUnusedEntries = (
  entries: CompiledTokenEntry[],
  unused: ReadonlySet<string>
): CompiledTokenEntry[] => entries.filter((entry) => unused.has(entry.cssVar));

const toChipLabel = (count: number): string => `${COPY.usageUnused} (${count})`;

const toCountTip = (usage: TokenUsageView): string =>
  `${COPY.usageCountTip}. ${usage.useCount}${COPY.usageTimesSuffix}${usage.fileCount}${COPY.usageFilesSuffix}`;

const toSitePlace = (site: TokenUsageSite): string =>
  `${site.file}:${site.line}`;

const toSiteSelector = (site: TokenUsageSite): string =>
  `[${SOURCE_LOC_ATTR}^="${site.file}:${site.line}:"]`;

const toEmptyText = (query: string, isUnusedOnly: boolean): string | null => {
  if (isUnusedOnly && query === "") {
    return COPY.usageEmptyUnused;
  }

  return null;
};

export {
  toChipLabel,
  toCountTip,
  toEmptyText,
  toSitePlace,
  toSiteSelector,
  toUnusedEntries,
  toUnusedNames,
  toUsageMap,
};

export type { TokenUsageSite, TokenUsageView };
