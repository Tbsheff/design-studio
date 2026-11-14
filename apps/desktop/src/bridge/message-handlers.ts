import type { ParentToBridge } from "@design-studio/contracts";
import { cleanOpenSteps } from "@design-studio/contracts/frame-state";

import { anchorQueries, resolveAnchorElement } from "./anchor-tracker.js";
import { AUTHORED_MAX_BYTES, authoredRules } from "./authored.js";
import type { BridgeContext, MessageHandlers } from "./bridge-types.js";
import { holdTextSelection, isObject, isString } from "./dom-input.js";
import { SELECT_SETTLE_MS, queryElement } from "./element-info.js";
import { FORCED_STATES } from "./force-state.js";
import type { ForcedState } from "./force-state.js";
import { runTextUndo } from "./history-key.js";
import { createSelectionHandlers, elementOfId } from "./hover-select.js";
import { createKeyboardHandlers } from "./keyboard.js";
import type { PostNudge } from "./keyboard.js";
import { createLayersAtPointHandler } from "./layers-at-point.js";
import { setPlayVars } from "./play-vars.js";
import { linkQueries } from "./play.js";
import { neighborRects } from "./rect-tracker.js";
import { toAnchorContext } from "./stack-peers.js";

const isParentMessage = (
  data: unknown,
  token: string
): data is ParentToBridge => {
  if (
    !isObject(data) ||
    !("ns" in data) ||
    !("token" in data) ||
    !("type" in data)
  ) {
    return false;
  }

  return data.ns === "studio" && data.token === token && isString(data.type);
};

const FORCE_SELECTOR_MAX = 2000;

const listOf = (value: unknown): unknown[] => {
  if (Array.isArray(value)) {
    return value;
  }

  return [];
};

const createForceStateHandler = (
  context: BridgeContext
): MessageHandlers["force-state"] => {
  const { state, themeControl, forceState, repostSelected } = context;

  return (message: Extract<ParentToBridge, { type: "force-state" }>) => {
    const states = listOf(message.states).filter((item): item is ForcedState =>
      FORCED_STATES.some((known) => known === item)
    );

    let selector: string | null = null;

    if (
      isString(message.selector) &&
      message.selector.length <= FORCE_SELECTOR_MAX
    ) {
      ({ selector } = message);
    }

    const dark = message.dark === true && selector !== null;

    if (dark !== state.isForcedDark) {
      let theme: "dark" | null = null;

      if (dark) {
        theme = "dark";
      }

      themeControl.set(theme);
    }

    state.isForcedDark = dark;
    forceState.set(selector, states, dark, message.track === true);

    if (selector && !state.selected?.isConnected) {
      state.selected = queryElement(selector);
    }

    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(repostSelected)
    );
  };
};

