import {
  ELEMENT_MARK_PARAM,
  SOURCE_LOC_ATTR,
  selectMoveOf,
} from "../shared/contracts.js";
import type { ParentToBridge } from "../shared/contracts.js";
import { nudgeStepOf } from "../shared/nudge.js";
import { reorderMoveOf } from "../shared/reorder.js";
import { FORCE_STATE_PARAM, fromForcedParam } from "../shared/state-styles.js";
import { structureKeyOf } from "../shared/structure-keys.js";
import {
  anchorQueries,
  createAnchorTracker,
  resolveAnchorElement,
} from "./anchor-tracker.js";
import {
  appElementBySource,
  appHydrated,
  appSourceFor,
  componentUseOf,
  primeAppSources,
} from "./app-source.js";
import { AUTHORED_MAX_BYTES, ancestorPath, authoredRules } from "./authored.js";
import type { OutgoingBody } from "./bridge-types.js";
import {
  IS_MAC,
  eventElement,
  holdTextSelection,
  isEditKey,
  isTypingElement,
  rootElementOf,
  stringifyArg,
} from "./dom-input.js";
import {
  SELECT_SETTLE_MS,
  parseLoc,
  queryElement,
  rectOf,
  selectionFor,
  selectorFor,
  shortLabel,
  sourceStrings,
  textOf,
  usedAtOf,
} from "./element-info.js";
import { createForceState, FORCED_STATES } from "./force-state.js";
import type { ForcedState } from "./force-state.js";
import { forceStateFromUrl } from "./forced-boot.js";
import { createFreeMove, nudgeBaseOf } from "./free-move.js";
import { forwardHistoryKeys } from "./history-key.js";
import { dropElement, insideTarget } from "./insert-target.js";
import { createLayerIndex, moveSelection } from "./layers.js";
import {
  PREVIEW_STYLE_KEYS,
  createLivePreview,
  createPreviewStyles,
  createThemeControl,
} from "./live-preview.js";
import { createLockSet } from "./locks.js";
import { createMarquee } from "./marquee.js";
import { createOptimistic } from "./optimistic.js";
import { createTriggerBridge } from "./play-triggers.js";
import { createLinkBridge, linkQueries } from "./play.js";
import { createRectTracker, neighborRects } from "./rect-tracker.js";
import { elementBySource } from "./reorder.js";
import {
  exposeHeadlessMatch,
  isMatchKind,
  matchingElements,
} from "./select-match.js";
import {
  APP_MODE,
  REDIRECTED_FROM,
  SELECT_RETRIES,
  SELECT_RETRY_MS,
  readSession,
} from "./session.js";
import type { BridgeSession } from "./session.js";
import { createSharePointer } from "./share-pointer.js";
import { exposeHeadlessScan, findStyles } from "./style-scan.js";
import { createTextEditor } from "./text-edit.js";
import { forwardZoomInput, reloadIfChangedDuringLoad } from "./zoom-forward.js";

