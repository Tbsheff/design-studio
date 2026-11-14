import { commandBlocker, runCommand } from "../../canvas-preview-slots.js";
import { copy } from "./copy.js";
import { disabledBy } from "./preview-menu-create.js";
import type { PreviewMenuItem } from "./preview-menu.js";

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

export { toTransformMenuItems };
