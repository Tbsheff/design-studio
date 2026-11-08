import type { ReorderMove, StructureKey } from "@design-studio/contracts";
import { useEffect } from "react";

import { reorderMoveOf } from "../../../shared/reorder.js";
import { structureKeyOf } from "../../../shared/structure-keys.js";
import { canvasHasKeys, isTypingTarget } from "../../platform/typing-target.js";
import type { LayerEditsOptions } from "./layer-edits-types.js";

interface LayerShortcutsInput {
  readonly getOptions: () => LayerEditsOptions;
  readonly isMac: boolean;
  readonly onMove: (move: ReorderMove) => void;
  readonly onStructureKey: (key: StructureKey) => void;
}

interface Shortcut {
  readonly move: ReorderMove | null;
  readonly structure: StructureKey | null;
}

const toShortcut = (event: KeyboardEvent, isMac: boolean): Shortcut => {
  const move = reorderMoveOf(event);
  let structure: StructureKey | null = null;

  if (!move && !event.repeat) {
    structure = structureKeyOf(event, isMac);
  }

  return { move, structure };
};

const useLayerShortcuts = (input: LayerShortcutsInput): void => {
  const { getOptions, isMac, onMove, onStructureKey } = input;

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      const { selectMode, selection } = getOptions();

      if (
        !selectMode ||
        selection.length === 0 ||
        isTypingTarget(event.target) ||
        !canvasHasKeys()
      ) {
        return;
      }

      const { move, structure } = toShortcut(event, isMac);

      if (move) {
        event.preventDefault();
        onMove(move);

        return;
      }

      if (structure) {
        event.preventDefault();
        onStructureKey(structure);
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);

    return (): void => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [getOptions, isMac, onMove, onStructureKey]);
};

export { useLayerShortcuts };
