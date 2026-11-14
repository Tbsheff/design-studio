import type {
  SelectionContext,
  StructureTarget,
} from "@design-studio/contracts";
import { startTransition, useCallback } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { setClipboardText } from "../../platform/clipboard.js";
import {
  toCopyNotice,
  toCopyTargets,
  toMarkup,
  toWaiting,
} from "./copy-paste-model.js";
import type { WaitingLayers } from "./copy-paste-model.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import type { PasteIds, StructureDeps } from "./layer-structure-deps.js";

type SetWaiting = (
  update: (prev: WaitingLayers | null) => WaitingLayers | null
) => void;

interface CopyLayersInput {
  readonly context: EditContext;
  readonly deps: StructureDeps;
  readonly setWaiting: SetWaiting;
}

const readMarkup = async (
  deps: StructureDeps,
  ids: PasteIds,
  targets: readonly StructureTarget[],
  selection: readonly SelectionContext[]
): Promise<string> => {
  try {
    const codes = await Promise.all(
      targets.map((target) => deps.readSource(ids, target.source))
    );

    return toMarkup(codes, selection);
  } catch {
    return toMarkup(
      targets.map(() => null),
      selection
    );
  }
};

const writeCopy = async (
  markup: Promise<string>,
  targets: StructureTarget[],
  setWaiting: SetWaiting
): Promise<boolean> => {
  const isWritten = await setClipboardText(markup);
  const text = await markup;

  setWaiting((prev) => {
    if (prev?.targets !== targets) {
      return prev;
    }

    return { ...prev, markup: text };
  });

  return isWritten;
};

const useCopyLayers = (input: CopyLayersInput): (() => void) => {
  const { context, deps, setWaiting } = input;
  const { liveRef, notify } = context;

  return useCallback((): void => {
    const { current } = liveRef;
    const targets = toCopyTargets(current.selection);
    const { directionId } = current;

    if (!targets || !directionId) {
      notify(deps.noSource);

      return;
    }

    const ids = { directionId, projectId: current.projectId };
    const markup = readMarkup(deps, ids, targets, current.selection);

    setWaiting(() => toWaiting("copy", current.headVersionId, targets));
    notify(
      toCopyNotice(targets.length, shortcutLabel("layer-paste", deps.isMac))
    );
    startTransition(async () => {
      if (!(await writeCopy(markup, targets, setWaiting))) {
        notify(COPY.noticeClipboardBlocked);
      }
    });
  }, [deps, liveRef, notify, setWaiting]);
};

export { useCopyLayers };

export type { CopyLayersInput, SetWaiting };
