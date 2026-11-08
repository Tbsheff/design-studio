import { useMemo } from "react";

import { toListInput } from "./block-model.js";
import type { BlockItem, KindFilter } from "./block-model.js";
import { blockRoutes, useAction } from "./deps.js";

interface BlockList {
  readonly error: string | null;
  readonly items: readonly BlockItem[];
}

const NO_ITEMS: readonly BlockItem[] = [];

const useBlockList = (projectId: string, kind: KindFilter): BlockList => {
  const input = useMemo(() => toListInput(projectId, kind), [kind, projectId]);
  const read = useAction(blockRoutes.listBlock, input);

  return {
    error: read.error?.message ?? null,
    items: read.data?.items ?? NO_ITEMS,
  };
};

export { useBlockList };

export type { BlockList };