const createModeHandlers = (
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "clear"
  | "move-cancel"
  | "move-shift"
  | "request-rects"
  | "set-mode"
  | "share-pointer"
> => {
  const { state, rects, freeMove, repeatShift, sharePointer } = context;

  return {
    clear: () => {
      state.lastHover = null;
      state.pendingHover = null;
    },
    "move-cancel": () => {
      holdTextSelection(false);
      void freeMove.cancel();
    },
    "move-shift": (message) => {
      repeatShift(message.isShiftHeld);
    },
    "request-rects": (message) => {
      const selectors = listOf(message.selectors).filter(isString);
      const last = selectors.at(-1);
      state.tracked = selectors;

      if (!last) {
        state.selected = null;
      } else if (performance.now() - state.selectedAt > SELECT_SETTLE_MS) {
        state.selected = queryElement(last);
      }

      rects.track(selectors);
    },
    "set-mode": (message) => {
      state.mode = "none";

      if (message.mode === "select") {
        state.mode = "select";
      }

      state.isMarqueeOn = message.marquee === true;
      state.lastHover = null;
      state.pendingHover = null;
    },
    "share-pointer": (message) => sharePointer.set(message.on === true),
  };
};

const isHeldForText = (context: BridgeContext, selector: unknown): boolean => {
  if (!isString(selector)) {
    return false;
  }

  const element = queryElement(selector);

  return element !== null && context.textEditor.holdFor(element);
};

const createPreviewHandlers = (
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "lofi-preview"
  | "open-steps"
  | "optimistic-apply"
  | "outline-view"
  | "optimistic-drop"
  | "optimistic-settle"
  | "preview-reset"
  | "preview-style"
  | "preview-text"
  | "request-authored"
  | "set-theme"
  | "tokens-preview"
  | "tweaks-preview"
> => {
  const {
    post,
    livePreview,
    openSteps,
    optimistic,
    outlineView,
    previewStyles,
    themeControl,
  } = context;

  return {
    "lofi-preview": (message) => previewStyles.apply("lofi", message.css),
    "open-steps": (message) => openSteps.set(cleanOpenSteps(message.steps)),
    "optimistic-apply": (message) => {
      if (isHeldForText(context, message.patch?.selector)) {
        return;
      }

      optimistic.apply(message.id, message.patch, message.written === true);
    },
    "optimistic-drop": () => optimistic.drop(),
    "optimistic-settle": (message) =>
      optimistic.settle(
        message.id,
        message.ok === true,
        message.classes,
        message.reason
      ),
    "outline-view": (message) => outlineView.set(message.isOn === true),
    "preview-reset": () => livePreview.reset(),
    "preview-style": (message) =>
      livePreview.previewStyle(message.selector, message.style),
    "preview-text": (message) =>
      livePreview.previewText(message.selector, message.text),
    "request-authored": (message) => {
      if (!isString(message.requestId) || !isString(message.selector)) {
        return;
      }

      const element = queryElement(message.selector);
      let rules: ReturnType<typeof authoredRules> = [];
      let inline = "";

      if (element) {
        rules = authoredRules(element);
        inline = livePreview
          .authoredInline(element)
          .slice(0, AUTHORED_MAX_BYTES);
      }

      post({
        inline,
        requestId: message.requestId,
        rules,
        type: "authored",
      });
    },
    "set-theme": (message) => themeControl.set(message.theme),
    "tokens-preview": (message) => previewStyles.apply("tokens", message.css),
    "tweaks-preview": (message) => previewStyles.apply("tweaks", message.css),
  };
};

const TEXT_EDIT_RETRIES = 20;

const TEXT_EDIT_RETRY_MS = 50;

const startTextEdit = (
  context: BridgeContext,
  selector: string,
  left: number
): void => {
  const element = queryElement(selector);

  if (context.textEditor.canEdit(element)) {
    context.textEditor.start(element);

    return;
  }

  if (left > 0) {
    window.setTimeout(
      () => startTextEdit(context, selector, left - 1),
      TEXT_EDIT_RETRY_MS
    );
  }
};

type TextEditResume = Extract<ParentToBridge, { type: "text-edit-resume" }>;

const resumeTextEdit = (
  context: BridgeContext,
  message: TextEditResume,
  left: number
): void => {
  const element = queryElement(message.selector);

  if (context.textEditor.canEdit(element)) {
    context.textEditor.resume(
      element,
      message.start,
      message.end,
      message.text
    );

    return;
  }

  if (left > 0) {
    window.setTimeout(
      () => resumeTextEdit(context, message, left - 1),
      TEXT_EDIT_RETRY_MS
    );
  }
};

const createTextEditHandlers = (
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "text-edit-allowed"
  | "text-edit-resume"
  | "text-edit-start"
  | "text-edit-stop"
  | "text-undo"
> => ({
  "text-edit-allowed": (message) =>
    context.textEditor.allow(message.allowed === true),
  "text-edit-resume": (message) => {
    if (message.frameToken === message.token) {
      resumeTextEdit(context, message, TEXT_EDIT_RETRIES);
    }
  },
  "text-edit-start": (message) => {
    startTextEdit(context, message.selector, TEXT_EDIT_RETRIES);
  },
  "text-edit-stop": () => context.textEditor.cancel(),
  "text-undo": (message) =>
    runTextUndo(context.textEditor, message.redo === true, context.post),
});

const lockAndPost = async (
  context: BridgeContext,
  element: Element,
  isLocked: boolean
): Promise<void> => {
  const { post, layers, locks } = context;
  const keys = await locks.lock(element, isLocked);

  post({ keys, type: "locks" });
  post({ type: "tree", ...layers.build(locks.ownLocked) });
};

const createTrackingHandlers = (
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "describe-anchors"
  | "lock-node"
  | "play-fx"
  | "play-links"
  | "play-run"
  | "play-vars"
  | "request-neighbors"
  | "request-tree"
  | "set-locks"
  | "track-anchors"
  | "track-links"
> => {
  const { post, layers, locks, anchors, links, triggers } = context;

  const postTree = (): void =>
    post({ type: "tree", ...layers.build(locks.ownLocked) });

  return {
    "describe-anchors": (message) => {
      if (!isString(message.requestId)) {
        return;
      }

      const contexts = anchorQueries(message.anchors).map((query) => {
        const found = resolveAnchorElement(query);

        return (
          found && toAnchorContext(found.element, message.hasStack === true)
        );
      });

      post({ contexts, requestId: message.requestId, type: "anchor-contexts" });
    },
    "lock-node": (message) => {
      const element = elementOfId(layers, message.id);

      if (!element) {
        return;
      }

      void lockAndPost(context, element, message.locked === true);
    },
    "play-fx": (message) => links.fx(message),
    "play-links": (message) => {
      links.play(message.links);
      triggers.set(linkQueries(message.links));
    },
    "play-run": (message) => triggers.run(message.op, message.selector),
    "play-vars": (message) => setPlayVars(message.vars),
    "request-neighbors": (message) => {
      if (isString(message.requestId)) {
        post({
          requestId: message.requestId,
          type: "neighbors",
          ...neighborRects(message.selector),
        });
      }
    },
    "request-tree": postTree,
    "set-locks": (message) => locks.set(message.keys),
    "track-anchors": (message) => anchors.track(anchorQueries(message.anchors)),
    "track-links": (message) => links.track(message.links),
  };
};

const installMessageHandlers = (
  context: BridgeContext,
  postNudge: PostNudge
): void => {
  const { session } = context;

  const messageHandlers: MessageHandlers = {
    ...createModeHandlers(context),
    ...createPreviewHandlers(context),
    ...createTextEditHandlers(context),
    ...createTrackingHandlers(context),
    ...createSelectionHandlers(context),
    ...createKeyboardHandlers(context, postNudge),
    ...createLayersAtPointHandler(context),
    "force-state": createForceStateHandler(context),
  };

  const onMessage = (event: MessageEvent): void => {
    const data: unknown = event.data;

    if (!isParentMessage(data, session.token)) {
      return;
    }

    if (!Object.hasOwn(messageHandlers, data.type)) {
      return;
    }

    const handler = messageHandlers[data.type] as (
      message: ParentToBridge
    ) => void;

    handler(data);
  };

  if (session.port) {
    session.port.addEventListener("message", onMessage);
    session.port.start();
  }
};

export { installMessageHandlers };
