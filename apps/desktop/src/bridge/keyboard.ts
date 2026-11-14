import { selectMoveOf } from "@design-studio/contracts";

import { nudgeStepOf } from "../shared/nudge.js";
import { reorderMoveOf } from "../shared/reorder.js";
import { structureKeyOf } from "../shared/structure-keys.js";
import type { BridgeContext, MessageHandlers } from "./bridge-types.js";
import {
  IS_MAC,
  eventElement,
  holdTextSelection,
  isEditKey,
  isString,
  isTypingElement,
} from "./dom-input.js";
import { queryElement, selectorFor } from "./element-info.js";
import { nudgeBaseOf } from "./free-move.js";
import { moveSelection } from "./layers.js";

type KeyForwarders = Record<
  "forwardNudgeKey" | "forwardReorderKey" | "forwardStructureKey",
  (event: KeyboardEvent) => boolean
>;

interface EscapeHandlers {
  cancelMarquee: (event: KeyboardEvent) => boolean;
  clearOnEscape: (event: KeyboardEvent) => boolean;
  exitSelectMode: () => void;
}

type PostNudge = (dx: number, dy: number) => boolean;

const hasTextSelection = (): boolean => {
  const selection = globalThis.getSelection();

  return selection !== null && !selection.isCollapsed;
};

const isKeptForText = (key: string, event: KeyboardEvent): boolean =>
  isTypingElement(eventElement(event)) ||
  (key === "copy" && hasTextSelection());

type KeyboardHandlers = Pick<MessageHandlers, "nudge" | "select-relative">;

const createPostNudge = (context: BridgeContext): PostNudge => {
  const { state, post, textEditor } = context;

  return (dx, dy) => {
    const { selected } = state;

    if (
      state.mode !== "select" ||
      !selected?.isConnected ||
      textEditor.editing()
    ) {
      return false;
    }

    const own = selectorFor(selected);
    const others = [];

    for (const selector of state.tracked.filter((item) => item !== own)) {
      const element = queryElement(selector);

      if (element?.isConnected && element !== selected) {
        others.push({ base: nudgeBaseOf(element), selector });
      }
    }

    post({
      base: nudgeBaseOf(selected),
      dx,
      dy,
      selector: own,
      type: "nudge-key",
      ...(others.length > 0 && { others }),
    });

    return true;
  };
};

const createKeyboardHandlers = (
  context: BridgeContext,
  postNudge: PostNudge
): KeyboardHandlers => {
  const { state, textEditor, postSelect } = context;

  const selectFirstLayer = (): void => {
    const first = moveSelection(document.body, "child");

    if (first) {
      postSelect(first, false);
    }
  };

  return {
    nudge: (message) =>
      void postNudge(Number(message.dx) || 0, Number(message.dy) || 0),
    "select-relative": (message) => {
      if (message.selector === "") {
        return selectFirstLayer();
      }

      let base: Element | null = null;

      if (state.selected?.isConnected) {
        base = state.selected;
      } else if (isString(message.selector)) {
        base = queryElement(message.selector);
      }

      if (message.move === "child" && textEditor.canEdit(base)) {
        return textEditor.start(base);
      }

      const valid =
        message.move === "child" ||
        message.move === "parent" ||
        message.move === "next" ||
        message.move === "prev";

      const next = base && valid && moveSelection(base, message.move);

      if (next) {
        postSelect(next, false);
      }
    },
  };
};

const createKeyForwarders = (
  context: BridgeContext,
  postNudge: PostNudge
): Pick<
  KeyForwarders,
  "forwardNudgeKey" | "forwardReorderKey" | "forwardStructureKey"
