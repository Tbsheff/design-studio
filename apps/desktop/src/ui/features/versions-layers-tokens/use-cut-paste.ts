import type {
  StructureEditRequest,
  StructureTarget,
} from "@design-studio/contracts";
import { startTransition, useCallback, useState } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { getClipboardText } from "../../platform/clipboard.js";
import { toPasteStep, toWaiting } from "./copy-paste-model.js";
import type { WaitingLayers } from "./copy-paste-model.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import { toCutFirstNotice, toCutNotice } from "./layer-edits-model.js";
import type { StructureDeps } from "./layer-structure-deps.js";
import { useCopyLayers } from "./use-copy-layers.js";

interface CutPasteInput {
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
  readonly context: EditContext;
  readonly deps: StructureDeps;
}

interface CutPaste {
  readonly canPaste: boolean;
  readonly copySelection: () => void;
  readonly cutSelection: () => void;
  readonly pasteInto: () => void;
}

const usePasteClipboard = (
  context: EditContext,
  deps: StructureDeps
): (() => void) => {
  const { liveRef, notify } = context;

  return useCallback((): void => {
    const { current } = liveRef;
    const last = current.selection.at(-1);
    const { directionId } = current;

    if (current.enabled && directionId && last) {
      deps.pasteJsx(
        { directionId, projectId: current.projectId },
        last,
        notify
      );
    } else {
      notify(toCutFirstNotice(shortcutLabel("layer-cut", deps.isMac)));
    }
  }, [deps, liveRef, notify]);
};

const useCutPaste = (input: CutPasteInput): CutPaste => {
  const { applyStructure, context, deps } = input;
  const { liveRef, notify } = context;
  const [waiting, setWaiting] = useState<WaitingLayers | null>(null);

  const cutSelection = useCallback((): void => {
    const targets = deps.selectionTargets(liveRef.current.selection);

    if (!targets) {
      notify(deps.noSource);

      return;
    }

    setWaiting(() => toWaiting("cut", liveRef.current.headVersionId, targets));
    notify(
      toCutNotice(targets.length, shortcutLabel("layer-paste", deps.isMac))
    );
  }, [deps, liveRef, notify]);

  const copySelection = useCopyLayers({ context, deps, setWaiting });

  const pasteClipboard = usePasteClipboard(context, deps);

  const pasteWaiting = useCallback(
    async (pending: WaitingLayers, into: StructureTarget): Promise<void> => {
      let clipboard: string | null = null;

      if (pending.kind === "copy") {
        clipboard = await getClipboardText();
      }

      const head = liveRef.current.headVersionId;
      const step = toPasteStep({ clipboard, head, into, waiting: pending });

      const shouldClear =
        pending.kind === "cut" ||
        (step.kind === "clipboard" && step.shouldClear);

      if (shouldClear) {
        setWaiting(() => null);
      }

      if (step.kind === "changed") {
        notify(COPY.noticeChangedAfterCut);
      } else if (step.kind === "structure") {
        await applyStructure(step.request);
      } else {
        pasteClipboard();
      }
    },
    [applyStructure, liveRef, notify, pasteClipboard]
  );

  const pasteInto = useCallback((): void => {
    const into = deps.selectionTargets(liveRef.current.selection.slice(-1));
    const target = into?.[0];

    if (!waiting) {
      pasteClipboard();
    } else if (target) {
      startTransition(async () => {
        await pasteWaiting(waiting, target);
      });
    } else {
      notify(deps.noSource);
    }
  }, [deps, liveRef, notify, pasteClipboard, pasteWaiting, waiting]);

  return {
    canPaste: waiting !== null,
    copySelection,
    cutSelection,
    pasteInto,
  };
};

export { useCutPaste };
