import { ELEMENT_MARK_PARAM, SOURCE_LOC_ATTR } from "@design-studio/contracts";
import {
  FORCE_STATE_PARAM,
  fromForcedParam,
} from "@design-studio/contracts/state-styles";

import { createAnchorTracker } from "./anchor-tracker.js";
import { appSourceFor, primeAppSources } from "./app-source.js";
import type { BridgeCore, BridgeState } from "./bridge-types.js";
import { eventElement, rootElementOf } from "./dom-input.js";
import { selectorFor, sourceStrings } from "./element-info.js";
import { createForceState } from "./force-state.js";
import { forceStateFromUrl } from "./forced-boot.js";
import { forwardHistoryKeys } from "./history-key.js";
import { installHoverSelect } from "./hover-select.js";
import { createPostNudge, installKeyboard } from "./keyboard.js";
import { createLayerIndex } from "./layers.js";
import {
  PREVIEW_STYLE_KEYS,
  createLivePreview,
  createPreviewStyles,
} from "./live-preview.js";
import { createLockSet } from "./locks.js";
import { installMessageHandlers } from "./message-handlers.js";
import { createOptimistic } from "./optimistic.js";
import {
  createPost,
  createSelectionPosts,
  installErrorReporting,
  installLifecycle,
} from "./outgoing.js";
import { createOutlineView } from "./outline-view.js";
import { createTriggerBridge } from "./play-triggers.js";
import { createLinkBridge } from "./play.js";
import { createPointerTools, installPointerDrag } from "./pointer-drag.js";
import { createRectTracker } from "./rect-tracker.js";
import { exposeHeadlessMatch } from "./select-match.js";
import { APP_MODE, readSession } from "./session.js";
import type { BridgeSession } from "./session.js";
import { createSharePointer } from "./share-pointer.js";
import { exposeHeadlessScan } from "./style-scan.js";
import { createTextEditor } from "./text-edit.js";
import { createThemeControl } from "./theme-control.js";
import { forwardZoomInput } from "./zoom-forward.js";

const createState = (): BridgeState => ({
  hoverFrame: 0,
  isAltHeld: false,
  isForcedDark: false,
  isLastAltHeld: false,
  isMarqueeOn: false,
  lastHover: null,
  mode: "none",
  pendingHover: null,
  selected: null,
  selectedAt: -Infinity,
  tracked: [],
});

const appSourcesOf = (): {
  prime: typeof primeAppSources;
  source: typeof appSourceFor;
} | null => {
  if (APP_MODE === "next") {
    return { prime: primeAppSources, source: appSourceFor };
  }

  return null;
};

const buildCore = (session: BridgeSession): BridgeCore => {
  const state = createState();
  const post = createPost(session);
  installErrorReporting(post);
  const layers = createLayerIndex();

  const locks = createLockSet(appSourcesOf(), (keys) => {
    if (keys) {
      post({ keys, type: "locks" });
    }

    post({ type: "tree", ...layers.build(locks.ownLocked) });
  });

  const hitOf = (event: Event): Element | null =>
    locks.hit(event, rootElementOf(eventElement(event)));

  const selection = createSelectionPosts(state, post, layers);
  const livePreview = createLivePreview();

  const textEditor = createTextEditor({
    onStart: (element) => {
      state.lastHover = null;
      state.pendingHover = null;
      post({ rect: null, type: "hover" });

      if (state.selected !== element) {
        selection.postSelect(element, false);
      }
    },
    post,
    previewText: (selector, text) => livePreview.previewText(selector, text),
    selectorFor,
  });

  const optimistic = createOptimistic({
    previewing: (element) => livePreview.previewing(element),
    release: (element, props, text) =>
      livePreview.release(element, props, text),
    report: (id, outcome, ms, reason) =>
      post({
        id,
        ms,
        outcome,
        type: "optimistic-result",
        ...(Boolean(reason) && { reason }),
      }),
    sourceOf: sourceStrings,
    styleKeys: PREVIEW_STYLE_KEYS,
  });

  return {
    ...selection,
    anchors: createAnchorTracker(post),
    forceState: createForceState(selection.repostSelected),
    hitOf,
    layers,
    links: createLinkBridge(post),
    livePreview,
    locks,
    optimistic,
    outlineView: createOutlineView(),
    post,
    previewStyles: createPreviewStyles(),
    rects: createRectTracker(post),
    session,
    sharePointer: createSharePointer(post),
    state,
    textEditor,
    themeControl: createThemeControl(),
    triggers: createTriggerBridge(post),
  };
};

const startBridge = (session: BridgeSession): void => {
  const core = buildCore(session);
  const context = { ...core, ...createPointerTools(core) };
  const postNudge = createPostNudge(context);
  installMessageHandlers(context, postNudge);
  context.triggers.install();
  installPointerDrag(context);
  installHoverSelect(context);
  installKeyboard(context, postNudge);
  forwardZoomInput(context.post);
  forwardHistoryKeys(context.post);
  installLifecycle(context);
};

const markScopedElement = (): void => {
  const loc = new URL(window.location.href).searchParams.get(
    ELEMENT_MARK_PARAM
  );

  if (!loc || document.querySelector("#studio-element-mark")) {
    return;
  }

  const style = document.createElement("style");
  style.id = "studio-element-mark";
  style.textContent = `[${SOURCE_LOC_ATTR}="${CSS.escape(loc)}"]{outline:2px solid oklch(0.62 0.19 255) !important;outline-offset:4px !important;}`;
  (document.head ?? document.documentElement).append(style);
};

const marker = "__studioBridgeStarted";
const globalScope = window as unknown as Record<string, unknown>;

if (!globalScope[marker]) {
  globalScope[marker] = true;
  exposeHeadlessScan(selectorFor);
  exposeHeadlessMatch(APP_MODE !== "next");
  markScopedElement();
  forceStateFromUrl(
    fromForcedParam(
      new URL(window.location.href).searchParams.get(FORCE_STATE_PARAM)
    )
  );
  readSession(startBridge);
}
