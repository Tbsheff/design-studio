import type {
  AppKey,
  BridgeToParent,
  ProjectKind,
  SelectMove,
  SelectionContext,
  ZoomKey,
} from "@design-studio/contracts";
import {
  startTransition,
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";

import { sendTelemetry } from "../../api.js";
import { frameSrc, postToFrame, useBridge } from "../../platform/bridge.js";
import type { BridgeFrame, ParentMessageBody } from "../../platform/bridge.js";
import { createLiveStore } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import { randomToken } from "../../platform/session.js";
import { reportAppStart } from "../../platform/telemetry.js";
import {
  PREVIEW_ESCAPE_EVENT,
  PREVIEW_STOP_EVENT,
} from "../chat/use-escape-stop.js";
import { moveRegion, openLayer, runCommand } from "../commands/index.js";
import type { BuildError, FilesChange } from "../home/use-studio-data.js";
import { textEditability } from "../inspector/css-values.js";
import { PREVIEW_PAINTED_EVENT } from "../inspector/use-edit-history.js";
import { parseLayerTree } from "../versions-layers-tokens/layers-tree.js";
import type { LayerTree } from "../versions-layers-tokens/layers-tree.js";
import { applyRects, hoverOf, pagePoint } from "./preview-rect-model.js";
import type { HoverBox } from "./preview-rect-model.js";
import {
  isSelectMessage,
  manySelection,
  nextSelection,
  nodeAfterSelect,
} from "./preview-selection-model.js";
import type {
  SelectManyMessage,
  SelectMessage,
} from "./preview-selection-model.js";
import type { PreviewSlot } from "./preview-slot-model.js";
import { PREVIEW_HISTORY_EVENT } from "./use-undo-shortcut.js";
import { PREVIEW_TOOL_KEY_EVENT } from "./vector-tool-model.js";

const PREVIEW_LAYOUT_KEY_EVENT = "studio:preview-layout-key";
const PREVIEW_ARRANGE_KEY_EVENT = "studio:preview-arrange-key";

type KeyMessage = Extract<
  BridgeToParent,
  {
    type:
      | "escape"
      | "history-key"
      | "layout-key"
      | "app-key"
      | "arrange-key"
      | "tool-key";
  }
>;

const KEY_MESSAGES = new Set<BridgeToParent["type"]>([
  "escape",
  "history-key",
  "layout-key",
  "app-key",
  "arrange-key",
  "tool-key",
]);

const isKeyMessage = (msg: BridgeToParent): msg is KeyMessage =>
  KEY_MESSAGES.has(msg.type);

const forwardAppKey = (id: AppKey): void => {
  if (id === "ask-inline") {
    void runCommand("selection.ask-inline");
  } else if (id === "project-rail") {
    void runCommand("view.project-rail");
  } else if (id === "stop") {
    globalThis.dispatchEvent(new CustomEvent(PREVIEW_STOP_EVENT));
  } else if (id === "palette" || id === "shortcuts") {
    openLayer(id);
  } else {
    let argument: 1 | -1 = -1;

    if (id === "next-region") {
      argument = 1;
    }

    void moveRegion(argument);
  }
};

const forwardKeyMessage = (msg: KeyMessage): void => {
  if (msg.type === "app-key") {
    forwardAppKey(msg.id);
  } else if (msg.type === "escape") {
    globalThis.dispatchEvent(new CustomEvent(PREVIEW_ESCAPE_EVENT));
  } else if (msg.type === "layout-key") {
    globalThis.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));
  } else if (msg.type === "tool-key") {
    globalThis.dispatchEvent(
      new CustomEvent(PREVIEW_TOOL_KEY_EVENT, { detail: { tool: msg.tool } })
    );
  } else if (msg.type === "arrange-key") {
    globalThis.dispatchEvent(
      new CustomEvent(PREVIEW_ARRANGE_KEY_EVENT, { detail: { key: msg.key } })
    );
  } else if (typeof msg.redo === "boolean") {
    globalThis.dispatchEvent(
      new CustomEvent(PREVIEW_HISTORY_EVENT, { detail: { redo: msg.redo } })
    );
  }
};

