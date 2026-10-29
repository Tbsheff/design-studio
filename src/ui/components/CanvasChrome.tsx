import { useCallback, useEffect, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import type { ProjectKind, SelectionContext } from '../../shared/contracts';
import { api } from '../api';
import { canAddFrame, FRAME_PRESETS, frameName, setFrameHidden, setFramePath, type CanvasFrame, type CanvasLayout } from '../canvasFrames';
import { uiStore, type UiState } from '../storage';
import { isTypingTarget } from '../usePanZoom';
import type { LiveStore } from '../liveStore';
import type { PanelTab } from '../usePanelTab';
import { CanvasViewRow, VectorToolButtons } from './CanvasToolbar';
import { CanvasTopBar, type CanvasTool, type MenuGroup, type PresentMode } from './CanvasTopBar';
import { PresentLayer, TweakPrompt } from './CanvasOverlays';

export interface CanvasShell {
  pane: PanelTab;
  onPane: (tab: PanelTab) => void | Promise<boolean>;
  layersHost: HTMLElement | null;
  directionName: string | null;
  paneCollapsed: boolean;
  onExpandPane: () => void;
  canExport: boolean;
  onExport: () => void;
  onTweak: ((prompt: string) => void) | null;
  onShip?: (() => void) | null;
  onShareLink?: (() => void) | null;
  onAskAgent?: (text: string) => void;
}

type SetSelectMode = (update: (m: boolean) => boolean) => void;
type CommentTool = { available: boolean; on: boolean; setOn: (on: boolean) => void; toggle: () => void };

function useShellSync(shell: CanvasShell | undefined, comment: CommentTool, setSelectMode: SetSelectMode) {
  const onPane = useRef(shell?.onPane);
  onPane.current = shell?.onPane;
  const pane = shell?.pane;
  const commentRef = useRef(comment);
  commentRef.current = comment;
  const wasOn = useRef(comment.on);
  useEffect(() => {
    const before = wasOn.current;
    wasOn.current = comment.on;
    if (!comment.on || before) return;
    void Promise.resolve(onPane.current?.('comments')).then((moved) => {
      if (moved === false) commentRef.current.setOn(false);
    });
  }, [comment.on]);
  const prevPane = useRef(pane);
  useEffect(() => {
    const before = prevPane.current;
    prevPane.current = pane;
    if (before === pane) return;
    if (pane !== 'comments' && commentRef.current.on) commentRef.current.setOn(false);
    if (before === 'design') setSelectMode(() => false);
  }, [pane, setSelectMode]);
}

export function useShellPane(shell: CanvasShell | undefined, comment: CommentTool, selectMode: boolean, setSelectMode: SetSelectMode, live: boolean, layersOpenSetting: boolean) {
  useShellSync(shell, comment, setSelectMode);
  const picking = selectMode || (shell?.pane === 'design' && !comment.on);
  const editOpen = shell ? shell.pane === 'design' : layersOpenSetting;
  const hostReady = !shell || shell.layersHost !== null;
  const layersOpen = editOpen && live && hostReady;
  const toggleEdit = () => shell?.onPane(shell.pane === 'design' ? 'chat' : 'design');
  const closeLayers = () => (shell ? shell.onPane('chat') : uiStore.set({ layersOpen: false }));
  const place = (panel: ReactNode) => (shell?.layersHost ? createPortal(panel, shell.layersHost) : panel);
  return { layersOpen, picking, toggleEdit, closeLayers, place };
}

function fileNameOf(frame: CanvasFrame, kind: ProjectKind, directionName: string | null): string {
  if (kind === 'html') return (frame.path || 'index.html').replace(/\.html$/, '').replace(/^.*\//, '') || 'index';
  return directionName ?? 'Design';
}

function toolOf(pane: PanelTab | undefined, comment: boolean, select: boolean, proto: boolean): CanvasTool {
  if (proto) return 'prototype';
  if (comment) return 'comment';
  if (pane === 'design') return 'edit';
  return select ? 'select' : null;
}

function reloadFrames(stage: HTMLElement | null) {
  stage?.querySelectorAll<HTMLIFrameElement>('iframe.frame').forEach((el) => {
    const src = el.src;
    if (src) el.src = src;
  });
}

function scopeOf(selection: SelectionContext[]): string | null {
  if (selection.length > 1) return `${selection.length} elements`;
  const first = selection[0];
  return first ? `the ${first.tag}` : null;
}

interface FrameLabelInfo {
  number?: string;
  title?: string;
  badge?: { title: string };
}

interface ChromeProps {
  shell: CanvasShell | undefined;
  kind: ProjectKind;
  projectId: string;
  directionId: string | null;
  live: boolean;
  ui: UiState;
  zoom: { zoomPercent: LiveStore<number>; zoomTo: (z: number) => void; zoomStep: (d: 1 | -1) => void; fit: () => void };
  comment: CommentTool;
  selectMode: boolean;
  setSelectMode: SetSelectMode;
  toggleEdit: () => void;
  layout: CanvasLayout;
  active: CanvasFrame;
  frames: { update: (fn: (l: CanvasLayout) => CanvasLayout) => void; activate: (frame: CanvasFrame) => void };
  label: (frame: CanvasFrame) => FrameLabelInfo;
  addFrame: (size: { width: number; height: number }) => void;
  presentUrl: string | null;
  sandbox?: string;
  selection: SelectionContext[];
  stage: () => HTMLElement | null;
  view: Omit<ComponentProps<typeof CanvasViewRow>, 'viewport'>;
  proto: { on: boolean; set: (on: boolean) => void; play: () => void };
}

function useFileMenu(p: ChromeProps) {
  const [pages, setPages] = useState<string[]>([]);
  const load = () => {
    if (p.kind !== 'html' || !p.directionId) return;
    void api
      .workTreeFiles(p.projectId, p.directionId)
      .then(({ files }) => setPages(files.filter((f) => f.endsWith('.html')).sort()))
      .catch(() => setPages([]));
  };
  const current = p.active.path || 'index.html';
  const groups = (): MenuGroup[] => [
    { label: 'Pages', items: pages.map((path) => ({ id: `page-${path}`, label: path, icon: 'file' as const, checked: current === path, run: () => p.frames.update((l) => setFramePath(l, p.active.id, path)) })) },
    {
      label: 'Frames',
      items: p.layout.frames.map((f, i) => {
        const info = p.label(f);
        const show = () => {
          if (f.hidden) p.frames.update((l) => setFrameHidden(l, f.id, false));
          p.frames.activate(f);
        };
        return { id: `frame-${f.id}`, label: `${info.number ?? i + 1}  ${info.badge?.title ?? info.title ?? frameName(f)}`, meta: f.hidden ? 'Hidden' : frameName(f), checked: f.id === p.active.id, run: show };
      }),
    },
    { label: 'Add frame', items: FRAME_PRESETS.map((f) => ({ id: `add-${f.preset}`, label: f.label, icon: f.preset, disabled: !canAddFrame(p.layout), run: () => p.addFrame({ width: f.width, height: f.height }) })) },
  ];
  return { load, groups };
}

const NOOP = () => undefined;

const toggleRulers = () => uiStore.set((st) => ({ rulers: !st.rulers }));

function useRulersKey() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'KeyR' || !e.shiftKey || e.metaKey || e.ctrlKey || e.altKey || e.repeat || isTypingTarget(e.target)) return;
      if (document.querySelector('.play-layer, .present-layer')) return;
      e.preventDefault();
      toggleRulers();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);
}

