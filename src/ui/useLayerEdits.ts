import { useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import type { BridgeToParent, DirectEditRequest, ProjectKind, ReorderMove, SelectionContext, SourceLoc, StructureEditRequest, StructureKey, StructureTarget } from '../shared/contracts';
import { shortcutLabel } from '../shared/keymap';
import { STRUCTURE_KEY_IDS, structureKeyOf } from '../shared/structure-keys';
import { reorderMoveOf } from '../shared/reorder';
import { api, errorText } from './api';
import { useBridge, type BridgeFrame, type ParentMessageBody } from './bridge';
import type { LayerTree } from './layersTree';
import { IS_MAC } from './commands/keys';
import { NO_SOURCE, dropRequest, selectionTargets, type LayerDrop, type SelectionOp } from './structureEdits';
import { isTypingTarget } from './typingTarget';
import { useLayerLocks } from './useLayerLocks';

const RESELECT_MS = 5000;
const NODE_WAIT_MS = 2000;
const NOTICE_MS = 4000;
const SELECT_AGAIN = 'The element moved. Select it again.';
const HIDDEN_ELSEWHERE = 'Its CSS or a parent hides this element, so Show cannot change it here.';

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
  headVersionId: string | null;
  frames: LayerFrames;
  selection: SelectionContext[];
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
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
  setNodeLocked: (id: number, locked: boolean) => void;
  moveNode: (id: number, move: ReorderMove) => void;
  moveSelected: (move: ReorderMove) => void;
  structureKey: (key: StructureKey) => void;
  dropNode: (id: number, drop: LayerDrop) => void;
  canPaste: boolean;
}

interface CutState {
  targets: StructureTarget[];
  head: string | null;
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
  const locks = useLayerLocks(o.projectId, o.directionId, o.frames.frontToken, o.frames.post);

  useEffect(() => {
    if (o.treeWanted && o.frames.frontToken) o.frames.post({ type: 'request-tree' });
  }, [o.treeWanted, o.frames.frontToken, o.frames.post]);

  useEffect(() => {
    setNames(new Map());
    setHidden(new Map());
  }, [o.frames.tree]);

  const expire = useCallback(
    (pending: Reselect) => {
      if (reselect.current !== pending) return;
      reselect.current = null;
      setReselecting(false);
      if (!pending.move) return;
      live.current.setSelection(() => []);
      notify(SELECT_AGAIN);
    },
    [notify],
  );

  const sendReselect = useCallback(() => {
    const pending = reselect.current;
    const cur = live.current;
    if (!pending) return;
    if (Date.now() > pending.until) {
      expire(pending);
      return;
    }
    if (pending.newFrame && cur.frames.frontToken === pending.token) return;
    cur.frames.post({ type: 'select-source', sourceLoc: pending.loc, tag: pending.tag, text: pending.move ? pending.text : '' });
  }, [expire]);

  const resolveReselect = useCallback((token: string, selection: SelectionContext) => {
    const pending = reselect.current;
    if (!pending || !selection.source || locKey(selection.source) !== pending.loc) return;
    if (pending.newFrame && token === pending.token) return;
    reselect.current = null;
    setReselecting(false);
  }, []);

  useEffect(() => {
    const pending = reselect.current;
    const last = o.selection.at(-1);
    if (!pending) return;
    if (!last || last.selector !== pending.fromSelector) {
      reselect.current = null;
      setReselecting(false);
    }
  }, [o.selection]);

  useEffect(sendReselect, [o.frames.frontToken, sendReselect]);

  const beginReselect = useCallback(
    (next: Omit<Reselect, 'until' | 'newFrame'>) => {
      const pending: Reselect = { ...next, newFrame: live.current.kind === 'html', until: Date.now() + RESELECT_MS };
      reselect.current = pending;
      setReselecting(true);
      window.setTimeout(() => expire(pending), RESELECT_MS);
      sendReselect();
    },
    [expire, sendReselect],
  );

  const applyStructure = useCallback(
    async (request: StructureEditRequest) => {
      const cur = live.current;
      if (!cur.enabled || !cur.directionId || busyRef.current || reselect.current?.move) return;
      busyRef.current = true;
      reselect.current = null;
      setInflight(true);
      const token = cur.frames.frontToken;
      const head = cur.headVersionId;
      try {
        const result = await api.structureEdit(cur.projectId, cur.directionId, request);
        if (result.version.id === head) return;
        const first = result.select[0];
        if (!first) {
          live.current.setSelection(() => []);
          return;
        }
        beginReselect({ loc: locKey(first), tag: first.tag, text: '', token, move: true, fromSelector: live.current.selection.at(-1)?.selector ?? '' });
      } catch (err) {
        notify(errorText(err));
      } finally {
        busyRef.current = false;
        setInflight(false);
      }
    },
    [notify, beginReselect],
  );