interface PendingSwap {
  token: string;
  changedAt: number;
  timer: number;
  loaded: boolean;
  due: boolean;
}

const TREE_REFRESH_MS = 400;

type TextEditMessage = Extract<
  BridgeToParent,
  { type: "text-edit" | "text-commit" }
>;

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  baseUrl: string | null;
  live: boolean;
  lastChange: FilesChange | null;
  selectMode: boolean;
  marquee?: boolean;
  selection: SelectionContext[];
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
  onError: (event2: Omit<BuildError, "id" | "ts">) => void;
  onModeExited: () => void;
  onFrameWheel: (
    frame: HTMLIFrameElement | null,
    wheel: Extract<BridgeToParent, { type: "wheel" }>
  ) => void;
  onZoomKey: (key: ZoomKey) => void;
  textEditAllowed?: boolean;
  onTextEdit?: (message: TextEditMessage) => void;
  onContextMenu?: (point: { x: number; y: number }) => void;
}

const SWAP_FALLBACK_MS = 1500;
const LOAD_GRACE_MS = 500;
const REACT_LATENCY_WINDOW_MS = 10_000;
const HMR_FALLBACK_MS = 2500;

const releaseToolbarFocus = (): void => {
  const active = document.activeElement;

  if (active instanceof HTMLButtonElement && active.closest(".toolbar")) {
    active.blur();
  }
};

