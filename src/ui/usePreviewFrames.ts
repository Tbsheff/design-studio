import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { AppKey, BridgeToParent, ProjectKind, SelectMove, SelectionContext, ZoomKey } from '../shared/contracts';
import { parseLayerTree, type LayerTree } from './layersTree';
import { sendTelemetry } from './api';
import { reportAppStart } from './perfTelemetry';
import { frameSrc, postToFrame, useBridge, type BridgeFrame, type ParentMessageBody } from './bridge';
import { randomToken } from './session';
import { PREVIEW_ESCAPE_EVENT } from './useEscapeStop';
import { PREVIEW_HISTORY_EVENT } from './useUndoShortcut';
import { PREVIEW_PAINTED_EVENT } from './useEditHistory';
import { textEditability } from './cssValues';
import type { BuildError, FilesChange } from './useStudioData';
import { openLayer } from './commands/registry';
import { moveRegion } from './commands/useStudioCommands';

export const PREVIEW_LAYOUT_KEY_EVENT = 'studio:preview-layout-key';
export const PREVIEW_ARRANGE_KEY_EVENT = 'studio:preview-arrange-key';

type KeyMessage = Extract<BridgeToParent, { type: 'escape' | 'history-key' | 'layout-key' | 'app-key' | 'arrange-key' }>;

const KEY_MESSAGES = new Set<BridgeToParent['type']>(['escape', 'history-key', 'layout-key', 'app-key', 'arrange-key']);

function isKeyMessage(msg: BridgeToParent): msg is KeyMessage {
  return KEY_MESSAGES.has(msg.type);
}

function forwardAppKey(id: AppKey): void {
  if (id === 'palette' || id === 'shortcuts') openLayer(id);
  else moveRegion(id === 'next-region' ? 1 : -1);
}

function forwardKeyMessage(msg: KeyMessage): void {
  if (msg.type === 'app-key') forwardAppKey(msg.id);
  else if (msg.type === 'escape') window.dispatchEvent(new CustomEvent(PREVIEW_ESCAPE_EVENT));
  else if (msg.type === 'layout-key') window.dispatchEvent(new CustomEvent(PREVIEW_LAYOUT_KEY_EVENT));
  else if (msg.type === 'arrange-key') window.dispatchEvent(new CustomEvent(PREVIEW_ARRANGE_KEY_EVENT, { detail: { key: msg.key } }));
  else if (typeof msg.redo === 'boolean') window.dispatchEvent(new CustomEvent(PREVIEW_HISTORY_EVENT, { detail: { redo: msg.redo } }));
}

interface Slot {
  token: string;
  src: string;
}

interface PendingSwap {
  token: string;
  changedAt: number;
  timer: number;
  loaded: boolean;
  due: boolean;
}

export interface HoverBox {
  rect: SelectionContext['rect'];
  label?: string;
  altKey?: boolean;
  fromTree?: boolean;
}

const TREE_REFRESH_MS = 400;

export type TextEditMessage = Extract<BridgeToParent, { type: 'text-edit' | 'text-commit' }>;

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  baseUrl: string | null;
  live: boolean;
  lastChange: FilesChange | null;
  selectMode: boolean;
  selection: SelectionContext[];
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
  onError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
  onModeExited: () => void;
  onFrameWheel: (frame: HTMLIFrameElement | null, wheel: Extract<BridgeToParent, { type: 'wheel' }>) => void;
  onZoomKey: (key: ZoomKey) => void;
  textEditAllowed?: boolean;
  onTextEdit?: (message: TextEditMessage) => void;
  onContextMenu?: (point: { x: number; y: number }) => void;
}

function pagePoint(frame: HTMLIFrameElement | null, x: number, y: number): { x: number; y: number } | null {
  if (!frame) return null;
  const rect = frame.getBoundingClientRect();
  const scale = frame.offsetWidth > 0 ? rect.width / frame.offsetWidth : 1;
  return { x: rect.left + x * scale, y: rect.top + y * scale };
}

