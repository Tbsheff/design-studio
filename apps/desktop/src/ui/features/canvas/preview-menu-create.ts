import type { ProjectKind, SelectionContext } from "@design-studio/contracts";

import { commandBlocker, runCommand } from "../../canvas-preview-slots.js";
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

const toCommandItem = (
  item: Omit<PreviewMenuItem, "run">,
  command: string
): PreviewMenuItem => ({
  ...item,
  run: (): void => {
    runCommand(command);
  },
  ...disabledBy(commandBlocker(command)),
});

const toTransformMenuItems = (): PreviewMenuItem[] => [
  toCommandItem(
    {
      divider: true,
      icon: "compare",
      id: "flip-h",
      keyId: "flip-h",
      label: copy.layerMenuFlipH,
    },
    "selection.flip-h"
  ),
  toCommandItem(
    {
      icon: "compare",
      id: "flip-v",
      keyId: "flip-v",
      label: copy.layerMenuFlipV,
    },
    "selection.flip-v"
  ),
  toCommandItem(
    { icon: "reload", id: "rotate", label: copy.layerMenuRotate },
    "selection.rotate"
  ),
];

export { createItem, disabledBy, toTransformMenuItems };
