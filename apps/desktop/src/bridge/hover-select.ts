import { appHydrated, appSourceFor } from "./app-source.js";
import type { BridgeContext, MessageHandlers } from "./bridge-types.js";
import { eventElement, isNumber, isString } from "./dom-input.js";
import {
  queryElement,
  selectionFor,
  selectorFor,
  shortLabel,
} from "./element-info.js";
import { dropElement, insideTarget, toDropTarget } from "./insert-target.js";
import { isMatchKind, matchingElements } from "./select-match.js";
import { selectSource } from "./select-sources.js";
import { APP_MODE, SELECT_RETRIES, SELECT_RETRY_MS } from "./session.js";
import { findStyles } from "./style-scan.js";
import { selectChildText, toMixedParentOf } from "./text-edit-range-mode.js";

const SELECTOR_MAX = 400;

const elementOfId = (
  layers: BridgeContext["layers"],
  id: unknown
): Element | null => {
  if (!isNumber(id)) {
    return null;
  }

  return layers.element(id);
};

const matchBase = (
  selected: Element | null,
  selector: string
): Element | null => {
  if (selected?.isConnected && selectorFor(selected) === selector) {
    return selected;
  }

  return queryElement(selector);
};

type SelectionHandlers = Pick<
  MessageHandlers,
  | "element-at"
  | "find-styles"
  | "hover-node"
  | "menu-at"
  | "select-at"
  | "select-matching"
  | "select-node"
  | "select-selector"
  | "select-source"
>;

const createLookupHandlers = (
  context: BridgeContext
): Pick<
  SelectionHandlers,
  "element-at" | "hover-node" | "select-matching" | "select-node"
> => {
  const { state, post, layers, locks, postHover, postSelect, postSelectMany } =
    context;

  return {
    "element-at": (message) => {
      if (
        !isString(message.requestId) ||
        !isNumber(message.x) ||
        !isNumber(message.y)
      ) {
        return;
      }

      const element = toDropTarget(message);

      if (element) {
        postHover(element);
      }

      post({
        inside: Boolean(element && insideTarget(element)),
        label: (element && shortLabel(element)) || "",
        requestId: message.requestId,
        selection: element && selectionFor(element),
        type: "element-at",
      });
    },
    "hover-node": (message) =>
      postHover(elementOfId(layers, message.id), "tree"),
    "select-matching": (message) => {
      if (
        !isString(message.requestId) ||
        !isString(message.selector) ||
        !isMatchKind(message.by)
      ) {
        return;
      }

      const base = matchBase(state.selected, message.selector);

      if (!base) {
        return post({
          count: 0,
          note: "Select the element again.",
          requestId: message.requestId,
          type: "matched",
        });
      }

      const result = matchingElements(base, message.by, {
        skip: (element) => locks.isLocked(element),
        useLoc: APP_MODE !== "next",
      });

      void postSelectMany(result.elements, false);
      post({
        count: result.elements.length,
        requestId: message.requestId,
        type: "matched",
        ...(Boolean(result.note) && { note: result.note }),
      });
    },
    "select-node": (message) => {
      const element = elementOfId(layers, message.id);

      if (element) {
        postSelect(element, message.additive === true);
      }
    },
  };
};

const createRetryHandlers = (
  context: BridgeContext
): Pick<
  SelectionHandlers,
  "find-styles" | "select-at" | "select-selector" | "select-source"
> => {
  const { post, postSelect } = context;

  return {
    "find-styles": (message) =>
      findStyles(message, {
        reply: (requestId, result, selected) =>
          post({ requestId, result, selected, type: "styles-found" }),
        select: postSelect,
        selectorOf: selectorFor,
      }),
    "select-at": (message) => {
      if (!isNumber(message.x) || !isNumber(message.y)) {
        return;
      }

      const { x, y } = message;

      const attempt = (left: number): void => {
        const element = dropElement(x, y);
        const ready = element && (APP_MODE !== "next" || appHydrated(element));

        if (element && (ready || left === 0)) {
          postSelect(element, false);
        } else if (left > 0) {
          window.setTimeout(() => attempt(left - 1), SELECT_RETRY_MS);
        }
      };

      attempt(SELECT_RETRIES);
    },
    "select-selector": (message) => {
      const { selector } = message;

      if (!isString(selector) || selector.length > SELECTOR_MAX) {
        return;
      }

      const attempt = (left: number): void => {
        let element: Element | null = null;

        try {
          element = document.querySelector(selector);
        } catch {
          return;
        }

        const ready = element && (APP_MODE !== "next" || appHydrated(element));

        if (element && (ready || left === 0)) {
          element.scrollIntoView({ block: "center", inline: "nearest" });
          postSelect(element, false);
        } else if (left > 0 && APP_MODE === "next") {
          window.setTimeout(() => attempt(left - 1), SELECT_RETRY_MS);
        }
      };

      attempt(SELECT_RETRIES);
    },
    "select-source": (message) => {
      selectSource(message, context);
    },
  };
};

