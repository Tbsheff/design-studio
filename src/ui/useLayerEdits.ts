import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { BridgeToParent, DirectEditRequest, ProjectKind, ReorderMove, SelectionContext, SourceLoc } from '../shared/contracts';
import { reorderMoveOf } from '../shared/reorder';
import { api, errorText } from './api';
import { useBridge, type BridgeFrame, type ParentMessageBody } from './bridge';
import type { LayerTree } from './layersTree';
import { isTypingTarget } from './usePanZoom';

const RESELECT_MS = 5000;
const NODE_WAIT_MS = 2000;
const NOTICE_MS = 4000;

export interface LayerFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  tree: LayerTree | null;
  selectedNode: number | null;
  post: (body: ParentMessageBody) => void;
  selectNode: (id: number, additive: boolean) => void;
}

interface Options {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  selectMode: boolean;
  treeWanted: boolean;
  frames: LayerFrames;
  selection: SelectionContext[];
}

type LayerChange = { name: string | null } | { hidden: boolean } | { move: ReorderMove };

interface Reselect {
  loc: string;
  tag: string;
  text: string;
  token: string | null;
  newFrame: boolean;
  move: boolean;
  until: number;
  fromSelector: string;
}

interface NodeTask {
  id: number;
  run: (target: SelectionContext) => void;
  until: number;
}

export interface LayerEdits {
  enabled: boolean;
  busy: boolean;
  settled: boolean;
  tree: LayerTree | null;
  notice: string | null;
  clearNotice: () => void;
  notify: (message: string) => void;
  renameNode: (id: number, name: string | null) => void;
  setNodeHidden: (id: number, hidden: boolean) => void;
  moveNode: (id: number, move: ReorderMove) => void;
  moveSelected: (move: ReorderMove) => void;
}

function locKey(loc: SourceLoc): string {
  return `${loc.file}:${loc.line}:${loc.col}`;
}

function requestFor(target: SelectionContext, source: SourceLoc, change: LayerChange): DirectEditRequest {
  const base = { source, selector: target.selector, tag: target.tag.toLowerCase() };
  if ('move' in change) return { ...base, move: change.move };
  if ('name' in change) return { ...base, name: change.name };
  return { ...base, style: { display: change.hidden ? 'none' : null } };
}

function withOverrides(tree: LayerTree | null, names: ReadonlyMap<number, string>, hidden: ReadonlyMap<number, boolean>): LayerTree | null {
  if (!tree || (names.size === 0 && hidden.size === 0)) return tree;
  return { ...tree, nodes: tree.nodes.map((n) => (names.has(n.id) || hidden.has(n.id) ? { ...n, name: names.get(n.id) ?? n.name, hidden: hidden.get(n.id) ?? n.hidden } : n)) };
}

function useNotice() {
  const [notice, setNotice] = useState<string | null>(null);
  const timer = useRef<number | null>(null);
  const clearNotice = useCallback(() => setNotice(null), []);
  const notify = useCallback((message: string) => {
    setNotice(message);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setNotice(null), NOTICE_MS);
  }, []);
  useEffect(() => () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
  }, []);
  return { notice, notify, clearNotice };
}