const usePreviewFrames = (options: Options) => {
  const [slots, setSlots] = useState<PreviewSlot[]>([]);
  const [frontToken, setFrontToken] = useState<string | null>(null);

  const [hover] = useState<LiveStore<HoverBox | null>>(() =>
    createLiveStore<HoverBox | null>(null)
  );

  const setHover = hover.set;

  const [picked] = useState<LiveStore<SelectionContext[] | null>>(() =>
    createLiveStore<SelectionContext[] | null>(null)
  );

  const heldRects = useRef<Extract<BridgeToParent, { type: "rects" }> | null>(
    null
  );

  const [tree, setTree] = useState<LayerTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const treeWanted = useRef(false);
  const treeTimer = useRef<number | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const pendingSwap = useRef<PendingSwap | null>(null);
  const reselectOnSwap = useRef(false);

  const pendingReact = useRef<{ changedAt: number; receivedAt: number } | null>(
    null
  );

  const pendingSelectAt = useRef<number | null>(null);
  const handledChange = useRef<FilesChange | null>(null);
  const mountedAt = useRef(Date.now());
  const openReported = useRef(false);
  const lastPaintAt = useRef<Record<string, number>>({});
  const frameErrorAt = useRef<Record<string, number>>({});
  const hmrFallback = useRef<number | null>(null);
  const listeners = useRef(new Set<(message: BridgeToParent) => void>());
  const textEditing = useRef(false);
  const dragHold = useRef(false);

  const opts = useRef(options);
  opts.current = options;

  const frameFor = useCallback(
    (slot: PreviewSlot): BridgeFrame => ({
      element: elements.current[slot.token] ?? null,
      key: slot.token,
      kind: opts.current.kind,
      token: slot.token,
      url: slot.src,
    }),
    []
  );

  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const frontRef = useRef(frontToken);
  frontRef.current = frontToken;

  const frontFrame = useCallback((): BridgeFrame | null => {
    const slot = slotsRef.current.find(
      (previewSlot) => previewSlot.token === frontRef.current
    );

    if (slot) {
      return frameFor(slot);
    }

    return null;
  }, [frameFor]);

  const requestRects = useCallback((frame: BridgeFrame | null) => {
    if (!frame) {
      return;
    }

    const selectors = opts.current.selection.map(
      (selectionContext7) => selectionContext7.selector
    );

    postToFrame(frame, { selectors, type: "request-rects" });
  }, []);

  const syncFrame = useCallback(
    (frame: BridgeFrame) => {
      let mode2: "select" | "none" = "none";

      if (opts.current.selectMode) {
        mode2 = "select";
      }

      postToFrame(frame, {
        marquee: opts.current.marquee === true,
        mode: mode2,
        type: "set-mode",
      });
      postToFrame(frame, {
        allowed: opts.current.textEditAllowed === true,
        type: "text-edit-allowed",
      });
      requestRects(frame);
    },
    [requestRects]
  );

  const swapTo = useCallback(
    (token: string) => {
      frontRef.current = token;
      setFrontToken(token);
      setSlots((prev) =>
        prev.filter((previewSlot2) => previewSlot2.token === token)
      );
      setHover(null);

      const slot = slotsRef.current.find(
        (previewSlot3) => previewSlot3.token === token
      );

      if (slot) {
        window.setTimeout(() => {
          const frame = frameFor(slot);
          syncFrame(frame);
          const [only, ...rest] = opts.current.selection;

          if (reselectOnSwap.current && only && rest.length === 0) {
            postToFrame(frame, {
              selector: only.selector,
              type: "select-selector",
            });
          }

          reselectOnSwap.current = false;
          globalThis.dispatchEvent(new Event(PREVIEW_PAINTED_EVENT));
        }, 0);
      }
    },
    [frameFor, syncFrame]
  );

  const settleSwap = useCallback(
    (token: string) => {
      const swap = pendingSwap.current;

      if (swap?.token !== token) {
        return;
      }

      if (textEditing.current || dragHold.current) {
        swap.due = true;
        swap.loaded = true;

        return;
      }

      window.clearTimeout(swap.timer);
      pendingSwap.current = null;
      swapTo(token);
    },
    [swapTo]
  );

  const markSwap = useCallback(
    (token: string, flag: "due" | "loaded") => {
      const swap = pendingSwap.current;

      if (swap?.token !== token) {
        return;
      }

      swap[flag] = true;

      if (swap.due && swap.loaded) {
        settleSwap(token);
      }
    },
    [settleSwap]
  );

  const loadFresh = useCallback((baseUrl: string | null) => {
    if (pendingSwap.current) {
      window.clearTimeout(pendingSwap.current.timer);
    }

    if (hmrFallback.current !== null) {
      window.clearTimeout(hmrFallback.current);
    }

    hmrFallback.current = null;
    pendingSwap.current = null;
    pendingReact.current = null;
    setHover(null);

    if (!baseUrl) {
      setSlots([]);
      setFrontToken(null);

      return;
    }

    const token = randomToken();
    setSlots([{ src: frameSrc(baseUrl), token }]);
    setFrontToken(token);
  }, []);

  useEffect(() => loadFresh(options.baseUrl), [options.baseUrl, loadFresh]);

  const watchHmr = useCallback(
    (receivedAt: number) => {
      if (hmrFallback.current !== null) {
        window.clearTimeout(hmrFallback.current);
      }

      hmrFallback.current = window.setTimeout(() => {
        hmrFallback.current = null;
        const token = frontRef.current;

        if (!token || frameErrorAt.current[token] === undefined) {
          return;
        }

        if ((lastPaintAt.current[token] ?? 0) >= receivedAt) {
          return;
        }

        loadFresh(opts.current.baseUrl);
      }, HMR_FALLBACK_MS);
    },
    [loadFresh]
  );

  useEffect(() => {
    const change = options.lastChange;

    if (change === handledChange.current) {
      return;
    }

    handledChange.current = change;

    if (
      !change ||
      !options.live ||
      !options.baseUrl ||
      change.directionId !== options.directionId
    ) {
      return;
    }

    if (options.kind === "react" && !change.shouldReload) {
      pendingReact.current = {
        changedAt: change.changedAt,
        receivedAt: change.receivedAt,
      };
      watchHmr(change.receivedAt);

      return;
    }

    if (pendingSwap.current) {
      window.clearTimeout(pendingSwap.current.timer);
    }

    reselectOnSwap.current = change.shouldReload === true;
    const token = randomToken();
    const src = frameSrc(options.baseUrl, { v: String(change.changedAt) });
    setSlots((prev) => [
      ...prev.filter((previewSlot4) => previewSlot4.token === frontRef.current),
      { src, token },
    ]);

    const timer = window.setTimeout(
      () => markSwap(token, "due"),
      SWAP_FALLBACK_MS
    );

    pendingSwap.current = {
      changedAt: change.changedAt,
      due: false,
      loaded: false,
      timer,
      token,
    };
  }, [
    options.lastChange,
    options.live,
    options.baseUrl,
    options.directionId,
    options.kind,
    markSwap,
    watchHmr,
  ]);

  const onFrameLoad = useCallback(
    (token: string) => {
      if (pendingSwap.current?.token === token) {
        window.setTimeout(() => markSwap(token, "loaded"), LOAD_GRACE_MS);
      }
    },
    [markSwap]
  );

  useEffect(() => {
    const frame = frontFrame();

    if (frame) {
      let mode3: "select" | "none" = "none";

      if (options.selectMode) {
        mode3 = "select";
      }

      postToFrame(frame, {
        marquee: options.marquee === true,
        mode: mode3,
        type: "set-mode",
      });
    }

    if (!options.selectMode) {
      setHover(null);
    }
  }, [options.selectMode, options.marquee, frontToken, frontFrame]);

  useEffect(() => {
    const frame2 = frontFrame();

    if (!frame2) {
      return;
    }

    const allowed = options.textEditAllowed === true;

    if (!allowed) {
      postToFrame(frame2, { type: "text-edit-stop" });
    }

    postToFrame(frame2, { allowed, type: "text-edit-allowed" });
  }, [options.textEditAllowed, frontToken, frontFrame]);

  const selectorKey = options.selection
    .map((selectionContext8) => selectionContext8.selector)
    .join("\n");

  useEffect(() => {
    requestRects(frontFrame());
  }, [selectorKey, frontToken, requestRects, frontFrame]);

  useLayoutEffect(() => picked.set(null), [options.selection, picked]);

  useLayoutEffect(() => {
    const at = pendingSelectAt.current;

    if (at === null) {
      return;
    }

    pendingSelectAt.current = null;
    requestAnimationFrame(() => {
      const cur = opts.current;
      sendTelemetry({
        directionId: cur.directionId ?? undefined,
        kind: "select.latency",
        ms: Date.now() - at,
        projectId: cur.projectId,
      });
    });
  }, [options.selection]);

  const onPainted = useCallback(
    (frame: BridgeFrame) => {
      const cur = opts.current;
      const isFront = frame.token === frontRef.current;

      const base = {
        directionId: cur.directionId ?? undefined,
        projectId: cur.projectId,
      };

      lastPaintAt.current[frame.token] = Date.now();

      if (!openReported.current && isFront) {
        openReported.current = true;
        reportAppStart("studio");
        sendTelemetry({
          ...base,
          kind: "studio.open",
          ms: Date.now() - mountedAt.current,
        });
      }

      const swap = pendingSwap.current;

      if (swap && swap.token === frame.token) {
        settleSwap(frame.token);
        sendTelemetry({
          ...base,
          detail: { kind: "html" },
          kind: "preview.latency",
          ms: Date.now() - swap.changedAt,
        });
      }

      const react = pendingReact.current;

      if (!react || !isFront || cur.kind !== "react") {
        return;
      }

      pendingReact.current = null;

      if (Date.now() - react.receivedAt < REACT_LATENCY_WINDOW_MS) {
        sendTelemetry({
          ...base,
          detail: { kind: "react" },
          kind: "preview.latency",
          ms: Date.now() - react.changedAt,
        });
      }
    },
    [settleSwap]
  );

  const scheduleTree = useCallback(() => {
    if (treeTimer.current !== null) {
      return;
    }

    treeTimer.current = window.setTimeout(() => {
      treeTimer.current = null;
      const frame3 = frontFrame();

      if (frame3 && treeWanted.current) {
        postToFrame(frame3, { type: "request-tree" });
      }
    }, TREE_REFRESH_MS);
  }, [frontFrame]);

  const watchTree = useCallback(
    (on: boolean) => {
      treeWanted.current = on;

      if (!on) {
        return;
      }

      const frame4 = frontFrame();

      if (frame4) {
        postToFrame(frame4, { type: "request-tree" });
      }
    },
    [frontFrame]
  );

  const onTextMessage = useCallback(
    (msg: TextEditMessage) => {
      textEditing.current = msg.type === "text-edit" && msg.state === "start";
      opts.current.onTextEdit?.(msg);
      const swap = pendingSwap.current;

      if (!textEditing.current && swap?.due && swap.loaded) {
        settleSwap(swap.token);
      }
    },
    [settleSwap]
  );

  const onSelectMessage = useCallback(
    (msg: SelectMessage | SelectManyMessage) => {
      const cur = opts.current;
      releaseToolbarFocus();

      if (msg.type === "select-many") {
        let argument2: number | null = null;

        if (typeof msg.node === "number") {
          argument2 = msg.node;
        }

        setSelectedNode(argument2);

        if (msg.selections.length > 0) {
          pendingSelectAt.current = msg.at;
        }

        picked.set(manySelection(cur.selection, msg.selections, msg.additive));
        startTransition(() =>
          cur.setSelection((prev) =>
            manySelection(prev, msg.selections, msg.additive)
          )
        );

        return;
      }

      setSelectedNode(nodeAfterSelect(msg, cur.selection));
      picked.set(nextSelection(cur.selection, msg.selection, msg.additive));
      startTransition(() =>
        cur.setSelection((prev) => {
          const next = nextSelection(prev, msg.selection, msg.additive);

          if (next.includes(msg.selection)) {
            pendingSelectAt.current = msg.at;
          }

          return next;
        })
      );
    },
    [picked]
  );

  const onFrontMessage = useCallback(
    (frame: BridgeFrame, msg: BridgeToParent) => {
      const cur = opts.current;

      for (const listener of listeners.current) {
        listener(msg);
      }

      if (isKeyMessage(msg)) {
        forwardKeyMessage(msg);

        return;
      }

      if (isSelectMessage(msg)) {
        onSelectMessage(msg);

        return;
      }

      switch (msg.type) {
        case "hover": {
          if (cur.selectMode || msg.source === "tree") {
            setHover(hoverOf(msg));
          }

          break;
        }

        case "tree": {
          setTree(parseLayerTree(msg));
          break;
        }

        case "rects": {
          if (dragHold.current) {
            heldRects.current = msg;
          } else {
            cur.setSelection((prev) =>
              applyRects(prev, msg.selectors, msg.rects)
            );
          }

          break;
        }

        case "scroll": {
          setHover(null);
          requestRects(frame);
          break;
        }

        case "mode-exited": {
          setHover(null);
          cur.onModeExited();
          break;
        }

        case "wheel": {
          cur.onFrameWheel(frame.element, msg);
          break;
        }

        case "zoom-key": {
          cur.onZoomKey(msg.key);
          break;
        }

        case "context-menu": {
          const at = pagePoint(frame.element, msg.x, msg.y);

          if (at) {
            cur.onContextMenu?.(at);
          }

          break;
        }

        case "text-edit":
        case "text-commit": {
          onTextMessage(msg);
          break;
        }
      }
    },
    [requestRects, onTextMessage, onSelectMessage]
  );

  const onMessage = useCallback(
    (frame: BridgeFrame, msg: BridgeToParent) => {
      const cur = opts.current;

      if (msg.type === "ready") {
        for (const listener of listeners.current) {
          listener(msg);
        }

        if (treeWanted.current && frame.token === frontRef.current) {
          postToFrame(frame, { type: "request-tree" });
        }

        return syncFrame(frame);
      }

      if (msg.type === "painted") {
        if (frame.token === frontRef.current) {
          globalThis.dispatchEvent(new Event(PREVIEW_PAINTED_EVENT));
        }

        if (treeWanted.current && frame.token === frontRef.current) {
          scheduleTree();
        }

        return onPainted(frame);
      }

      if (msg.type === "error") {
        frameErrorAt.current[frame.token] = Date.now();
        cur.onError({
          directionId: cur.directionId,
          file: msg.source ?? null,
          line: msg.line ?? null,
          message: msg.message,
          source: msg.kind,
        });

        return;
      }

      if (frame.token === frontRef.current) {
        onFrontMessage(frame, msg);
      }
    },
    [onFrontMessage, onPainted, syncFrame]
  );

  useBridge(() => slotsRef.current.map(frameFor), onMessage);

  useEffect(
    () => (): void => {
      if (treeTimer.current !== null) {
        window.clearTimeout(treeTimer.current);
      }
    },
    []
  );

  const clearSelection = useCallback(() => {
    const frame5 = frontFrame();

    if (frame5) {
      postToFrame(frame5, { type: "clear" });
    }
  }, [frontFrame]);

  const post = useCallback(
    (body: ParentMessageBody) => {
      const frame6 = frontFrame();

      if (frame6) {
        postToFrame(frame6, body);
      }
    },
    [frontFrame]
  );

  const listen = useCallback((handler: (message: BridgeToParent) => void) => {
    listeners.current.add(handler);

    return (): void => {
      listeners.current.delete(handler);
    };
  }, []);

  const hoverNode = useCallback(
    (id: number | null) => post({ id, type: "hover-node" }),
    [post]
  );

  const selectNode = useCallback(
    (id: number, additive: boolean) =>
      post({ additive, id, type: "select-node" }),
    [post]
  );

  const selectRelative = useCallback(
    (selector: string, move: SelectMove) => {
      const cur = opts.current;

      const target = cur.selection.find(
        (selectionContext9) => selectionContext9.selector === selector
      );

      if (
        move === "child" &&
        cur.textEditAllowed &&
        target &&
        textEditability(target) === "ok"
      ) {
        frontFrame()?.element?.focus();
      }

      post({ move, selector, type: "select-relative" });
    },
    [post, frontFrame]
  );

  const holdSwap = useCallback(
    (held: boolean, settle: boolean) => {
      dragHold.current = held;
      const rects = heldRects.current;

      if (!held && rects) {
        heldRects.current = null;
        opts.current.setSelection((prev) =>
          applyRects(prev, rects.selectors, rects.rects)
        );
      }

      const swap = pendingSwap.current;

      if (held || !swap) {
        return;
      }

      const release = (): void => {
        const cur = pendingSwap.current;

        if (
          cur === swap &&
          !dragHold.current &&
          !textEditing.current &&
          cur.due &&
          cur.loaded
        ) {
          settleSwap(cur.token);
        }
      };

      if (settle) {
        release();
      } else {
        window.setTimeout(release, SWAP_FALLBACK_MS);
      }
    },
    [settleSwap]
  );

  return {
    clearSelection,
    elements,
    frontToken,
    holdSwap,
    hover,
    hoverNode,
    listen,
    onFrameLoad,
    picked,
    post,
    refreshRects: () => requestRects(frontFrame()),
    selectNode,
    selectRelative,
    selectedNode,
    slots,
    tree,
    watchTree,
  };
};

export {
  PREVIEW_ARRANGE_KEY_EVENT,
  PREVIEW_LAYOUT_KEY_EVENT,
  usePreviewFrames,
};

export type { HoverBox, TextEditMessage };
