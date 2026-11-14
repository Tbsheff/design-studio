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
import { toCutNotice } from "./layer-edits-model.js";
import type { StructureDeps } from "./layer-structure-deps.js";
import { useCopyLayers } from "./use-copy-layers.js";
import type { CopyLayersInput } from "./use-copy-layers.js";
import { usePasteClipboard } from "./use-paste-clipboard.js";
import { usePasteReplace } from "./use-paste-replace.js";

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
  readonly pasteReplace: () => void;
}

const useCutLayers = (input: CopyLayersInput): (() => void) => {
  const { context, deps, setWaiting } = input;
  const { liveRef, notify } = context;

  return useCallback((): void => {
    const targets = deps.selectionTargets(liveRef.current.selection);

    if (!targets) {
      notify(deps.noSource);

      return;
    }

    setWaiting(() => toWaiting("cut", liveRef.current.headVersionId, targets));
    notify(
      toCutNotice(targets.length, shortcutLabel("layer-paste", deps.isMac))
    );
  }, [deps, liveRef, notify, setWaiting]);
};

const useCutPaste = (input: CutPasteInput): CutPaste => {
  const { applyStructure, context, deps } = input;
  const { liveRef, notify } = context;
  const [waiting, setWaiting] = useState<WaitingLayers | null>(null);

  const cutSelection = useCutLayers({ context, deps, setWaiting });

  const copySelection = useCopyLayers({ context, deps, setWaiting });

  const pasteClipboard = usePasteClipboard(context, deps);

  const pasteReplace = usePasteReplace({
    applyStructure,
    context,
    deps,
    waiting,
  });

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
    pasteReplace,
  };
};

export { useCutPaste };
