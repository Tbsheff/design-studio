import { routes } from "@design-studio/actions/token/routes";
import type { CompiledTokenEntry } from "@design-studio/contracts";
import { useCallback, useContext, useMemo, useState } from "react";

import { useAction } from "../../platform/query.js";
import { TokenUsageContext } from "./token-usage-context.js";
import type { TokenUsageLookup } from "./token-usage-context.js";
import {
  toUnusedEntries,
  toUnusedNames,
  toUsageMap,
} from "./token-usage-model.js";
import type { TokenUsageView } from "./token-usage-model.js";

interface TokenUsageSetup {
  readonly directionId: string | null;
  readonly onSelectSite: (selector: string) => void;
  readonly projectId: string;
}

interface TokenUsage {
  readonly filterEntries: (
    entries: CompiledTokenEntry[]
  ) => CompiledTokenEntry[];
  readonly handleToggle: () => void;
  readonly isUnusedOnly: boolean;
  readonly lookup: TokenUsageLookup;
  readonly unusedCount: number | null;
}

const PAGE_LIMIT = 200;

const useTokenUsage = (setup: TokenUsageSetup): TokenUsage => {
  const { directionId, onSelectSite, projectId } = setup;
  const [isFiltered, setIsFiltered] = useState(false);

  const allInput = useMemo(() => {
    if (directionId === null) {
      return null;
    }

    const cursor = null;
    const isUnusedOnly = false;
    const limit = PAGE_LIMIT;

    return { cursor, directionId, isUnusedOnly, limit, projectId };
  }, [directionId, projectId]);

  const unusedInput = useMemo(() => {
    if (allInput === null) {
      return null;
    }

    return { ...allInput, isUnusedOnly: true };
  }, [allInput]);

  const all = useAction(routes.listUsageToken, allInput);
  const unused = useAction(routes.listUsageToken, unusedInput);
  const allItems = all.data?.items;
  const unusedItems = unused.data?.items;

  const usages = useMemo(
    () => toUsageMap(allItems ?? [], unusedItems ?? []),
    [allItems, unusedItems]
  );

  const unusedNames = useMemo(
    () => toUnusedNames(unusedItems ?? []),
    [unusedItems]
  );

  const usageOf = useCallback(
    (name: string): TokenUsageView | null => usages.get(name) ?? null,
    [usages]
  );

  const lookup = useMemo(
    () => ({ onSelectSite, usageOf }),
    [onSelectSite, usageOf]
  );

  const filterEntries = useCallback(
    (entries: CompiledTokenEntry[]): CompiledTokenEntry[] => {
      if (!isFiltered) {
        return entries;
      }

      return toUnusedEntries(entries, unusedNames);
    },
    [isFiltered, unusedNames]
  );

  const handleToggle = useCallback((): void => {
    setIsFiltered((value) => !value);
  }, []);

  const unusedCount = unused.data?.unusedCount ?? null;
  const isUnusedOnly = isFiltered;

  return {
    filterEntries,
    handleToggle,
    isUnusedOnly,
    lookup,
    unusedCount,
  };
};

const useTokenUsageLookup = (): TokenUsageLookup | null =>
  useContext(TokenUsageContext);

export { useTokenUsage, useTokenUsageLookup };

export type { TokenUsage, TokenUsageSetup };
