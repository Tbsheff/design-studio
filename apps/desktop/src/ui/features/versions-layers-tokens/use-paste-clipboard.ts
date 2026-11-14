import { routes } from "@design-studio/actions/direct-edit/routes";
import type { SelectionContext } from "@design-studio/contracts";
import { startTransition, useCallback } from "react";

import { shortcutLabel } from "../../../shared/keymap.js";
import { errorText } from "../../api.js";
import { getClipboardText } from "../../platform/clipboard.js";
import { call } from "../../platform/http.js";
import { isLeafTag, isSameMarkup } from "./copy-paste-model.js";
import { COPY } from "./copy.js";
import type { EditContext } from "./layer-edit-context.js";
import { toCutFirstNotice } from "./layer-edits-model.js";
import type { PasteIds, StructureDeps } from "./layer-structure-deps.js";

const toSelectedCode = async (
  deps: StructureDeps,
  ids: PasteIds,
  selected: SelectionContext
): Promise<string | null> => {
  if (!selected.source) {
    return null;
  }

  try {
    return await deps.readSource(ids, selected.source);
  } catch {
    return null;
  }
};

const isBesidePaste = async (
  deps: StructureDeps,
  ids: PasteIds,
  selected: SelectionContext,
  clipboard: string
): Promise<boolean> => {
  if (isLeafTag(selected.tag)) {
    return true;
  }

  return isSameMarkup(await toSelectedCode(deps, ids, selected), clipboard);
};

const pasteBeside = async (
  ids: PasteIds,
  selected: SelectionContext,
  jsx: string
): Promise<string> => {
  try {
    await call(routes.insertJsxDirectEdit, {
      ...ids,
      jsx,
      position: "after",
      target: {
        selector: selected.selector,
        source: selected.source,
        tag: selected.tag.toLowerCase(),
      },
    });

    return COPY.noticePasted;
  } catch (error) {
    return errorText(error);
  }
};

const pasteSelected = async (
  deps: StructureDeps,
  ids: PasteIds,
  selected: SelectionContext,
  notify: (message: string) => void
): Promise<void> => {
  const text = await getClipboardText();
  const clipboard = text?.trim() ?? "";

  if (
    clipboard.startsWith("<") &&
    (await isBesidePaste(deps, ids, selected, clipboard))
  ) {
    notify(await pasteBeside(ids, selected, clipboard));

    return;
  }

  await deps.pasteJsx(ids, selected, notify);
};

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
      const ids = { directionId, projectId: current.projectId };

      startTransition(async () => {
        await pasteSelected(deps, ids, last, notify);
      });
    } else {
      notify(toCutFirstNotice(shortcutLabel("layer-cut", deps.isMac)));
    }
  }, [deps, liveRef, notify]);
};

export { usePasteClipboard };