const SWAP_FALLBACK_MS = 1500;
const LOAD_GRACE_MS = 500;
const REACT_LATENCY_WINDOW_MS = 10000;
const HMR_FALLBACK_MS = 2500;

function releaseToolbarFocus(): void {
  const active = document.activeElement;
  if (active instanceof HTMLButtonElement && active.closest('.toolbar')) active.blur();
}

type SelectMessage = Extract<BridgeToParent, { type: 'select' }>;
type SelectManyMessage = Extract<BridgeToParent, { type: 'select-many' }>;

function isSelectMessage(msg: BridgeToParent): msg is SelectMessage | SelectManyMessage {
  return msg.type === 'select' || msg.type === 'select-many';
}

export function nextSelection(prev: SelectionContext[], picked: SelectionContext, additive: boolean): SelectionContext[] {
  if (!additive) return [picked];
  const has = prev.some((s) => s.selector === picked.selector);
  return has ? prev.filter((s) => s.selector !== picked.selector) : [...prev, picked];
}

export function manySelection(prev: SelectionContext[], picked: SelectionContext[], additive: boolean): SelectionContext[] {
  if (!additive) return picked;
  const known = new Set(prev.map((s) => s.selector));
  return [...prev, ...picked.filter((s) => !known.has(s.selector))];
}

function nodeAfterSelect(msg: SelectMessage, selection: SelectionContext[]): number | null {
  if (msg.additive && selection.some((s) => s.selector === msg.selection.selector)) return null;
  return typeof msg.node === 'number' ? msg.node : null;
}

function applyRects(
  prev: SelectionContext[],
  selectors: string[],
  rects: (SelectionContext['rect'] | null)[],
): SelectionContext[] {
  return prev.map((s) => {
    const i = selectors.indexOf(s.selector);
    const r = i >= 0 ? rects[i] : undefined;
    return r ? { ...s, rect: r } : s;
  });
}

