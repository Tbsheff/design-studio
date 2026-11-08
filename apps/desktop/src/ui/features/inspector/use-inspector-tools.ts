import type { InsertKind, SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MutableRefObject } from "react";

import { runCommand } from "../../inspector-slots.js";
import type { PreviewPort } from "../../platform/bridge.js";
import { isCanvasSelectMode, isHtmlFile, toInsertTip } from "./tools-model.js";
import type { DirectEditControl } from "./use-direct-edit.js";
import { useInsertTool } from "./use-insert-tool.js";

interface ToolsOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly historyEvent: string;
  readonly onSelectMode: (() => void) | null;
  readonly onUndo: (() => void) | null;
  readonly onRedo: (() => void) | null;
}

interface ToolsState {
  readonly hasSelection: boolean;
  readonly insertTip: string | null;
  readonly notice: string | null;
  readonly handleHistory: (isRedo: boolean) => void;
  readonly handleInsert: (kind: InsertKind) => void;
  readonly handleSelect: () => void;
  readonly handleSelectChild: () => void;
}

const toOwnHistory = (
  isRedo: boolean,
  onUndo: (() => void) | null,
  onRedo: (() => void) | null
): (() => void) | null => {
  if (isRedo) {
    return onRedo;
  }

  return onUndo;
};

const useInspectorTools = (options: ToolsOptions): ToolsState => {
  const { selection, port, historyEvent } = options;
  const { onSelectMode, onUndo, onRedo } = options;
  const last = selection.at(-1) ?? null;
  const lastSelector = last?.selector ?? null;

  const isHtmlSelection =
    selection.length === 1 && isHtmlFile(last?.source?.file ?? null);

  const { handleInsert, notice } = useInsertTool({ ...options, last });

  const handleSelect = useCallback((): void => {
    if (onSelectMode) {
      onSelectMode();

      return;
    }

    if (!isCanvasSelectMode()) {
      runCommand("tool.select");
    }
  }, [onSelectMode]);

  const handleSelectChild = (): void => {
    if (lastSelector !== null) {
      port.current?.post({
        move: "child",
        selector: lastSelector,
        type: "select-relative",
      });
    }
  };

  const handleHistory = (isRedo: boolean): void => {
    const own = toOwnHistory(isRedo, onUndo, onRedo);

    if (own) {
      own();

      return;
    }

    globalThis.dispatchEvent(
      new CustomEvent(historyEvent, { detail: { redo: isRedo } })
    );
  };

  const hasSelection = last !== null;
  const insertTip = toInsertTip(hasSelection, isHtmlSelection);

  return {
    handleHistory,
    handleInsert,
    handleSelect,
    handleSelectChild,
    hasSelection,
    insertTip,
    notice,
  };
};

export { useInspectorTools };

export type { ToolsOptions };