export function useLayerEdits(o: Options): LayerEdits {
  const live = useRef(o);
  live.current = o;
  const { notice, notify, clearNotice } = useNotice();
  const [inflight, setInflight] = useState(false);
  const busyRef = useRef(false);
  const reselect = useRef<Reselect | null>(null);
  const [reselecting, setReselecting] = useState(false);
  const nodeTask = useRef<NodeTask | null>(null);
  const [names, setNames] = useState<Map<number, string>>(() => new Map());
  const [hidden, setHidden] = useState<Map<number, boolean>>(() => new Map());
  const [treeToken, setTreeToken] = useState<string | null>(null);
  const treeFresh = treeToken !== null && treeToken === o.frames.frontToken;
  const treeFreshRef = useRef(treeFresh);
  treeFreshRef.current = treeFresh;

  useEffect(() => {
    if (o.treeWanted && o.frames.frontToken) o.frames.post({ type: 'request-tree' });
  }, [o.treeWanted, o.frames.frontToken, o.frames.post]);

  useEffect(() => {
    setNames(new Map());
    setHidden(new Map());
  }, [o.frames.tree]);

  const sendReselect = useCallback(() => {
    const pending = reselect.current;
    const cur = live.current;
    if (!pending) return;
    if (Date.now() > pending.until) {
      reselect.current = null;
      setReselecting(false);
      return;
    }
    if (pending.newFrame && cur.frames.frontToken === pending.token) return;
    cur.frames.post({ type: 'select-source', sourceLoc: pending.loc, tag: pending.tag, text: pending.move ? pending.text : '' });
  }, []);

  useEffect(() => {
    const pending = reselect.current;
    const last = o.selection.at(-1);
    if (!pending) return;
    const found = last?.source && locKey(last.source) === pending.loc && (!pending.newFrame || o.frames.frontToken !== pending.token);
    const elsewhere = last !== undefined && last.selector !== pending.fromSelector && !found;
    if (found || elsewhere || !last) {
      reselect.current = null;
      setReselecting(false);
    }
  }, [o.selection, o.frames.frontToken]);

  useEffect(sendReselect, [o.frames.frontToken, sendReselect]);

  const apply = useCallback(
    async (target: SelectionContext, change: LayerChange) => {
      const cur = live.current;
      if (!cur.enabled || !cur.directionId || busyRef.current) return;
      if (!target.source) {
        notify('This element has no source location, so it cannot be changed here.');
        return;
      }
      busyRef.current = true;
      reselect.current = null;
      setInflight(true);
      if ('hidden' in change) cur.frames.post({ type: 'preview-style', selector: target.selector, style: { display: change.hidden ? 'none' : null } });
      const token = cur.frames.frontToken;
      try {
        const result = await api.directEdit(cur.projectId, cur.directionId, requestFor(target, target.source, change));
        const move = 'move' in change;
        reselect.current = {
          loc: locKey(result.moved ?? target.source),
          tag: target.tag.toLowerCase(),
          text: target.text,
          token,
          newFrame: live.current.kind === 'html',
          move,
          until: Date.now() + RESELECT_MS,
          fromSelector: target.selector,
        };
        const pending = reselect.current;
        setReselecting(true);
        window.setTimeout(() => {
          if (reselect.current !== pending) return;
          reselect.current = null;
          setReselecting(false);
        }, RESELECT_MS);
        sendReselect();
      } catch (err) {
        if ('hidden' in change) cur.frames.post({ type: 'preview-style', selector: target.selector, style: { display: change.hidden ? null : 'none' } });
        notify(errorText(err));
      } finally {
        busyRef.current = false;
        setInflight(false);
      }
    },
    [notify, sendReselect],
  );

  const forNode = useCallback((id: number, run: (target: SelectionContext) => void) => {
    const cur = live.current;
    const last = cur.selection.at(-1);
    if (!treeFreshRef.current) {
      cur.frames.post({ type: 'request-tree' });
      return;
    }
    if (cur.frames.selectedNode === id && last && cur.selection.length === 1) {
      run(last);
      return;
    }
    nodeTask.current = { id, run, until: Date.now() + NODE_WAIT_MS };
    cur.frames.selectNode(id, false);
  }, []);

  useEffect(() => {
    const task = nodeTask.current;
    const last = o.selection.at(-1);
    if (!task || o.frames.selectedNode !== task.id || !last) return;
    nodeTask.current = null;
    if (Date.now() <= task.until) task.run(last);
  }, [o.selection, o.frames.selectedNode]);

  const movesBlocked = () => busyRef.current || reselect.current?.move === true;

  const moveSelected = useCallback(
    (move: ReorderMove) => {
      const last = live.current.selection.at(-1);
      if (!last || movesBlocked()) return;
      void apply(last, { move });
    },
    [apply],
  );

  const renameNode = useCallback(
    (id: number, name: string | null) => {
      if (name !== null) setNames((prev) => new Map(prev).set(id, name));
      forNode(id, (target) => void apply(target, { name }));
    },
    [apply, forNode],
  );

  const setNodeHidden = useCallback(
    (id: number, value: boolean) => {
      setHidden((prev) => new Map(prev).set(id, value));
      forNode(id, (target) => void apply(target, { hidden: value }));
    },
    [apply, forNode],
  );

  const moveNode = useCallback(
    (id: number, move: ReorderMove) => {
      if (movesBlocked()) return;
      forNode(id, (target) => void apply(target, { move }));
    },
    [apply, forNode],
  );

  useBridge(
    () =>
      live.current.frames.slots.map((slot): BridgeFrame => ({
        key: slot.token,
        token: slot.token,
        url: slot.src,
        kind: live.current.kind,
        element: live.current.frames.elements.current[slot.token] ?? null,
      })),
    (frame, msg: BridgeToParent) => {
      if (frame.token !== live.current.frames.frontToken) return;
      if (msg.type === 'tree') setTreeToken(frame.token);
      if (msg.type === 'painted') sendReselect();
      if (msg.type !== 'reorder-key' || (msg.move !== 'up' && msg.move !== 'down')) return;
      const last = live.current.selection.at(-1);
      if (last && last.selector === msg.selector) moveSelected(msg.move);
    },
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const move = reorderMoveOf(e);
      const cur = live.current;
      if (!move || !cur.selectMode || cur.selection.length === 0 || isTypingTarget(e.target) || document.activeElement !== document.body) return;
      e.preventDefault();
      moveSelected(move);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [moveSelected]);

  const tree = useMemo(() => withOverrides(o.frames.tree, names, hidden), [o.frames.tree, names, hidden]);
  return {
    enabled: o.enabled,
    busy: inflight || reselecting,
    settled: !inflight && !reselecting && treeFresh,
    tree,
    notice,
    clearNotice,
    notify,
    renameNode,
    setNodeHidden,
    moveNode,
    moveSelected,
  };
}
