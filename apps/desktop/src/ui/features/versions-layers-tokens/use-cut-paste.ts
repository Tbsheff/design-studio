import type { StructureEditRequest } from "@design-studio/contracts";
import { useCallback, useState } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import { toCutFirstNotice, toCutNotice } from "./layer-edits-model.js";
import type { CutState } from "./layer-edits-types.js";
import type { StructureDeps } from "./layer-structure-deps.js";

interface CutPasteInput {
  readonly applyStructure: (request: StructureEditRequest) => Promise<void>;
  readonly context: EditContext;
  readonly deps: StructureDeps;
}

interface CutPaste {
  readonly canPaste: boolean;
  readonly cutSelection: () => void;
  readonly pasteInto: () => void;
}

const useCutPaste = (input: CutPasteInput): CutPaste => {
  const { applyStructure, context, deps } = input;
  const { liveRef, notify } = context;
  const [cut, setCut] = useState<CutState | null>(null);

  const cutSelection = useCallback((): void => {
    const targets = deps.selectionTargets(liveRef.current.selection);

    if (!targets) {
      notify(deps.noSource);

      return;
    }

    setCut({ head: liveRef.current.headVersionId, targets });
    notify(
      toCutNotice(targets.length, shortcutLabel("layer-paste", deps.isMac))
    );
  }, [deps, liveRef, notify]);

  const pasteCut = useCallback(
    (pending: CutState): void => {
      const { current } = liveRef;
      const into = deps.selectionTargets(current.selection.slice(-1))?.[0];

      if (!into) {
        notify(deps.noSource);

        return;
      }

      setCut(null);

      if (pending.head !== current.headVersionId) {
        notify(COPY.noticeChangedAfterCut);

        return;
      }

      applyStructure({ into, op: "move", targets: pending.targets });
    },
    [applyStructure, deps, liveRef, notify]
  );

  const pasteInto = useCallback((): void => {
    const { current } = liveRef;
    const last = current.selection.at(-1);
    const { directionId } = current;

    if (cut) {
      pasteCut(cut);
    } else if (current.enabled && directionId && last) {
      deps.pasteJsx(
        { directionId, projectId: current.projectId },
        last,
        notify
      );
    } else {
      notify(toCutFirstNotice(shortcutLabel("layer-cut", deps.isMac)));
    }
  }, [cut, deps, liveRef, notify, pasteCut]);

  return { canPaste: cut !== null, cutSelection, pasteInto };
};

export { useCutPaste };