  const [cut, setCut] = useState<CutState | null>(null);

  const runOp = useCallback(
    (op: SelectionOp) => {
      const targets = selectionTargets(live.current.selection);
      if (!targets) notify(NO_SOURCE);
      else void applyStructure({ op, targets });
    },
    [applyStructure, notify],
  );

  const cutSelection = useCallback(() => {
    const targets = selectionTargets(live.current.selection);
    if (!targets) return notify(NO_SOURCE);
    setCut({ targets, head: live.current.headVersionId });
    const what = targets.length === 1 ? '1 layer' : `${targets.length} layers`;
    notify(`Cut ${what}. Select a frame and press ${shortcutLabel('layer-paste', IS_MAC)} to move ${targets.length === 1 ? 'it' : 'them'} there.`);
  }, [notify]);

  const pasteInto = useCallback(() => {
    const into = selectionTargets(live.current.selection.slice(-1))?.[0];
    if (!cut) return notify(`Cut a layer first (${shortcutLabel('layer-cut', IS_MAC)}), then select where it goes.`);
    if (!into) return notify(NO_SOURCE);
    setCut(null);
    if (cut.head !== live.current.headVersionId) return notify('The design changed after the cut. Cut the layer again.');
    void applyStructure({ op: 'move', targets: cut.targets, into });
  }, [cut, applyStructure, notify]);

  const structureKey = useCallback(
    (key: StructureKey) => {
      if (key === 'cut') cutSelection();
      else if (key === 'paste') pasteInto();
      else runOp(key);
    },
    [cutSelection, pasteInto, runOp],
  );

  const dropNode = useCallback(
    (id: number, drop: LayerDrop) => {
      const request = dropRequest(live.current.frames.tree?.nodes ?? [], id, drop, live.current.selection);
      if (!request) notify(NO_SOURCE);
      else void applyStructure(request);
    },
    [applyStructure, notify],
  );

  const apply = useCallback(
    async (target: SelectionContext, change: LayerChange, nodeId: number | null = null) => {
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
      const head = cur.headVersionId;
      try {
        const result = await api.directEdit(cur.projectId, cur.directionId, requestFor(target, target.source, change));
        const move = 'move' in change;
        if (result.version.id === head) {
          if (nodeId !== null) setHidden((prev) => (prev.delete(nodeId) ? new Map(prev) : prev));
          if ('hidden' in change && !change.hidden) notify(HIDDEN_ELSEWHERE);
          return;
        }
        const moved = result.moved;
        if (moved) live.current.setSelection((prev) => prev.map((s) => (s.selector === target.selector ? { ...s, source: moved } : s)));
        beginReselect({ loc: locKey(result.moved ?? target.source), tag: target.tag.toLowerCase(), text: target.text, token, move, fromSelector: target.selector });
      } catch (err) {
        if ('hidden' in change) cur.frames.post({ type: 'preview-style', selector: target.selector, style: { display: change.hidden ? null : 'none' } });
        notify(errorText(err));
      } finally {
        busyRef.current = false;
        setInflight(false);
      }
    },
    [notify, beginReselect],
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
      forNode(id, (target) => void apply(target, { hidden: value }, id));
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
      locks.onBridge(msg);
      if (msg.type === 'tree') setTreeToken(frame.token);
      if (msg.type === 'painted') sendReselect();
      if (msg.type === 'select' && msg.selection && typeof msg.selection === 'object') resolveReselect(frame.token, msg.selection);
      if (msg.type === 'structure-key' && Object.hasOwn(STRUCTURE_KEY_IDS, msg.key) && live.current.selection.at(-1)?.selector === msg.selector) structureKeyRef.current(msg.key);
      if (msg.type !== 'reorder-key' || (msg.move !== 'up' && msg.move !== 'down')) return;
      const last = live.current.selection.at(-1);
      if (last && last.selector === msg.selector) moveSelected(msg.move);
    },
  );

  const structureKeyRef = useRef(structureKey);
  structureKeyRef.current = structureKey;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const cur = live.current;
      if (!cur.selectMode || cur.selection.length === 0 || isTypingTarget(e.target) || document.activeElement !== document.body) return;
      const move = reorderMoveOf(e);
      const structure = move || e.repeat ? null : structureKeyOf(e, IS_MAC);
      if (!move && !structure) return;
      e.preventDefault();
      if (move) moveSelected(move);
      else if (structure) structureKeyRef.current(structure);
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
    setNodeLocked: locks.setNodeLocked,
    moveNode,
    moveSelected,
    structureKey,
    dropNode,
    canPaste: cut !== null,
  };
}