function startBridge(session: BridgeSession): void {
  const parentWindow = window.parent;
  let mode: "select" | "none" = "none";
  let marqueeOn = false;
  let hoverFrame = 0;
  let pendingHover: Element | null = null;
  let lastHover: Element | null = null;
  let scrollFrame = 0;
  let reporting = false;

  const post = (body: OutgoingBody): void => {
    try {
      parentWindow.postMessage(
        { ...body, ns: "studio", token: session.token },
        session.parentOrigin
      );
    } catch {
      void 0;
    }
  };

  const reportError = (
    body: Extract<OutgoingBody, { type: "error" }>
  ): void => {
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
    reportError({
      type: "error",
      kind: "runtime",
      message: event.message || stringifyArg(error),
      stack: error instanceof Error ? error.stack : undefined,
      source: event.filename || undefined,
      line: event.lineno || undefined,
    });
  });

  window.addEventListener(
    "unhandledrejection",
    (event: PromiseRejectionEvent) => {
      const reason: unknown = event.reason;
      reportError({
        type: "error",
        kind: "unhandledrejection",
        message: stringifyArg(reason),
        stack: reason instanceof Error ? reason.stack : undefined,
      });
    }
  );

  const originalConsoleError = console.error.bind(console);
  console.error = (...args: unknown[]): void => {
    originalConsoleError(...args);
    const firstError = args.find((arg): arg is Error => arg instanceof Error);
    reportError({
      type: "error",
      kind: "console",
      message: args.map(stringifyArg).join(" "),
      stack: firstError?.stack,
    });
  };

  const layers = createLayerIndex();
  const locks = createLockSet(
    APP_MODE === "next"
      ? { prime: primeAppSources, source: appSourceFor }
      : null,
    (keys) => {
      if (keys) post({ type: "locks", keys });
      post({ type: "tree", ...layers.build(locks.ownLocked) });
    }
  );
  const hitOf = (event: Event): Element | null =>
    locks.hit(event, rootElementOf(eventElement(event)));
  let selected: Element | null = null;
  let selectedAt = -Infinity;
  let tracked: string[] = [];
  let altHeld = false;
  let lastAlt = false;

  const postHover = (element: Element | null, source?: "tree"): void => {
    if (!element) {
      post({ type: "hover", rect: null, source });
      return;
    }
    post({
      type: "hover",
      rect: rectOf(element),
      label: shortLabel(element),
      altKey: altHeld,
      node: layers.idOf(element),
      source,
    });
  };

  const flushHover = (): void => {
    hoverFrame = 0;
    const element = pendingHover;
    pendingHover = null;
    if (mode !== "select") return;
    if (element === lastHover && element && altHeld === lastAlt) return;
    lastHover = element;
    lastAlt = altHeld;
    postHover(element);
    if (element && APP_MODE === "next") void appSourceFor(element);
  };

  const onPointerMove = (event: PointerEvent): void => {
    if (
      mode !== "select" ||
      textEditor.editing() ||
      freeMove.move(event) ||
      marquee.move(event)
    )
      return;
    altHeld = event.altKey;
    pendingHover = hitOf(event);
    if (!hoverFrame) hoverFrame = window.requestAnimationFrame(flushHover);
  };

  const block = (event: Event): void => {
    if (textEditor.owns(eventElement(event))) {
      event.stopImmediatePropagation();
      return;
    }
    if (event.type === "pointerdown") textEditor.commit();
    if (mode !== "select") return;
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
  };

  const lookUpAppSource = (element: Element, additive: boolean): void => {
    if (APP_MODE !== "next" || element.hasAttribute(SOURCE_LOC_ATTR)) return;
    void appSourceFor(element).then((source) => {
      if (source && selected === element) postSelect(element, additive);
    });
  };

  const postSelect = (
    element: Element,
    additive: boolean,
    point?: { x: number; y: number }
  ): void => {
    lookUpAppSource(element, additive);
    selected = element;
    selectedAt = performance.now();
    post({
      type: "select",
      selection: { ...selectionFor(element), path: ancestorPath(element) },
      additive,
      at: performance.timeOrigin + performance.now(),
      node: layers.idOf(element),
      ...(point ? { point } : {}),
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
      selected = last;
      selectedAt = performance.now();
    }
    post({
      type: "select-many",
      selections: live.map((element) => ({
        ...selectionFor(element),
        path: ancestorPath(element),
      })),
      additive,
      at: performance.timeOrigin + performance.now(),
      ...(last ? { node: layers.idOf(last) } : {}),
    });
  };

  const marquee = createMarquee({
    enabled: () => mode === "select" && marqueeOn && !textEditor.editing(),
    locked: (element) => locks.isLocked(element),
    show: (rect) => {
      if (rect && lastHover) {
        lastHover = null;
        post({ type: "hover", rect: null });
      }
      post({ type: "marquee", rect });
    },
    pick: (elements, additive) => void postSelectMany(elements, additive),
  });

  const sharePointer = createSharePointer(post);

  const freeMove = createFreeMove({
    enabled: () => mode === "select" && !textEditor.editing(),
    selected: () => selected,
    selectorFor,
    rectOf,
    ownSource: async (element) => {
      const value =
        APP_MODE === "next"
          ? await appSourceFor(element)
          : element.getAttribute(SOURCE_LOC_ATTR);
      return {
        own: value ? parseLoc(value) : null,
        usedAt:
          APP_MODE === "next" && componentUseOf(element)?.root
            ? usedAtOf(element)
            : null,
      };
    },
    post,
    promote: (element) => postSelect(element, false),
  });

  const onPointerDown = (event: PointerEvent): void => {
    block(event);
    if (textEditor.owns(eventElement(event))) return;
    if (mode === "select" && event.button === 0) holdTextSelection(true);
    if (!freeMove.down(event, hitOf(event))) marquee.down(event, hitOf(event));
  };

  const onPointerUp = (event: PointerEvent): void => {
    holdTextSelection(false);
    if (!freeMove.up(event)) marquee.up(event);
    block(event);
  };

  const onClick = (event: MouseEvent): void => {
    if (mode !== "select" && links.onClick(event)) return;
    if (
      mode !== "select" ||
      textEditor.owns(eventElement(event)) ||
      freeMove.takeClick() ||
      marquee.takeClick()
    )
      return block(event);
    block(event);
    const element = hitOf(event);
    if (!element) return;
    postSelect(element, event.shiftKey, { x: event.clientX, y: event.clientY });
  };

  const onContextMenu = (event: MouseEvent): void => {
    block(event);
    const element = hitOf(event);
    if (mode !== "select" || !element || textEditor.owns(element)) return;
    const inSelection =
      element === selected ||
      tracked.some((selector) => queryElement(selector) === element);
    if (!inSelection) postSelect(element, false);
    post({ type: "context-menu", x: event.clientX, y: event.clientY });
  };

  const onAltChange = (event: KeyboardEvent): void => {
    if (event.key !== "Alt" || mode !== "select") return;
    altHeld = event.type === "keydown";
    if (altHeld === lastAlt || !lastHover) return;
    lastAlt = altHeld;
    postHover(lastHover);
  };

  const onDblClick = (event: MouseEvent): void => {
    const element = hitOf(event);
    const target = mode === "select" || element === selected ? element : null;
    if (textEditor.owns(element) || !textEditor.canEdit(target))
      return block(event);
    event.preventDefault();
    event.stopImmediatePropagation();
    textEditor.start(target, { x: event.clientX, y: event.clientY });
  };

  const forwardStructureKey = (event: KeyboardEvent): boolean => {
    const key = event.repeat ? null : structureKeyOf(event, IS_MAC);
    if (!key || !selected?.isConnected || isTypingElement(eventElement(event)))
      return false;
    event.preventDefault();
    event.stopPropagation();
    post({ type: "structure-key", selector: selectorFor(selected), key });
    return true;
  };

  const forwardReorderKey = (event: KeyboardEvent): boolean => {
    const reorder = reorderMoveOf(event);
    if (
      !reorder ||
      !selected?.isConnected ||
      isTypingElement(eventElement(event))
    )
      return false;
    event.preventDefault();
    event.stopPropagation();
    post({
      type: "reorder-key",
      selector: selectorFor(selected),
      move: reorder,
    });
    return true;
  };

  const postNudge = (dx: number, dy: number): boolean => {
    if (mode !== "select" || !selected?.isConnected || textEditor.editing())
      return false;
    const own = selectorFor(selected);
    const others = tracked
      .filter((selector) => selector !== own)
      .flatMap((selector) => {
        const element = queryElement(selector);
        return element?.isConnected && element !== selected
          ? [{ selector, base: nudgeBaseOf(element) }]
          : [];
      });
    post({
      type: "nudge-key",
      selector: own,
      dx,
      dy,
      base: nudgeBaseOf(selected),
      ...(others.length > 0 ? { others } : {}),
    });
    return true;
  };

  const forwardNudgeKey = (event: KeyboardEvent): boolean => {
    const step = nudgeStepOf(event);
    if (
      !step ||
      isTypingElement(eventElement(event)) ||
      !postNudge(step.dx, step.dy)
    )
      return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  const cancelMarquee = (event: KeyboardEvent): boolean => {
    if (event.key !== "Escape" || !(freeMove.cancel() || marquee.cancel()))
      return false;
    holdTextSelection(false);
    event.preventDefault();
    event.stopImmediatePropagation();
    return true;
  };

  const clearOnEscape = (event: KeyboardEvent): boolean => {
    if (
      event.key !== "Escape" ||
      event.repeat ||
      mode !== "select" ||
      tracked.length === 0
    )
      return false;
    event.preventDefault();
    event.stopImmediatePropagation();
    selected = null;
    tracked = [];
    void postSelectMany([], false);
    return true;
  };

  const onKeyDown = (event: KeyboardEvent): void => {
    if (
      textEditor.onKeyDown(event) ||
      cancelMarquee(event) ||
      clearOnEscape(event)
    )
      return;
    if (mode !== "select" && links.onKeyDown(event)) return;
    onAltChange(event);
    if (
      forwardReorderKey(event) ||
      mode !== "select" ||
      forwardStructureKey(event) ||
      forwardNudgeKey(event)
    )
      return;
    if (
      isEditKey(event) &&
      textEditor.canEdit(selected) &&
      !isTypingElement(eventElement(event))
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      textEditor.start(selected);
      return;
    }
    const move = selectMoveOf(event);
    if (
      move &&
      selected?.isConnected &&
      !isTypingElement(eventElement(event))
    ) {
      event.preventDefault();
      event.stopPropagation();
      const next = moveSelection(selected, move);
      if (next) postSelect(next, false);
      return;
    }
    if (event.key !== "Escape") return;
    mode = "none";
    lastHover = null;
    pendingHover = null;
    post({ type: "hover", rect: null });
    post({ type: "mode-exited" });
  };

  const selectFirstLayer = (): void => {
    const first = moveSelection(document.body, "child");
    if (first) postSelect(first, false);
  };

  const onScroll = (): void => {
    anchors.schedule();
    links.schedule();
    if (scrollFrame) return;
    scrollFrame = window.requestAnimationFrame(() => {
      scrollFrame = 0;
      post({ type: "scroll" });
    });
  };

  const rects = createRectTracker(post);
  const anchors = createAnchorTracker(post);
  const links = createLinkBridge(post);
  const triggers = createTriggerBridge(post);
  const livePreview = createLivePreview();
  const textEditor = createTextEditor({
    post,
    selectorFor,
    previewText: (selector, text) => livePreview.previewText(selector, text),
    onStart: (element) => {
      lastHover = null;
      pendingHover = null;
      post({ type: "hover", rect: null });
      if (selected !== element) postSelect(element, false);
    },
  });
  const optimistic = createOptimistic({
    report: (id, outcome, ms, reason) =>
      post({
        type: "optimistic-result",
        id,
        outcome,
        ms,
        ...(reason ? { reason } : {}),
      }),
    styleKeys: PREVIEW_STYLE_KEYS,
    release: (element, props, text) =>
      livePreview.release(element, props, text),
    previewing: (element) => livePreview.previewing(element),
    sourceOf: sourceStrings,
  });
  const previewStyles = createPreviewStyles();
  const themeControl = createThemeControl();
  let forcedDark = false;
  const repostSelected = (): void => {
    if (selected?.isConnected) postSelect(selected, false);
  };
  const forceState = createForceState(repostSelected);
  const onForceState = (
    message: Extract<ParentToBridge, { type: "force-state" }>
  ): void => {
    const states = (Array.isArray(message.states) ? message.states : []).filter(
      (state): state is ForcedState => FORCED_STATES.includes(state)
    );
    const selector =
      typeof message.selector === "string" && message.selector.length <= 2000
        ? message.selector
        : null;
    const dark = message.dark === true && selector !== null;
    if (dark !== forcedDark) themeControl.set(dark ? "dark" : null);
    forcedDark = dark;
    forceState.set(selector, states, dark, message.track === true);
    if (selector && !selected?.isConnected) selected = queryElement(selector);
    window.requestAnimationFrame(() =>
      window.requestAnimationFrame(repostSelected)
    );
  };
  const messageHandlers: {
    [Type in ParentToBridge["type"]]: (
      message: Extract<ParentToBridge, { type: Type }>
    ) => void;
  } = {
    "set-mode": (message) => {
      mode = message.mode === "select" ? "select" : "none";
      marqueeOn = message.marquee === true;
      lastHover = null;
      pendingHover = null;
    },
    "request-rects": (message) => {
      const selectors = (
        Array.isArray(message.selectors) ? message.selectors : []
      ).filter((selector): selector is string => typeof selector === "string");
      const last = selectors.at(-1);
      tracked = selectors;
      if (!last) selected = null;
      else if (performance.now() - selectedAt > SELECT_SETTLE_MS)
        selected = queryElement(last);
      rects.track(selectors);
    },
    clear: () => {
      lastHover = null;
      pendingHover = null;
    },
    "preview-style": (message) =>
      livePreview.previewStyle(message.selector, message.style),
    "preview-text": (message) =>
      livePreview.previewText(message.selector, message.text),
    "preview-reset": () => livePreview.reset(),
    "optimistic-apply": (message) =>
      optimistic.apply(message.id, message.patch, message.written === true),
    "optimistic-settle": (message) =>
      optimistic.settle(
        message.id,
        message.ok === true,
        message.classes,
        message.reason
      ),
    "optimistic-drop": () => optimistic.drop(),
    "tokens-preview": (message) => previewStyles.apply("tokens", message.css),
    "tweaks-preview": (message) => previewStyles.apply("tweaks", message.css),
    "lofi-preview": (message) => previewStyles.apply("lofi", message.css),
    "set-theme": (message) => themeControl.set(message.theme),
    "force-state": onForceState,
    "track-anchors": (message) => anchors.track(anchorQueries(message.anchors)),
    "track-links": (message) => links.track(message.links),
    "play-links": (message) => {
      links.play(message.links);
      triggers.set(linkQueries(message.links));
    },
    "play-run": (message) => triggers.run(message.op, message.selector),
    "play-fx": (message) => links.fx(message),
    "request-tree": () =>
      post({ type: "tree", ...layers.build(locks.ownLocked) }),
    "set-locks": (message) => locks.set(message.keys),
    "lock-node": (message) => {
      const element =
        typeof message.id === "number" ? layers.element(message.id) : null;
      if (!element) return;
      void locks.lock(element, message.locked === true).then((keys) => {
        post({ type: "locks", keys });
        post({ type: "tree", ...layers.build(locks.ownLocked) });
      });
    },
    "select-matching": (message) => {
      if (
        typeof message.requestId !== "string" ||
        typeof message.selector !== "string" ||
        !isMatchKind(message.by)
      )
        return;
      const base =
        selected?.isConnected && selectorFor(selected) === message.selector
          ? selected
          : queryElement(message.selector);
      if (!base)
        return post({
          type: "matched",
          requestId: message.requestId,
          count: 0,
          note: "Select the element again.",
        });
      const result = matchingElements(base, message.by, {
        useLoc: APP_MODE !== "next",
        skip: (element) => locks.isLocked(element),
      });
      void postSelectMany(result.elements, false);
      post({
        type: "matched",
        requestId: message.requestId,
        count: result.elements.length,
        ...(result.note ? { note: result.note } : {}),
      });
    },
    "hover-node": (message) =>
      postHover(
        typeof message.id === "number" ? layers.element(message.id) : null,
        "tree"
      ),
    "select-node": (message) => {
      const element =
        typeof message.id === "number" ? layers.element(message.id) : null;
      if (element) postSelect(element, message.additive === true);
    },
    "select-relative": (message) => {
      if (message.selector === "") return selectFirstLayer();
      const base = selected?.isConnected
        ? selected
        : typeof message.selector === "string"
          ? queryElement(message.selector)
          : null;
      if (message.move === "child" && textEditor.canEdit(base))
        return textEditor.start(base);
      const valid =
        message.move === "child" ||
        message.move === "parent" ||
        message.move === "next" ||
        message.move === "prev";
      const next = base && valid ? moveSelection(base, message.move) : null;
      if (next) postSelect(next, false);
    },
    "request-authored": (message) => {
      if (
        typeof message.requestId !== "string" ||
        typeof message.selector !== "string"
      )
        return;
      const element = queryElement(message.selector);
      const rules = element ? authoredRules(element) : [];
      post({
        type: "authored",
        requestId: message.requestId,
        rules,
        inline: element
          ? livePreview.authoredInline(element).slice(0, AUTHORED_MAX_BYTES)
          : "",
      });
    },
    "select-selector": (message) => {
      const selector = message.selector;
      if (typeof selector !== "string" || selector.length > 400) return;
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
        } else if (left > 0 && APP_MODE === "next")
          window.setTimeout(() => attempt(left - 1), SELECT_RETRY_MS);
      };
      attempt(SELECT_RETRIES);
    },
    "select-at": (message) => {
      if (typeof message.x !== "number" || typeof message.y !== "number")
        return;
      const { x, y } = message;
      const attempt = (left: number): void => {
        const element = dropElement(x, y);
        const ready = element && (APP_MODE !== "next" || appHydrated(element));
        if (element && (ready || left === 0)) postSelect(element, false);
        else if (left > 0)
          window.setTimeout(() => attempt(left - 1), SELECT_RETRY_MS);
      };
      attempt(SELECT_RETRIES);
    },
    "find-styles": (message) =>
      findStyles(message, {
        selectorOf: selectorFor,
        select: postSelect,
        reply: (requestId, result, selected) =>
          post({ type: "styles-found", requestId, result, selected }),
      }),
    "select-source": (message) => {
      const element = elementBySource(message, textOf);
      if (element) postSelect(element, false);
      else if (
        APP_MODE === "next" &&
        typeof message.sourceLoc === "string" &&
        typeof message.tag === "string"
      ) {
        void appElementBySource(message.sourceLoc, message.tag).then(
          (found) => found && postSelect(found, false)
        );
      }
    },
    "text-edit-allowed": (message) =>
      textEditor.allow(message.allowed === true),
    "text-edit-stop": () => textEditor.cancel(),
    "element-at": (message) => {
      if (
        typeof message.requestId !== "string" ||
        typeof message.x !== "number" ||
        typeof message.y !== "number"
      )
        return;
      const element = dropElement(message.x, message.y);
      if (element) postHover(element);
      post({
        type: "element-at",
        requestId: message.requestId,
        selection: element ? selectionFor(element) : null,
        inside: element ? insideTarget(element) : false,
        label: element ? shortLabel(element) : "",
      });
    },
    "describe-anchors": (message) => {
      if (typeof message.requestId !== "string") return;
      const contexts = anchorQueries(message.anchors).map((query) => {
        const found = resolveAnchorElement(query);
        return found ? selectionFor(found.element) : null;
      });
      post({ type: "anchor-contexts", requestId: message.requestId, contexts });
    },
    "move-cancel": () => {
      holdTextSelection(false);
      void freeMove.cancel();
    },
    nudge: (message) =>
      void postNudge(Number(message.dx) || 0, Number(message.dy) || 0),
    "share-pointer": (message) => sharePointer.set(message.on === true),
    "request-neighbors": (message) => {
      if (typeof message.requestId === "string")
        post({
          type: "neighbors",
          requestId: message.requestId,
          ...neighborRects(message.selector),
        });
    },
  };

  const onMessage = (event: MessageEvent): void => {
    if (event.source !== parentWindow || event.origin !== session.parentOrigin)
      return;
    const data = event.data as Partial<ParentToBridge> | null;
    if (
      !data ||
      typeof data !== "object" ||
      data.ns !== "studio" ||
      data.token !== session.token
    )
      return;
    const message = data as ParentToBridge;
    if (
      typeof message.type !== "string" ||
      !Object.hasOwn(messageHandlers, message.type)
    )
      return;
    const handler = messageHandlers[message.type] as (
      message: ParentToBridge
    ) => void;
    handler(message);
  };

  const hasFiles = (event: DragEvent): boolean =>
    Array.from(event.dataTransfer?.types ?? []).includes("Files");
  const onDragOver = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
    const element = dropElement(event.clientX, event.clientY);
    if (element) postHover(element);
  };
  const onFileDrop = (event: DragEvent): void => {
    if (!hasFiles(event)) return;
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files ?? [])
      .filter((file) => file.type.startsWith("image/"))
      .slice(0, 1);
    const element = dropElement(event.clientX, event.clientY);
    post({
      type: "file-drop",
      files,
      selection: element ? selectionFor(element) : null,
      inside: element ? insideTarget(element) : false,
      label: element ? shortLabel(element) : "",
      rect: element ? rectOf(element) : null,
    });
  };

  window.addEventListener("message", onMessage);
  triggers.install();
  window.addEventListener("dragover", onDragOver, { capture: true });
  window.addEventListener("drop", onFileDrop, { capture: true });
  window.addEventListener("pointermove", onPointerMove, {
    capture: true,
    passive: true,
  });
  window.addEventListener("pointerdown", onPointerDown, { capture: true });
  window.addEventListener("mousedown", block, { capture: true });
  window.addEventListener("pointerup", onPointerUp, { capture: true });
  window.addEventListener("pointercancel", () => holdTextSelection(false), {
    capture: true,
  });
  window.addEventListener("blur", () => holdTextSelection(false));
  window.addEventListener("mouseup", block, { capture: true });
  window.addEventListener("click", onClick, { capture: true });
  window.addEventListener("dblclick", onDblClick, { capture: true });
  window.addEventListener("auxclick", block, { capture: true });
  window.addEventListener("contextmenu", onContextMenu, { capture: true });
  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("keyup", onAltChange, { capture: true });
  window.addEventListener("scroll", onScroll, { capture: true, passive: true });
  window.addEventListener("resize", onScroll, { passive: true });
  forwardZoomInput(post);
  forwardHistoryKeys(post);

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
          type: "painted",
          at: performance.timeOrigin + performance.now(),
        });
        const moved = locks.refresh();
        if (moved) post({ type: "locks", keys: moved });
      });
    });
  };

  const announce = (): void => {
    reloadIfChangedDuringLoad();
    post({
      type: "ready",
      url: window.location.href,
      ...(REDIRECTED_FROM ? { redirectedFrom: REDIRECTED_FROM } : {}),
    });
    schedulePainted();
    new MutationObserver(schedulePainted).observe(document.documentElement, {
      subtree: true,
      childList: true,
      characterData: true,
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", announce, { once: true });
  } else {
    announce();
  }
}

function markScopedElement(): void {
  const loc = new URL(window.location.href).searchParams.get(
    ELEMENT_MARK_PARAM
  );
  if (!loc || document.getElementById("studio-element-mark")) return;
  const style = document.createElement("style");
  style.id = "studio-element-mark";
  style.textContent = `[${SOURCE_LOC_ATTR}="${CSS.escape(loc)}"]{outline:2px solid oklch(0.62 0.19 255) !important;outline-offset:4px !important;}`;
  (document.head ?? document.documentElement).appendChild(style);
}

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
  const session = readSession();
  if (session) startBridge(session);
}
