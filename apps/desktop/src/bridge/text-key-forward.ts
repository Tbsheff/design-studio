import { toTextKeyId } from "../shared/text-keys.js";
import type { BridgeContext } from "./bridge-types.js";
import { IS_MAC, eventElement, isTypingElement } from "./dom-input.js";

const hasRangeSelection = (): boolean => {
  const selection = globalThis.getSelection();

  return selection !== null && !selection.isCollapsed;
};

const isKeptForRange = (id: string, isEditing: boolean): boolean =>
  isEditing && id === "text-bold" && hasRangeSelection();

const forwardTextKey = (
  context: BridgeContext,
  event: KeyboardEvent
): boolean => {
  const { state, post, textEditor } = context;
  const id = toTextKeyId(event, IS_MAC);
  const isEditing = textEditor.editing();

  if (!id || !state.selected?.isConnected) {
    return false;
  }

  if (
    !isEditing &&
    (state.mode !== "select" || isTypingElement(eventElement(event)))
  ) {
    return false;
  }

  if (isKeptForRange(id, isEditing)) {
    return false;
  }

  event.preventDefault();
  event.stopImmediatePropagation();

  if (!event.repeat) {
    post({ key: id, type: "arrange-key" });
  }

  return true;
};

export { forwardTextKey };