const createMenuHandlers = (
  context: BridgeContext
): Pick<SelectionHandlers, "menu-at"> => ({
  "menu-at": (message) => {
    const element = dropElement(message.x, message.y);

    if (context.state.mode !== "select" || !element) {
      return;
    }

    context.postSelect(element, false);
    context.post({ type: "context-menu", x: message.x, y: message.y });
  },
});

const createSelectionHandlers = (
  context: BridgeContext
): SelectionHandlers => ({
  ...createLookupHandlers(context),
  ...createMenuHandlers(context),
  ...createRetryHandlers(context),
});

const installClickMenus = (context: BridgeContext): void => {
  const { state, post, textEditor, block, hitOf, postSelect } = context;

  const onContextMenu = (event: MouseEvent): void => {
    block(event);
    const element = hitOf(event);

    if (state.mode !== "select" || !element || textEditor.owns(element)) {
      return;
    }

    const inSelection =
      element === state.selected ||
      state.tracked.some((selector) => queryElement(selector) === element);

    if (!inSelection) {
      postSelect(element, false);
    }

    post({ type: "context-menu", x: event.clientX, y: event.clientY });
  };

  const onDblClick = (event: MouseEvent): void => {
    const element = hitOf(event);
    let target: Element | null = null;

    if (state.mode === "select" || element === state.selected) {
      target = element;
    }

    if (textEditor.owns(element)) {
      return block(event);
    }

    const parent = toMixedParentOf(target);

    if (target !== null && parent !== null && textEditor.canEdit(parent)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      textEditor.start(parent);
      selectChildText(parent, target);

      return;
    }

    if (!textEditor.canEdit(target)) {
      return block(event);
    }

    event.preventDefault();
    event.stopImmediatePropagation();
    textEditor.start(target, { x: event.clientX, y: event.clientY });
  };

  window.addEventListener("dblclick", onDblClick, { capture: true });
  window.addEventListener("contextmenu", onContextMenu, { capture: true });
};

const flushPendingHover = (context: BridgeContext): void => {
  const { state, postHover } = context;

  state.hoverFrame = 0;
  const element = state.pendingHover;
  state.pendingHover = null;

  if (state.mode !== "select") {
    return;
  }

  if (
    element === state.lastHover &&
    element &&
    state.isAltHeld === state.isLastAltHeld
  ) {
    return;
  }

  state.lastHover = element;
  state.isLastAltHeld = state.isAltHeld;
  postHover(element);

  if (element && APP_MODE === "next") {
    void appSourceFor(element);
  }
};

const installHoverSelect = (context: BridgeContext): void => {
  const {
    state,
    textEditor,
    freeMove,
    marquee,
    links,
    block,
    hitOf,
    postSelect,
  } = context;

  const flushHover = (): void => {
    flushPendingHover(context);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (
      state.mode !== "select" ||
      textEditor.editing() ||
      freeMove.move(event) ||
      marquee.move(event)
    ) {
      return;
    }

    state.isAltHeld = event.altKey;
    state.pendingHover = hitOf(event);

    if (!state.hoverFrame) {
      state.hoverFrame = window.requestAnimationFrame(flushHover);
    }
  };

  const onClick = (event: MouseEvent): void => {
    if (state.mode !== "select" && links.onClick(event)) {
      return;
    }

    if (
      state.mode !== "select" ||
      textEditor.owns(eventElement(event)) ||
      freeMove.takeClick() ||
      marquee.takeClick()
    ) {
      return block(event);
    }

    block(event);
    const element = hitOf(event);

    if (!element) {
      return;
    }

    postSelect(element, event.shiftKey, { x: event.clientX, y: event.clientY });
  };

  window.addEventListener("pointermove", onPointerMove, {
    capture: true,
    passive: true,
  });
  window.addEventListener("click", onClick, { capture: true });
  installClickMenus(context);
};

export { createSelectionHandlers, elementOfId, installHoverSelect };