export function usePreviewFrames(o: Options) {
  const [slots, setSlots] = useState<Slot[]>([]);
  const [frontToken, setFrontToken] = useState<string | null>(null);
  const [hover, setHover] = useState<HoverBox | null>(null);
  const [tree, setTree] = useState<LayerTree | null>(null);
  const [selectedNode, setSelectedNode] = useState<number | null>(null);
  const treeWanted = useRef(false);
  const treeTimer = useRef<number | null>(null);
  const elements = useRef<Record<string, HTMLIFrameElement | null>>({});
  const pendingSwap = useRef<PendingSwap | null>(null);
  const reselectOnSwap = useRef(false);
  const pendingReact = useRef<{ changedAt: number; receivedAt: number } | null>(null);
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

  const opts = useRef(o);
  opts.current = o;

  const frameFor = useCallback(
    (slot: Slot): BridgeFrame => ({
      key: slot.token,
      token: slot.token,
      url: slot.src,
      kind: opts.current.kind,
      element: elements.current[slot.token] ?? null,
    }),
    [],
  );

  const slotsRef = useRef(slots);
  slotsRef.current = slots;
  const frontRef = useRef(frontToken);
  frontRef.current = frontToken;

  const frontFrame = useCallback((): BridgeFrame | null => {
    const slot = slotsRef.current.find((s) => s.token === frontRef.current);
    return slot ? frameFor(slot) : null;
  }, [frameFor]);

  const requestRects = useCallback(
    (frame: BridgeFrame | null) => {
      if (!frame) return;
      const selectors = opts.current.selection.map((s) => s.selector);
      postToFrame(frame, { type: 'request-rects', selectors });
    },
    [],
  );

  const syncFrame = useCallback(
    (frame: BridgeFrame) => {
      postToFrame(frame, { type: 'set-mode', mode: opts.current.selectMode ? 'select' : 'none' });
      postToFrame(frame, { type: 'text-edit-allowed', allowed: opts.current.textEditAllowed === true });
      requestRects(frame);
    },
    [requestRects],
  );

  const swapTo = useCallback(
    (token: string) => {
      frontRef.current = token;
      setFrontToken(token);
      setSlots((prev) => prev.filter((s) => s.token === token));
      setHover(null);
      const slot = slotsRef.current.find((s) => s.token === token);
      if (slot)
        window.setTimeout(() => {
          const frame = frameFor(slot);
          syncFrame(frame);
          const [only, ...rest] = opts.current.selection;
          if (reselectOnSwap.current && only && rest.length === 0) postToFrame(frame, { type: 'select-selector', selector: only.selector });
          reselectOnSwap.current = false;
          window.dispatchEvent(new Event(PREVIEW_PAINTED_EVENT));
        }, 0);
    },
    [frameFor, syncFrame],
  );

  const settleSwap = useCallback(
    (token: string) => {
      const swap = pendingSwap.current;
      if (swap?.token !== token) return;
      if (textEditing.current || dragHold.current) {
        swap.due = true;
        swap.loaded = true;
        return;
      }
      window.clearTimeout(swap.timer);
      pendingSwap.current = null;
      swapTo(token);
    },
    [swapTo],
  );

  const markSwap = useCallback(
    (token: string, flag: 'due' | 'loaded') => {
      const swap = pendingSwap.current;
      if (swap?.token !== token) return;
      swap[flag] = true;
      if (swap.due && swap.loaded) settleSwap(token);
    },
    [settleSwap],
  );

  const loadFresh = useCallback((baseUrl: string | null) => {
    if (pendingSwap.current) window.clearTimeout(pendingSwap.current.timer);
    if (hmrFallback.current !== null) window.clearTimeout(hmrFallback.current);
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
    setSlots([{ token, src: frameSrc(baseUrl, token) }]);
    setFrontToken(token);
  }, []);

  useEffect(() => loadFresh(o.baseUrl), [o.baseUrl, loadFresh]);

  const watchHmr = useCallback(
    (receivedAt: number) => {
      if (hmrFallback.current !== null) window.clearTimeout(hmrFallback.current);
      hmrFallback.current = window.setTimeout(() => {
        hmrFallback.current = null;
        const token = frontRef.current;
        if (!token || frameErrorAt.current[token] === undefined) return;
        if ((lastPaintAt.current[token] ?? 0) >= receivedAt) return;
        loadFresh(opts.current.baseUrl);
      }, HMR_FALLBACK_MS);
    },
    [loadFresh],
  );

  useEffect(() => {
    const change = o.lastChange;
    if (change === handledChange.current) return;
    handledChange.current = change;
    if (!change || !o.live || !o.baseUrl || change.directionId !== o.directionId) return;
    if (o.kind === 'react' && !change.reload) {
      pendingReact.current = { changedAt: change.changedAt, receivedAt: change.receivedAt };
      watchHmr(change.receivedAt);
      return;
    }
    if (pendingSwap.current) window.clearTimeout(pendingSwap.current.timer);
    reselectOnSwap.current = change.reload === true;
    const token = randomToken();
    const src = frameSrc(o.baseUrl, token, { v: String(change.changedAt) });
    setSlots((prev) => [...prev.filter((s) => s.token === frontRef.current), { token, src }]);
    const timer = window.setTimeout(() => markSwap(token, 'due'), SWAP_FALLBACK_MS);
    pendingSwap.current = { token, changedAt: change.changedAt, timer, loaded: false, due: false };
  }, [o.lastChange, o.live, o.baseUrl, o.directionId, o.kind, markSwap, watchHmr]);

  const onFrameLoad = useCallback(
    (token: string) => {
      if (pendingSwap.current?.token === token) window.setTimeout(() => markSwap(token, 'loaded'), LOAD_GRACE_MS);
    },
    [markSwap],
  );

  useEffect(() => {
    const f = frontFrame();
    if (f) postToFrame(f, { type: 'set-mode', mode: o.selectMode ? 'select' : 'none' });
    if (!o.selectMode) setHover(null);
  }, [o.selectMode, frontToken, frontFrame]);

  useEffect(() => {
    const f = frontFrame();
    if (!f) return;
    const allowed = o.textEditAllowed === true;
    if (!allowed) postToFrame(f, { type: 'text-edit-stop' });
    postToFrame(f, { type: 'text-edit-allowed', allowed });
  }, [o.textEditAllowed, frontToken, frontFrame]);

  const selectorKey = o.selection.map((s) => s.selector).join('\n');
  useEffect(() => {
    requestRects(frontFrame());
  }, [selectorKey, frontToken, requestRects, frontFrame]);

  useLayoutEffect(() => {
    const at = pendingSelectAt.current;
    if (at === null) return;
    pendingSelectAt.current = null;
    requestAnimationFrame(() => {
      const cur = opts.current;
      sendTelemetry({
        kind: 'select.latency',
        projectId: cur.projectId,
        directionId: cur.directionId ?? undefined,
        ms: Date.now() - at,
      });
    });
  }, [o.selection]);

  const onPainted = useCallback(
    (frame: BridgeFrame) => {
      const cur = opts.current;
      const isFront = frame.token === frontRef.current;
      const base = { projectId: cur.projectId, directionId: cur.directionId ?? undefined };
      lastPaintAt.current[frame.token] = Date.now();
      if (!openReported.current && isFront) {
        openReported.current = true;
        reportAppStart('studio');
        sendTelemetry({ ...base, kind: 'studio.open', ms: Date.now() - mountedAt.current });
      }
      const swap = pendingSwap.current;
      if (swap && swap.token === frame.token) {
        settleSwap(frame.token);
        sendTelemetry({ ...base, kind: 'preview.latency', ms: Date.now() - swap.changedAt, detail: { kind: 'html' } });
      }
      const react = pendingReact.current;
      if (!react || !isFront || cur.kind !== 'react') return;
      pendingReact.current = null;
      if (Date.now() - react.receivedAt < REACT_LATENCY_WINDOW_MS)
        sendTelemetry({ ...base, kind: 'preview.latency', ms: Date.now() - react.changedAt, detail: { kind: 'react' } });
    },
    [settleSwap],
  );

  const scheduleTree = useCallback(() => {
    if (treeTimer.current !== null) return;
    treeTimer.current = window.setTimeout(() => {
      treeTimer.current = null;
      const f = frontFrame();
      if (f && treeWanted.current) postToFrame(f, { type: 'request-tree' });
    }, TREE_REFRESH_MS);
  }, [frontFrame]);

  const watchTree = useCallback(
    (on: boolean) => {
      treeWanted.current = on;
      if (!on) return;
      const f = frontFrame();
      if (f) postToFrame(f, { type: 'request-tree' });
    },
    [frontFrame],
  );

  const onTextMessage = useCallback(
    (msg: TextEditMessage) => {
      textEditing.current = msg.type === 'text-edit' && msg.state === 'start';
      opts.current.onTextEdit?.(msg);
      const swap = pendingSwap.current;
      if (!textEditing.current && swap?.due && swap.loaded) settleSwap(swap.token);
    },
    [settleSwap],
  );

  const onSelectMessage = useCallback((msg: SelectMessage | SelectManyMessage) => {
    const cur = opts.current;
    releaseToolbarFocus();
    if (msg.type === 'select-many') {
      setSelectedNode(typeof msg.node === 'number' ? msg.node : null);
      if (msg.selections.length > 0) pendingSelectAt.current = msg.at;
      cur.setSelection((prev) => manySelection(prev, msg.selections, msg.additive));
      return;
    }
    setSelectedNode(nodeAfterSelect(msg, cur.selection));
    cur.setSelection((prev) => {
      const next = nextSelection(prev, msg.selection, msg.additive);
      if (next.includes(msg.selection)) pendingSelectAt.current = msg.at;
      return next;
    });
  }, []);

  const onFrontMessage = useCallback(
    (frame: BridgeFrame, msg: BridgeToParent) => {
      const cur = opts.current;
      for (const listener of listeners.current) listener(msg);
      if (isKeyMessage(msg)) {
        forwardKeyMessage(msg);
        return;
      }
      if (isSelectMessage(msg)) {
        onSelectMessage(msg);
        return;
      }
      switch (msg.type) {
        case 'hover':
          if (cur.selectMode || msg.source === 'tree') setHover(msg.rect ? { rect: msg.rect, label: msg.label, altKey: msg.altKey === true, fromTree: msg.source === 'tree' } : null);
          break;
        case 'tree':
          setTree(parseLayerTree(msg));
          break;
        case 'rects':
          cur.setSelection((prev) => applyRects(prev, msg.selectors, msg.rects));
          break;
        case 'scroll':
          setHover(null);
          requestRects(frame);
          break;
        case 'mode-exited':
          setHover(null);
          cur.onModeExited();
          break;
        case 'wheel':
          cur.onFrameWheel(frame.element, msg);
          break;
        case 'zoom-key':
          cur.onZoomKey(msg.key);
          break;
        case 'context-menu': {
          const at = pagePoint(frame.element, msg.x, msg.y);
          if (at) cur.onContextMenu?.(at);
          break;
        }
        case 'text-edit':
        case 'text-commit':
          onTextMessage(msg);
          break;
      }
    },
    [requestRects, onTextMessage, onSelectMessage],
  );

  const onMessage = useCallback(
    (frame: BridgeFrame, msg: BridgeToParent) => {
      const cur = opts.current;
      if (msg.type === 'ready') {
        for (const listener of listeners.current) listener(msg);
        if (treeWanted.current && frame.token === frontRef.current) postToFrame(frame, { type: 'request-tree' });
        return syncFrame(frame);
      }
      if (msg.type === 'painted') {
        if (frame.token === frontRef.current) window.dispatchEvent(new Event(PREVIEW_PAINTED_EVENT));
        if (treeWanted.current && frame.token === frontRef.current) scheduleTree();
        return onPainted(frame);
      }
      if (msg.type === 'error') {
        frameErrorAt.current[frame.token] = Date.now();
        cur.onError({ directionId: cur.directionId, source: msg.kind, message: msg.message, file: msg.source, line: msg.line });
        return;
      }
      if (frame.token === frontRef.current) onFrontMessage(frame, msg);
    },
    [onFrontMessage, onPainted, syncFrame],
  );

  useBridge(() => slotsRef.current.map(frameFor), onMessage);

  useEffect(() => () => {
    if (treeTimer.current !== null) window.clearTimeout(treeTimer.current);
  }, []);

  const clearSelection = useCallback(() => {
    const f = frontFrame();
    if (f) postToFrame(f, { type: 'clear' });
  }, [frontFrame]);

  const post = useCallback((body: ParentMessageBody) => {
    const f = frontFrame();
    if (f) postToFrame(f, body);
  }, [frontFrame]);

  const listen = useCallback((handler: (message: BridgeToParent) => void) => {
    listeners.current.add(handler);
    return () => {
      listeners.current.delete(handler);
    };
  }, []);
  const hoverNode = useCallback((id: number | null) => post({ type: 'hover-node', id }), [post]);
  const selectNode = useCallback((id: number, additive: boolean) => post({ type: 'select-node', id, additive }), [post]);
  const selectRelative = useCallback(
    (selector: string, move: SelectMove) => {
      const cur = opts.current;
      const target = cur.selection.find((s) => s.selector === selector);
      if (move === 'child' && cur.textEditAllowed && target && textEditability(target) === 'ok') frontFrame()?.element?.focus();
      post({ type: 'select-relative', selector, move });
    },
    [post, frontFrame],
  );

  const holdSwap = useCallback(
    (held: boolean, settle: boolean) => {
      dragHold.current = held;
      const swap = pendingSwap.current;
      if (held || !swap) return;
      const release = () => {
        const cur = pendingSwap.current;
        if (cur === swap && !dragHold.current && !textEditing.current && cur.due && cur.loaded) settleSwap(cur.token);
      };
      if (settle) release();
      else window.setTimeout(release, SWAP_FALLBACK_MS);
    },
    [settleSwap],
  );

  return {
    slots,
    frontToken,
    holdSwap,
    hover,
    elements,
    onFrameLoad,
    clearSelection,
    post,
    refreshRects: () => requestRects(frontFrame()),
    listen,
    tree,
    selectedNode,
    watchTree,
    hoverNode,
    selectNode,
    selectRelative,
  };
}
