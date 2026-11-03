import { SOURCE_LOC_ATTR } from "../shared/contracts.js";
import { appSourceFor } from "./app-source.js";
import { ancestorPath } from "./authored.js";
import type {
  BridgeContext,
  BridgeState,
  OutgoingBody,
  Post,
  SelectionPosts,
} from "./bridge-types.js";
import { stringifyArg } from "./dom-input.js";
import { rectOf, selectionFor, shortLabel } from "./element-info.js";
import type { LayerIndex } from "./layers.js";
import { APP_MODE, REDIRECTED_FROM } from "./session.js";
import type { BridgeSession } from "./session.js";
import { reloadIfChangedDuringLoad } from "./zoom-forward.js";

type ErrorBody = Extract<OutgoingBody, { type: "error" }>;

function createPost(session: BridgeSession): Post {
  const parentWindow = window.parent;
  return (body) => {
    try {
      parentWindow.postMessage(
        { ...body, ns: "studio", token: session.token },
        session.parentOrigin
      );
    } catch {
      void 0;
    }
  };
}

function installErrorReporting(post: Post): void {
  let reporting = false;
  const reportError = (body: ErrorBody): void => {
    if (reporting) return;
    reporting = true;
    try {
      post(body);
    } finally {
      reporting = false;
    }
  };

  window.addEventListener("error", (event: ErrorEvent) => {
    const error: unknown = event.error;
    const body: ErrorBody = {
      kind: "runtime",
      message: event.message || stringifyArg(error),
      type: "error",
    };
    if (event.lineno) body.line = event.lineno;
    if (event.filename) body.source = event.filename;
    if (error instanceof Error && error.stack) body.stack = error.stack;
    reportError(body);
  });

  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      const body: ErrorBody = {
        kind: "unhandledrejection",
        message: stringifyArg(reason),
        type: "error",
      };
      if (reason instanceof Error && reason.stack) body.stack = reason.stack;
      reportError(body);
    }
  );

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]): void => {
    originalConsoleError(...args);
    const firstError = args.find((arg): arg is Error => arg instanceof Error);
    reportError({
      kind: "console",
      message: args.map(stringifyArg).join(" "),
      stack: firstError?.stack,
      type: "error",
    });
  };
}

function createSelectionPosts(
  state: BridgeState,
  post: Post,
  layers: LayerIndex
): SelectionPosts {
  const postHover = (element: Element | null, source?: "tree"): void => {
    if (!element) {
      post({ rect: null, source, type: "hover" });
      return;
    }
    post({
      altKey: state.altHeld,
      label: shortLabel(element),
      node: layers.idOf(element),
      rect: rectOf(element),
      source,
      type: "hover",
    });
  };

  const postSelect: SelectionPosts["postSelect"] = (
    element,
    additive,
    point
  ) => {
    if (APP_MODE === "next" && !element.hasAttribute(SOURCE_LOC_ATTR)) {
      void appSourceFor(element).then((source) => {
        if (source && state.selected === element) postSelect(element, additive);
      });
    }
    state.selected = element;
    state.selectedAt = performance.now();
    post({
      additive,
      at: performance.timeOrigin + performance.now(),
      node: layers.idOf(element),
      selection: { ...selectionFor(element), path: ancestorPath(element) },
      type: "select",
      ...(point && { point }),
    });
  };

  const postSelectMany = async (
    elements: Element[],
    additive: boolean
  ): Promise<void> => {
    if (APP_MODE === "next")
      await Promise.all(elements.map((element) => appSourceFor(element)));
    const live = elements.filter((element) => element.isConnected);
    const last = live.at(-1);
    if (!last && additive) return;
    if (last) {
      state.selected = last;
      state.selectedAt = performance.now();
    }
    post({
      additive,
      at: performance.timeOrigin + performance.now(),
      selections: live.map((element) => ({
        ...selectionFor(element),
        path: ancestorPath(element),
      })),
      type: "select-many",
      ...(last && { node: layers.idOf(last) }),
    });
  };

  const repostSelected = (): void => {
    if (state.selected?.isConnected) postSelect(state.selected, false);
  };

  return { postHover, postSelect, postSelectMany, repostSelected };
}

function installLifecycle(context: BridgeContext): void {
  const { post, anchors, links, rects, forceState, locks } = context;
  let scrollFrame = 0;
  const onScroll = (): void => {
    anchors.schedule();
    links.schedule();
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      post({ type: "scroll" });
    });
  };
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onScroll, { passive: true });

  let paintScheduled = false;
  const schedulePainted = (): void => {
    forceState.schedule();
    rects.schedule();
    anchors.schedule();
    links.schedule();
    if (paintScheduled) return;
    paintScheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        paintScheduled = false;
        post({
          at: performance.timeOrigin + performance.now(),
          type: "painted",
        });
        const moved = locks.refresh();
        if (moved) post({ keys: moved, type: "locks" });
      });
    });
  };

  const announce = (): void => {
    reloadIfChangedDuringLoad();
    const ready: Extract<OutgoingBody, { type: "ready" }> = {
      type: "ready",
      url: window.location.href,
    };
    if (REDIRECTED_FROM) ready.redirectedFrom = REDIRECTED_FROM;
    post(ready);
    schedulePainted();
    new MutationObserver(schedulePainted).observe(document.documentElement, {
      characterData: true,
      childList: true,
      subtree: true,
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announce, { once: true });
  } else {
    announce();
  }
}

export {
  createPost,
  createSelectionPosts,
  installErrorReporting,
  installLifecycle,
};
