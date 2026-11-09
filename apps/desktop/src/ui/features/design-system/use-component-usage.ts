import { routes } from "@design-studio/actions/component/routes";
import { useCallback, useContext, useMemo, useState } from "react";

import { useAction } from "../../platform/query.js";
import { ComponentUsageContext } from "./component-usage-context.js";
import type { ComponentUsageLookup } from "./component-usage-context.js";
import {
  toUnusedItems,
  toUnusedKeys,
  toUsageMap,
} from "./component-usage-model.js";
import type {
  ComponentUsageSite,
  ComponentUsageView,
} from "./component-usage-model.js";
import type { Item } from "./components-panel-model.js";
import type { Props } from "./components-panel-props.js";

interface ComponentUsageSetup {
  readonly directionId: string | null;
  readonly isEnabled: boolean;
  readonly projectId: string;
}

interface CodeTarget {
  readonly directionId: string;
  readonly file: string;
  readonly line: number;
  readonly projectId: string;
}

interface ComponentUsage {
  readonly codeTarget: CodeTarget | null;
  readonly filterItems: (items: Item[]) => Item[];
  readonly handleCloseCode: () => void;
  readonly handleToggle: () => void;
  readonly isUnusedOnly: boolean;
  readonly lookup: ComponentUsageLookup;
  readonly unusedCount: number | null;
}

const PAGE_LIMIT = 200;

interface UsageQueries {
  readonly unusedCount: number | null;
  readonly unusedKeys: ReadonlySet<string>;
  readonly usageOf: (key: string) => ComponentUsageView | null;
}

const useUsageQueries = (setup: ComponentUsageSetup): UsageQueries => {
  const { directionId, isEnabled, projectId } = setup;

  const allInput = useMemo(() => {
    if (!isEnabled) {
      return null;
    }

    const cursor = null;
    const isUnusedOnly = false;
    const limit = PAGE_LIMIT;

    return { cursor, directionId, isUnusedOnly, limit, projectId };
  }, [directionId, isEnabled, projectId]);

  const unusedInput = useMemo(() => {
    if (allInput === null) {
      return null;
    }

    return { ...allInput, isUnusedOnly: true };
  }, [allInput]);

  const all = useAction(routes.listUsageComponent, allInput);
  const unused = useAction(routes.listUsageComponent, unusedInput);
  const allItems = all.data?.items;
  const unusedItems = unused.data?.items;

  const usages = useMemo(
    () => toUsageMap(allItems ?? [], unusedItems ?? []),
    [allItems, unusedItems]
  );

  const unusedKeys = useMemo(
    () => toUnusedKeys(unusedItems ?? []),
    [unusedItems]
  );

  const usageOf = useCallback(
    (key: string): ComponentUsageView | null => usages.get(key) ?? null,
    [usages]
  );

  const unusedCount = unused.data?.unusedCount ?? null;

  return { unusedCount, unusedKeys, usageOf };
};

const useComponentUsage = (
  props: Props,
  canInsert: boolean
): ComponentUsage => {
  const { directionId, projectId } = props;
  const isEnabled = canInsert && props.active && directionId !== null;
  const setup = { directionId, isEnabled, projectId };
  const [isFiltered, setIsFiltered] = useState(false);
  const [codeTarget, setCodeTarget] = useState<CodeTarget | null>(null);
  const { unusedCount, unusedKeys, usageOf } = useUsageQueries(setup);

  const onOpenSite = useCallback(
    (site: ComponentUsageSite): void => {
      if (directionId !== null) {
        const { file, line } = site;

        setCodeTarget({ directionId, file, line, projectId });
      }
    },
    [directionId, projectId]
  );

  const lookup = useMemo(
    () => ({ onOpenSite, usageOf }),
    [onOpenSite, usageOf]
  );

  const filterItems = useCallback(
    (items: Item[]): Item[] => {
      if (!isFiltered) {
        return items;
      }

      return toUnusedItems(items, unusedKeys);
    },
    [isFiltered, unusedKeys]
  );

  const handleToggle = useCallback((): void => {
    setIsFiltered((value) => !value);
  }, []);

  const handleCloseCode = useCallback((): void => {
    setCodeTarget(null);
  }, []);

  const isUnusedOnly = isFiltered;

  return {
    codeTarget,
    filterItems,
    handleCloseCode,
    handleToggle,
    isUnusedOnly,
    lookup,
    unusedCount,
  };
};

const useComponentUsageLookup = (): ComponentUsageLookup | null =>
  useContext(ComponentUsageContext);

export { useComponentUsage, useComponentUsageLookup };

export type { CodeTarget, ComponentUsage, ComponentUsageSetup };
