import { useCallback, useMemo, useState } from "react";

import { withOverrides } from "./layer-edits-model.js";
import {
  toActiveOverrides,
  toEmptyOverrides,
  withHidden,
  withName,
  withoutHidden,
} from "./layer-overrides-model.js";
import type { LayerOverrides } from "./layer-overrides-model.js";
import type { LayerTree } from "./layers-tree.js";

interface LayerOverridesApi {
  readonly clearHidden: (id: number) => void;
  readonly displayTree: LayerTree | null;
  readonly markHidden: (id: number, isHidden: boolean) => void;
  readonly markName: (id: number, name: string) => void;
}

const useLayerOverrides = (tree: LayerTree | null): LayerOverridesApi => {
  const [overrides, setOverrides] = useState<LayerOverrides>(() =>
    toEmptyOverrides(tree)
  );

  const markName = useCallback(
    (id: number, name: string): void => {
      setOverrides((previous) => withName(previous, tree, id, name));
    },
    [tree]
  );

  const markHidden = useCallback(
    (id: number, isHidden: boolean): void => {
      setOverrides((previous) => withHidden(previous, tree, id, isHidden));
    },
    [tree]
  );

  const clearHidden = useCallback(
    (id: number): void => {
      setOverrides((previous) => withoutHidden(previous, tree, id));
    },
    [tree]
  );

  const displayTree = useMemo(() => {
    const active = toActiveOverrides(overrides, tree);

    return withOverrides(tree, active.names, active.hidden);
  }, [overrides, tree]);

  return { clearHidden, displayTree, markHidden, markName };
};

export { useLayerOverrides };

export type { LayerOverridesApi };
