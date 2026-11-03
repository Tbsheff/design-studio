import type { ParentToBridge } from "../shared/contracts.js";
import { anchorQueries, resolveAnchorElement } from "./anchor-tracker.js";
import { AUTHORED_MAX_BYTES, authoredRules } from "./authored.js";
import type { BridgeContext, MessageHandlers } from "./bridge-types.js";
import {
  holdTextSelection,
  isNumber,
  isObject,
  isString,
} from "./dom-input.js";
import {
  SELECT_SETTLE_MS,
  queryElement,
  selectionFor,
} from "./element-info.js";
import { FORCED_STATES } from "./force-state.js";
import type { ForcedState } from "./force-state.js";
import { createSelectionHandlers, elementOfId } from "./hover-select.js";
import { createKeyboardHandlers } from "./keyboard.js";
import type { PostNudge } from "./keyboard.js";
import { linkQueries } from "./play.js";
import { neighborRects } from "./rect-tracker.js";

const FORCE_SELECTOR_MAX = 2000;

function listOf(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
  return [];
}

function createForceStateHandler(
  context: BridgeContext
): MessageHandlers["force-state"] {
  const { state, themeControl, forceState, repostSelected } = context;
  return (message: Extract<ParentToBridge, { type: "force-state" }>) => {
    const states = listOf(message.states).filter((item): item is ForcedState =>
      FORCED_STATES.some((known) => known === item)
    );
    let selector: string | null = null;
    if (
      isString(message.selector) &&
      message.selector.length <= FORCE_SELECTOR_MAX
    )
      selector = message.selector;
    const dark = message.dark === true && selector !== null;
    if (dark !== state.forcedDark) {
      let theme: "dark" | null = null;
      if (dark) theme = "dark";
      themeControl.set(theme);
    }
    state.forcedDark = dark;
    forceState.set(selector, states, dark, message.track === true);
    if (selector && !state.selected?.isConnected)
      state.selected = queryElement(selector);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(repostSelected)
    );
  };
}

function createModeHandlers(
  context: BridgeContext
): Pick<
  MessageHandlers,
  "clear" | "move-cancel" | "request-rects" | "set-mode" | "share-pointer"
> {
  const { state, rects, freeMove, sharePointer } = context;
  return {
    clear: () => {
      state.lastHover = null;
      state.pendingHover = null;
    },
    "move-cancel": () => {
      holdTextSelection(false);
      void freeMove.cancel();
    },
    "request-rects": (message) => {
      const selectors = listOf(message.selectors).filter(isString);
      const last = selectors.at(-1);
      state.tracked = selectors;
      if (!last) state.selected = null;
      else if (performance.now() - state.selectedAt > SELECT_SETTLE_MS)
        state.selected = queryElement(last);
      rects.track(selectors);
    },
    "set-mode": (message) => {
      state.mode = "none";
      if (message.mode === "select") state.mode = "select";
      state.marqueeOn = message.marquee === true;
      state.lastHover = null;
      state.pendingHover = null;
    },
    "share-pointer": (message) => sharePointer.set(message.on === true),
  };
}

function createPreviewHandlers(
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "lofi-preview"
  | "optimistic-apply"
  | "optimistic-drop"
  | "optimistic-settle"
  | "preview-reset"
  | "preview-style"
  | "preview-text"
  | "request-authored"
  | "set-theme"
  | "text-edit-allowed"
  | "text-edit-stop"
  | "tokens-preview"
  | "tweaks-preview"
> {
  const { post, livePreview, optimistic, previewStyles, themeControl } =
    context;
  return {
    "lofi-preview": (message) => previewStyles.apply("lofi", message.css),
    "optimistic-apply": (message) =>
      optimistic.apply(message.id, message.patch, message.written === true),
    "optimistic-drop": () => optimistic.drop(),
    "optimistic-settle": (message) =>
      optimistic.settle(
        message.id,
        message.ok === true,
        message.classes,
        message.reason
      ),
    "preview-reset": () => livePreview.reset(),
    "preview-style": (message) =>
      livePreview.previewStyle(message.selector, message.style),
    "preview-text": (message) =>
      livePreview.previewText(message.selector, message.text),
    "request-authored": (message) => {
      if (!isString(message.requestId) || !isString(message.selector)) return;
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
    "text-edit-allowed": (message) =>
      context.textEditor.allow(message.allowed === true),
    "text-edit-stop": () => context.textEditor.cancel(),
    "tokens-preview": (message) => previewStyles.apply("tokens", message.css),
    "tweaks-preview": (message) => previewStyles.apply("tweaks", message.css),
  };
}

function createTrackingHandlers(
  context: BridgeContext
): Pick<
  MessageHandlers,
  | "describe-anchors"
  | "lock-node"
  | "play-fx"
  | "play-links"
  | "play-run"
  | "request-neighbors"
  | "request-tree"
  | "set-locks"
  | "track-anchors"
  | "track-links"
> {
  const { post, layers, locks, anchors, links, triggers } = context;
  const postTree = (): void =>
    post({ type: "tree", ...layers.build(locks.ownLocked) });
  return {
    "describe-anchors": (message) => {
      if (!isString(message.requestId)) return;
      const contexts = anchorQueries(message.anchors).map((query) => {
        const found = resolveAnchorElement(query);
        return found && selectionFor(found.element);
      });
      post({ contexts, requestId: message.requestId, type: "anchor-contexts" });
    },
    "lock-node": (message) => {
      const element = elementOfId(layers, message.id);
      if (!element) return;
      void locks.lock(element, message.locked === true).then((keys) => {
        post({ keys, type: "locks" });
        postTree();
      });
    },
    "play-fx": (message) => links.fx(message),
    "play-links": (message) => {
      links.play(message.links);
      triggers.set(linkQueries(message.links));
    },
    "play-run": (message) => triggers.run(message.op, message.selector),
    "request-neighbors": (message) => {
      if (isString(message.requestId))
        post({
          requestId: message.requestId,
          type: "neighbors",
          ...neighborRects(message.selector),
        });
    },
    "request-tree": postTree,
    "set-locks": (message) => locks.set(message.keys),
    "track-anchors": (message) => anchors.track(anchorQueries(message.anchors)),
    "track-links": (message) => links.track(message.links),
  };
}

function installMessageHandlers(
  context: BridgeContext,
  postNudge: PostNudge
): void {
  const { session } = context;
  const parentWindow = window.parent;
  const messageHandlers: MessageHandlers = {
    ...createModeHandlers(context),
    ...createPreviewHandlers(context),
    ...createTrackingHandlers(context),
    ...createSelectionHandlers(context),
    ...createKeyboardHandlers(context, postNudge),
    "force-state": createForceStateHandler(context),
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== parentWindow || event.origin !== session.parentOrigin)
      return;
    const data = event.data as Partial<ParentToBridge> | null;
    if (
      !data ||
      !isObject(data) ||
      data.ns !== "studio" ||
      data.token !== session.token
    )
      return;
    const message = data as ParentToBridge;
    if (
      !isString(message.type) ||
      !Object.hasOwn(messageHandlers, message.type)
    )
      return;
    const handler = messageHandlers[message.type] as (
      message: ParentToBridge
    ) => void;
    handler(message);
  };

  window.addEventListener("message", onMessage);
}

export { installMessageHandlers };