> => {
  const { state, post } = context;

  const forwardStructureKey = (event: KeyboardEvent): boolean => {
    const { selected } = state;
    const key = !event.repeat && structureKeyOf(event, IS_MAC);

    if (!key || !selected?.isConnected || isKeptForText(key, event)) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    post({ key, selector: selectorFor(selected), type: "structure-key" });

    return true;
  };

  const forwardReorderKey = (event: KeyboardEvent): boolean => {
    const { selected } = state;
    const reorder = reorderMoveOf(event);

    if (
      !reorder ||
      !selected?.isConnected ||
      isTypingElement(eventElement(event))
    ) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();
    post({
      move: reorder,
      selector: selectorFor(selected),
      type: "reorder-key",
    });

    return true;
  };

  const forwardNudgeKey = (event: KeyboardEvent): boolean => {
    const step = nudgeStepOf(event);

    if (
      !step ||
      isTypingElement(eventElement(event)) ||
      !postNudge(step.dx, step.dy)
    ) {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    return true;
  };

  return { forwardNudgeKey, forwardReorderKey, forwardStructureKey };
};

const createEscapeHandlers = (context: BridgeContext): EscapeHandlers => {
  const { state, post, freeMove, marquee, postSelectMany } = context;

  const cancelMarquee = (event: KeyboardEvent): boolean => {
    if (event.key !== "Escape" || !(freeMove.cancel() || marquee.cancel())) {
      return false;
    }

    holdTextSelection(false);
    event.preventDefault();
    event.stopImmediatePropagation();

    return true;
  };

  const clearOnEscape = (event: KeyboardEvent): boolean => {
    if (
      event.key !== "Escape" ||
      event.repeat ||
      state.mode !== "select" ||
      state.tracked.length === 0
    ) {
      return false;
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    state.selected = null;
    state.tracked = [];
    void postSelectMany([], false);

    return true;
  };

  const exitSelectMode = (): void => {
    state.mode = "none";
    state.lastHover = null;
    state.pendingHover = null;
    post({ rect: null, type: "hover" });
    post({ type: "mode-exited" });
  };

  return { cancelMarquee, clearOnEscape, exitSelectMode };
};

const trackAlt = (context: BridgeContext, event: KeyboardEvent): void => {
  const { state } = context;

  if (event.key !== "Alt" || state.mode !== "select") {
    return;
  }

  state.isAltHeld = event.type === "keydown";

  if (state.isAltHeld === state.isLastAltHeld || !state.lastHover) {
    return;
  }

  state.isLastAltHeld = state.isAltHeld;
  context.postHover(state.lastHover);
};

const selectByArrowKey = (
  context: BridgeContext,
  event: KeyboardEvent
): boolean => {
  const { state, postSelect } = context;
  const move = selectMoveOf(event);
  const { selected } = state;

  if (!move || !selected?.isConnected || isTypingElement(eventElement(event))) {
    return false;
  }

  event.preventDefault();
  event.stopPropagation();
  const next = moveSelection(selected, move);

  if (next) {
    postSelect(next, false);
  }

  return true;
};

const installKeyboard = (
  context: BridgeContext,
  postNudge: PostNudge
): void => {
  const { state, textEditor, links } = context;

  const { forwardNudgeKey, forwardReorderKey, forwardStructureKey } =
    createKeyForwarders(context, postNudge);

  const { cancelMarquee, clearOnEscape, exitSelectMode } =
    createEscapeHandlers(context);

  const onAltChange = (event: KeyboardEvent): void => {
    trackAlt(context, event);
  };

  const selectByArrow = (event: KeyboardEvent): boolean =>
    selectByArrowKey(context, event);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      textEditor.onKeyDown(event) ||
      cancelMarquee(event) ||
      clearOnEscape(event)
    ) {
      return;
    }

    if (state.mode !== "select" && links.onKeyDown(event)) {
      return;
    }

    onAltChange(event);

    if (
      forwardReorderKey(event) ||
      state.mode !== "select" ||
      forwardStructureKey(event) ||
      forwardNudgeKey(event)
    ) {
      return;
    }

    if (
      isEditKey(event) &&
      textEditor.canEdit(state.selected) &&
      !isTypingElement(eventElement(event))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      textEditor.start(state.selected);

      return;
    }

    if (selectByArrow(event)) {
      return;
    }

    if (event.key === "Escape") {
      exitSelectMode();
    }
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onAltChange, { capture: true });
};

export { createKeyboardHandlers, createPostNudge, installKeyboard };

export type { PostNudge };
