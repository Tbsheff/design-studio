import type { LayerTree } from "./layers-tree.js";

interface LayerOverrides {
  readonly hidden: Map<number, boolean>;
  readonly names: Map<number, string>;
  readonly tree: LayerTree | null;
}

const toEmptyOverrides = (tree: LayerTree | null): LayerOverrides => ({
  hidden: new Map(),
  names: new Map(),
  tree,
});

const toActiveOverrides = (
  overrides: LayerOverrides,
  tree: LayerTree | null
): LayerOverrides => {
  if (overrides.tree === tree) {
    return overrides;
  }

  return toEmptyOverrides(tree);
};

const withName = (
  overrides: LayerOverrides,
  tree: LayerTree | null,
  id: number,
  name: string
): LayerOverrides => {
  const active = toActiveOverrides(overrides, tree);

  return { ...active, names: new Map(active.names).set(id, name) };
};

const withHidden = (
  overrides: LayerOverrides,
  tree: LayerTree | null,
  id: number,
  isHidden: boolean
): LayerOverrides => {
  const active = toActiveOverrides(overrides, tree);

  return { ...active, hidden: new Map(active.hidden).set(id, isHidden) };
};

const withoutHidden = (
  overrides: LayerOverrides,
  tree: LayerTree | null,
  id: number
): LayerOverrides => {
  const active = toActiveOverrides(overrides, tree);

  if (!active.hidden.has(id)) {
    return active;
  }

  const hidden = new Map(active.hidden);

  hidden.delete(id);

  return { ...active, hidden };
};

export {
  toActiveOverrides,
  toEmptyOverrides,
  withHidden,
  withName,
  withoutHidden,
};

export type { LayerOverrides };