function barShell(shell: CanvasShell | undefined) {
  if (!shell) return { paneCollapsed: false, onExpandPane: NOOP, canExport: false, onExport: NOOP, directionName: null, onShip: null, onShareLink: null };
  return shell;
}

export function CanvasChrome(p: ChromeProps) {
  const [present, setPresent] = useState<Exclude<PresentMode, 'new-window' | 'play'> | null>(null);
  const [tweakOpen, setTweakOpen] = useState(false);
  const closePresent = useCallback(() => setPresent(null), []);
  const closeTweak = useCallback(() => setTweakOpen(false), []);
  const file = useFileMenu(p);
  useRulersKey();
  const shell = p.shell;
  const viewOpen = p.ui.viewRowOpen || p.view.source.kind === 'version';
  const onTool = (next: Exclude<CanvasTool, null>) => {
    if (next === 'prototype') return p.proto.set(!p.proto.on);
    const leavingProto = p.proto.on;
    p.proto.set(false);
    if (next === 'edit' && leavingProto && shell?.pane === 'design') return;
    if (next === 'comment') return p.comment.toggle();
    if (next === 'edit') return p.toggleEdit();
    const editing = shell?.pane === 'design';
    p.comment.setOn(false);
    if (editing) shell?.onPane('chat');
    p.setSelectMode((m) => editing || !m);
  };
  const onPresent = (mode: PresentMode) => {
    if (mode === 'play') return p.proto.play();
    if (!p.presentUrl) return;
    if (mode === 'new-window') window.open(p.presentUrl, '_blank', 'noopener');
    else setPresent(mode);
  };
  const onTweak = shell?.onTweak ?? null;
  const bar = barShell(shell);
  return (
    <>
      <CanvasTopBar
        shapeTools={<VectorToolButtons />}
        paneCollapsed={bar.paneCollapsed}
        onExpandPane={bar.onExpandPane}
        onReload={() => reloadFrames(p.stage())}
        tweakOpen={tweakOpen}
        tweakDisabled={!onTweak || !p.live}
        onTweak={() => setTweakOpen((v) => !v)}
        fileName={fileNameOf(p.active, p.kind, bar.directionName)}
        fileMenu={file.groups}
        onFileMenuOpen={file.load}
        zoom={p.zoom.zoomPercent}
        zoomSetting={p.ui.zoom}
        onZoomTo={p.zoom.zoomTo}
        onZoomStep={p.zoom.zoomStep}
        onFit={p.zoom.fit}
        tool={toolOf(shell?.pane, p.comment.on, p.selectMode, p.proto.on)}
        commentAvailable={p.comment.available}
        onTool={onTool}
        viewOpen={viewOpen}
        onToggleView={() => uiStore.set((st) => ({ viewRowOpen: !st.viewRowOpen }))}
        onPresent={onPresent}
        presentDisabled={!p.presentUrl}
        canExport={bar.canExport}
        onExport={bar.onExport}
        onShip={bar.onShip ?? null}
        onShareLink={bar.onShareLink ?? null}
      />
      {tweakOpen && onTweak && <TweakPrompt scope={scopeOf(p.selection)} onSend={onTweak} onClose={closeTweak} />}
      {viewOpen && <CanvasViewRow viewport={p.ui.viewport} {...p.view} rulers={{ on: p.ui.rulers, onToggle: toggleRulers }} />}
      {present && p.presentUrl && <PresentLayer url={p.presentUrl} sandbox={p.sandbox} fullscreen={present === 'fullscreen'} onClose={closePresent} />}
    </>
  );
}
