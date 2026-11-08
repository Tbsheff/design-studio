import type { SelectMove } from "@design-studio/contracts";
import { startTransition } from "react";

import { frontFrame, postFront } from "./preview-frames-core.js";
import { settleSwap } from "./preview-frames-swap.js";
import type { PreviewState, TextEditMessage } from "./preview-frames-types.js";
import {
  manySelection,
  nextSelection,
  nodeAfterSelect,
} from "./preview-selection-model.js";
import type {
  SelectManyMessage,
  SelectMessage,
} from "./preview-selection-model.js";

const releaseToolbarFocus = (state: PreviewState): void => {
  const active = document.activeElement;

  if (active instanceof HTMLButtonElement && active.closest(".toolbar")) {
    frontFrame(state)?.element?.focus();
  }
};

const onTextMessage = (state: PreviewState, message: TextEditMessage): void => {
  state.textEditing = message.type === "text-edit" && message.state === "start";
  state.opts.onTextEdit?.(message);
  const swap = state.pendingSwap;

  if (!state.textEditing && swap?.due && swap.loaded) {
    settleSwap(state, swap.token);
  }
};

const selectMany = (state: PreviewState, message: SelectManyMessage): void => {
  const { opts } = state;
  state.setters.selectedNode(message.node ?? null);

  if (message.selections.length > 0) {
    state.pendingSelectAt = message.at;
  }

  state.picked.set(
    manySelection(opts.selection, message.selections, message.additive)
  );
  startTransition(() =>
    opts.setSelection((prev) =>
      manySelection(prev, message.selections, message.additive)
    )
  );
};

const selectOne = (state: PreviewState, message: SelectMessage): void => {
  const { opts } = state;
  state.setters.selectedNode(nodeAfterSelect(message, opts.selection));
  state.picked.set(
    nextSelection(opts.selection, message.selection, message.additive)
  );
  startTransition(() =>
    opts.setSelection((prev) => {
      const next = nextSelection(prev, message.selection, message.additive);

      if (next.includes(message.selection)) {
        state.pendingSelectAt = message.at;
      }

      return next;
    })
  );
};

const onSelectMessage = (
  state: PreviewState,
  message: SelectMessage | SelectManyMessage
): void => {
  releaseToolbarFocus(state);

  if (message.type === "select-many") {
    selectMany(state, message);

    return;
  }

  selectOne(state, message);
};

const selectRelative = (
  state: PreviewState,
  selector: string,
  move: SelectMove
): void => {
  const { opts } = state;
  const target = opts.selection.find((entry) => entry.selector === selector);

  if (
    move === "child" &&
    opts.textEditAllowed &&
    target &&
    state.host.canEditText(target)
  ) {
    frontFrame(state)?.element?.focus();
  }

  postFront(state, { move, selector, type: "select-relative" });
};

export { onSelectMessage, onTextMessage, selectRelative };
