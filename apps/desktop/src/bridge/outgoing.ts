import type { BridgeMessage } from "@design-studio/actions/bridge-protocol";
import { SOURCE_LOC_ATTR } from "@design-studio/contracts";

import { appSourceFor } from "./app-source.js";
import { ancestorPath } from "./authored.js";
import type {
  BridgeContext,
  BridgeState,
  OutgoingBody,
  Post,
  SelectionPosts,
} from "./bridge-types.js";
import { reloadIfChangedDuringLoad } from "./dev-reload.js";
import { stringifyArg, tryDom } from "./dom-input.js";
import { rectOf, selectionFor, shortLabel } from "./element-info.js";
import type { LayerIndex } from "./layers.js";
import { APP_MODE, REDIRECTED_FROM } from "./session.js";
import type { BridgeSession } from "./session.js";

type ErrorBody = Extract<OutgoingBody, { type: "error" }>;

type ProtocolBody<Type extends BridgeMessage["type"]> = Omit<
  Extract<BridgeMessage, { type: Type }>,
  "ns" | "token"
>;

const createPost = (session: BridgeSession): Post => {
  const parentWindow = window.parent;

  return (body) => {
    tryDom(() => {
      const message = { ...body, ns: "studio", token: session.token };

      if (!session.port) {
        parentWindow.postMessage(message, session.parentOrigin);

        return;
      }

      session.port.postMessage(message, { transfer: [] });
    });
  };
};

const installErrorReporting = (post: Post): void => {
  let reporting = false;

  const reportError = (body: ErrorBody): void => {
    if (reporting) {
      return;
    }

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

    if (event.lineno) {
      body.line = event.lineno;
    }

    if (event.filename) {
      body.source = event.filename;
    }

    if (error instanceof Error && error.stack) {
      body.stack = error.stack;
    }

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

      if (reason instanceof Error && reason.stack) {
        body.stack = reason.stack;
      }

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
};

interface SelectionDeps {
  readonly layers: LayerIndex;
  readonly post: Post;
  readonly state: BridgeState;
}

const postHoverOf = (
  deps: SelectionDeps,
  element: Element | null,
  source?: "tree"
): void => {
  const { layers, post, state } = deps;

  if (!element) {
    post({ rect: null, source, type: "hover" });

    return;
  }

  post({
    altKey: state.isAltHeld,
    label: shortLabel(element),
    node: layers.idOf(element),
    rect: rectOf(element),
    source,
    type: "hover",
  });
};

const repostWhenSourced = async (
  state: BridgeState,
  element: Element,
  repost: () => void
): Promise<void> => {
  const source = await appSourceFor(element);

  if (source && state.selected === element) {
    repost();
  }
};

const postSelectManyOf = async (
  deps: SelectionDeps,
  elements: Element[],
  additive: boolean
): Promise<void> => {
  const { layers, post, state } = deps;

  if (APP_MODE === "next") {
    await Promise.all(elements.map((element) => appSourceFor(element)));
  }

  const live = elements.filter((element) => element.isConnected);
  const last = live.at(-1);

  if (!last && additive) {
    return;
  }

  if (last) {
    state.selected = last;
    state.selectedAt = performance.now();
  }

  post({
    additive,
    at: performance.timeOrigin + performance.now(),
    nodes: live.map((element) => layers.idOf(element)),
    selections: live.map((element) => ({
      ...selectionFor(element),
      path: ancestorPath(element),
    })),
    type: "select-many",
  });
};

const createSelectionPosts = (
  state: BridgeState,
  post: Post,
  layers: LayerIndex
): SelectionPosts => {
  const deps: SelectionDeps = { layers, post, state };

  const postHover = (element: Element | null, source?: "tree"): void => {
    postHoverOf(deps, element, source);
  };

  const postSelect: SelectionPosts["postSelect"] = (
    element,
    additive,
    point
  ) => {
    if (APP_MODE === "next" && !element.hasAttribute(SOURCE_LOC_ATTR)) {
      void repostWhenSourced(state, element, () =>
        postSelect(element, additive)
      );
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

  const postSelectMany = (
    elements: Element[],
    additive: boolean
  ): Promise<void> => postSelectManyOf(deps, elements, additive);

  const repostSelected = (): void => {
    if (state.selected?.isConnected) {
      postSelect(state.selected, false);
    }
  };

  return { postHover, postSelect, postSelectMany, repostSelected };
};

const installLifecycle = (context: BridgeContext): void => {
  const { post, anchors, links, rects, forceState, locks } = context;
  let scrollFrame = 0;

  const onScroll = (): void => {
    anchors.schedule();
    links.schedule();

    if (scrollFrame) {
      return;
    }

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

    if (paintScheduled) {
      return;
    }

    paintScheduled = true;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        paintScheduled = false;

        const painted: ProtocolBody<"painted"> = {
          at: performance.timeOrigin + performance.now(),
          type: "painted",
        };

        post(painted);
        const moved = locks.refresh();

        if (moved) {
          post({ keys: moved, type: "locks" });
        }
      });
    });
  };

  const announce = (): void => {
    reloadIfChangedDuringLoad();

    const ready: ProtocolBody<"ready"> = {
      type: "ready",
      url: window.location.href,
      ...(REDIRECTED_FROM && { redirectedFrom: REDIRECTED_FROM }),
    };

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
};

export {
  createPost,
  createSelectionPosts,
  installErrorReporting,
  installLifecycle,
};
