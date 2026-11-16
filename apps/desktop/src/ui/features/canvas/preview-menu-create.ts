import type { ProjectKind, SelectionContext } from "@design-studio/contracts";

import { STACKING_KEY_EVENT } from "../../domain/stacking-key-events.js";
import type { StackingAppKey } from "../../domain/stacking-key-events.js";
import { uiStore } from "../../platform/storage.js";
import { copy } from "./copy.js";
import type { PreviewMenuItem } from "./preview-menu.js";

interface CreateOptions {
  readonly edits: { readonly busy: boolean; readonly enabled: boolean };
  readonly ids: {
    readonly directionId: string | null;
    readonly kind: ProjectKind;
  };
  readonly selection: SelectionContext[];
}

interface DisabledReason {
  disabled?: string;
}

const disabledBy = (reason: string | null): DisabledReason => {
  if (reason) {
    return { disabled: reason };
  }

  return {};
};

const createBlocker = (options: CreateOptions): string | null => {
  if (options.ids.kind !== "react") {
    return "Components need a React project. This is a plain HTML page";
  }

  if (options.selection.some((item) => !item.source && !item.owners?.length)) {
    return "An element has no source location";
  }

  if (options.edits.busy) {
    return "Wait for the last edit to finish";
  }

  return null;
};

const createItem = (
  options: CreateOptions,
  open: () => void
): PreviewMenuItem[] => {
  if (!options.edits.enabled || !options.ids.directionId) {
    return [];
  }

  const blocked = createBlocker(options);

  let label = "Create component…";

  if (options.selection.length > 1) {
    label = `Create component from ${options.selection.length}…`;
  }

  return [
    {
      icon: "component",
      id: "create-component",
      label,
      run: open,
      ...disabledBy(blocked),
    },
  ];
};

const toLayersItem = (): PreviewMenuItem => ({
  icon: "layers",
  id: "layers",
  keyId: "layers",
  label: "Show in layers",
  run: (): void => {
    uiStore.set({ layersOpen: true });
  },
});

const toStackingItem = (
  item: Omit<PreviewMenuItem, "run">,
  id: StackingAppKey
): PreviewMenuItem => ({
  ...item,
  run: (): void => {
    globalThis.dispatchEvent(
      new CustomEvent(STACKING_KEY_EVENT, { detail: { id } })
    );
  },
});

const toTransformMenuItems = (): PreviewMenuItem[] => [
  toStackingItem(
    {
      divider: true,
      icon: "layers",
      id: "bring-forward",
      keyId: "bring-forward",
      label: copy.layerMenuForward,
    },
    "layer-forward"
  ),
  toStackingItem(
    {
      icon: "layers",
      id: "send-backward",
      keyId: "send-backward",
      label: copy.layerMenuBackward,
    },
    "layer-backward"
  ),
  toStackingItem(
    {
      icon: "layers",
      id: "bring-to-front",
      keyId: "bring-to-front",
      label: copy.layerMenuFront,
    },
    "layer-front"
  ),
  toStackingItem(
    {
      icon: "layers",
      id: "send-to-back",
      keyId: "send-to-back",
      label: copy.layerMenuBack,
    },
    "layer-back"
  ),
];

export { createItem, disabledBy, toLayersItem, toTransformMenuItems };
