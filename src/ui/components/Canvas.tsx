import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import type { AttachedApp, CompiledTokenEntry, ComponentInfo, Direction, ProjectKind, RenderCheckResult, SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { markOf, withElementMark } from '../elementMark';
import { useUi } from '../storage';
import { isTypingTarget, usePanZoom } from '../usePanZoom';
import { boundsOf, canHideFrame, canvasStore, frameDirection, frameName, setFrameHidden, setFramePath, shownFrames, useCanvasLofi, withFramePath, type CanvasFrame } from '../canvasFrames';
import { useLofiFrames } from '../lofiFrames';
import { unionRect, useCanvasFrames, useFrameActions, useZoomInput } from '../useCanvasFrames';
import { useDirectionFrames, type DirectionFrames } from '../useDirectionFrames';
import { FrameMoreMenu, FramePageMenu, FrameResizeHandles, VariationControls, type FrameMenuItem, type FrameVariation } from './FrameControls';
import { FrameLabel, FrameUndoBar, StablePassiveFrame, useResetPassiveGateInFirstRender, type PassiveEntry } from './CanvasFrames';
import { ArtboardOverlay } from './ArtboardOverlay';
import { CanvasLayersPanel, EditNotice, useLayersWatch, useSelectMoveKeys } from './CanvasLayers';
import { useLayerEdits } from '../useLayerEdits';
import { useComponentInsert } from '../useComponentInsert';
import { useResizeHandles } from '../useResizeHandles';
import { useCanvasCommands } from '../commands/useCanvasCommands';
import { usePreviewMenu } from '../usePreviewMenu';
import { HTML_FRAME_SANDBOX, type PreviewPort } from '../bridge';
import { usePreviewFrames } from '../usePreviewFrames';
import { broadcastTheme, setCanvasFront, useCanvasTheme, useTokenFrames, type ThemeChoice } from '../tokenFrames';
import type { BuildError, FilesChange } from '../useStudioData';
import type { CanvasSource } from './CanvasToolbar';
import { CanvasChrome, useShellPane, type CanvasShell } from './CanvasChrome';
import { FrameSnapLayer } from './CanvasOverlays';

const CanvasRulers = lazy(() => import('./CanvasRulers'));
import { RenderCheckPanel } from './RenderCheckPanel';
import { ReviewEntry } from './ReviewEntry';
import { CommentLayer, CommentModePill, type CommentTools } from './CommentLayer';
import type { CommentsControl } from '../useComments';
import { useCommentMode } from '../useCommentMode';
import { useCanvasDraw, type DrawTool } from '../useDrawTool';
import { DrawBar, DrawSurface } from './DrawLayer';
import { useInlineTextEdit, type TextCommitHandler } from '../useInlineTextEdit';
import { useCanvasPresence } from '../useCanvasPresence';
import { useCanvasPoint } from '../useCanvasPoint';
import { McpPointBadge } from './McpPointBadge';
import { appRoutePages, useAppCanvas } from './AppCanvas';
import { usePrototype } from '../usePrototype';
import { frameStateUrl, useFrameStates, type FrameStatesRead } from '../frameStates';
import { useClickThrough } from '../useClickThrough';

interface Props {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  headVersionId: string | null;
  source: CanvasSource;
  onSource: (s: CanvasSource) => void;
  lastChange: FilesChange | null;
  selection: SelectionContext[];
  setSelection: (updater: (prev: SelectionContext[]) => SelectionContext[]) => void;
  onError: (e: Omit<BuildError, 'id' | 'ts'>) => void;
  port?: MutableRefObject<PreviewPort | null>;
  comments?: CommentsControl;
  commentTools?: CanvasCommentTools;
  running?: boolean;
  noRuns?: boolean;
  onTextCommit?: TextCommitHandler;
  darkPreview?: boolean;
  onMakeStates?: (frame: CanvasFrame) => void;
  directions?: CanvasDirections;
  shell?: CanvasShell;
  app?: AttachedApp | null;
  onFrameChange?: () => void;
}

export interface CanvasCommentTools {
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
  onSteer?: (text: string) => void;
}

function shellDirectionName(shell: CanvasShell | undefined): string | null {
  return shell?.directionName ?? null;
}

function inEditPane(shell: CanvasShell | undefined): boolean {
  return shell?.pane === 'design';
}

function hostedClose(shell: CanvasShell | undefined, close: () => void): (() => void) | undefined {
  return shell ? undefined : close;
}

function noteCommentFrame(control: CommentsControl | undefined, active: { id: string; path?: string; label?: string }): void {
  if (control) control.frameRef.current = { id: active.id, path: active.path ?? '', ...(active.label ? { label: active.label } : {}) };
}

function pageNameOf(path: string | undefined): string {
  const file = path?.split('/').pop()?.replace(/\.html?$/i, '');
  return file && file !== 'index' ? file : 'Page';
}

function commentToolsOf(props: Props, path: string | undefined): CommentTools {
  const tools = props.commentTools ?? {};
  return {
    sources: { projectId: props.projectId, directionId: props.directionId, tokens: tools.tokens, components: tools.components },
    pageName: pageNameOf(path),
    onSteer: tools.onSteer,
  };
}

export interface CanvasDirections {
  list: Direction[];
  onActivate: (directionId: string) => void;
  variationOf: (directionId: string) => FrameVariation | undefined;
}

const RECT_REFRESH_MS = [300, 1200];
const NO_VERSION_TEXT = 'No completed version yet. Switch to Live to see the current work.';

type StageNote = 'building' | 'empty' | null;

function stageNote(p: { running?: boolean; noRuns?: boolean; app?: AttachedApp | null; live: boolean; hasHead: boolean; urlError: string | null }): StageNote {
  if (p.urlError || !p.live || p.hasHead) return null;
  if (p.running) return 'building';
  return p.noRuns && !p.app ? 'empty' : null;
}

function StageMessage({ note, urlError, app }: { note: StageNote; urlError: string | null; app: ReactNode }) {
  if (urlError) return <div className="stage-message">{urlError}</div>;
  if (note === 'building')
    return (
      <div className="stage-message" role="status">
        <span className="spinner" aria-hidden="true" />
        Building the first version…
      </div>
    );
  if (note === 'empty')
    return (
      <div className="stage-message" role="status">
        No design yet. Send a prompt, or start the variations.
      </div>
    );
  return app;
}

function usePreviewUrl(projectId: string, directionId: string | null, source: CanvasSource, headVersionId: string | null) {
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const versionId = source.kind === 'version' ? source.versionId : source.kind === 'last' ? headVersionId : null;
  useEffect(() => {
    let alive = true;
    setUrlError(null);
    if (!directionId) return;
    const load =
      source.kind === 'live'
        ? api.directionPreview(projectId, directionId)
        : versionId
          ? api.versionPreview(projectId, versionId)
          : Promise.reject(new Error(NO_VERSION_TEXT));
    load
      .then(({ url }) => alive && setBaseUrl(url))
      .catch((err) => {
        if (!alive) return;
        setBaseUrl(null);
        const text = errorText(err);
        setUrlError(text === NO_VERSION_TEXT ? text : `Could not load the preview. ${text} Reload the page to try again.`);
      });
    return () => {
      alive = false;
    };
  }, [projectId, directionId, source.kind, versionId]);
  return { baseUrl, urlError };
}

function useRenderCheck(projectId: string, directionId: string | null) {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<RenderCheckResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const run = async () => {
    if (!directionId) return;
    setChecking(true);
    setError(null);
    try {
      setResults(await api.renderCheck(projectId, directionId));
    } catch (err) {
      setError(errorText(err));
      setResults(null);
    } finally {
      setChecking(false);
    }
  };
  const close = () => {
    setResults(null);
    setError(null);
  };
  return { checking, results, error, run, close };
}

function usePortSync(port: MutableRefObject<PreviewPort | null> | undefined, frames: PreviewPort | null, lastChange: FilesChange | null, kind: ProjectKind) {
  useEffect(() => {
    if (!port) return;
    port.current = frames ? { post: frames.post, refreshRects: frames.refreshRects, listen: frames.listen } : null;
  });
  useEffect(() => {
    if (!lastChange || kind !== 'react') return;
    const timers = RECT_REFRESH_MS.map((ms) => window.setTimeout(() => port?.current?.refreshRects(), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [lastChange, kind, port]);
}

interface SlotFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  onFrameLoad: (token: string) => void;
}

function PreviewSlots({ frames, sandbox, viewport }: { frames: SlotFrames; sandbox?: string; viewport: { width: number; height: number } }) {
  return frames.slots.map((slot) => (
    <iframe
      key={slot.token}
      ref={(el) => {
        frames.elements.current[slot.token] = el;
      }}
      title="Design preview"
      className={`frame ${slot.token === frames.frontToken ? 'front' : 'back'}`}
      src={slot.src}
      onLoad={() => frames.onFrameLoad(slot.token)}
      sandbox={sandbox}
      width={viewport.width}
      height={viewport.height}
    />
  ));
}

function themeSwitch(enabled: boolean | undefined, theme: ThemeChoice) {
  if (!enabled) return undefined;
  const dark = theme === 'dark';
  return { dark, onToggle: () => broadcastTheme(dark ? null : 'dark') };
}

function OtherFrames({ frames, active, passive, sandbox, labelProps, register }: {
  frames: CanvasFrame[];
  active: CanvasFrame;
  passive: DirectionFrames;
  sandbox?: string;
  labelProps: ReturnType<typeof useFrameLabels>;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  const entries = useRef(new Map<string, PassiveEntry>());
  const live = entries.current;
  live.clear();
  return frames
    .filter((f) => f.id !== active.id)
    .map((f) => {
      const slot = passive.slots.find((item) => item.id === f.id);
      const did = slot?.directionId ?? null;
      live.set(f.id, {
        frame: f,
        src: slot?.src ?? null,
        nextSrc: slot?.nextSrc ?? null,
        sandbox,
        offset: active,
        label: labelProps(f, did),
        register,
        frameRef: (el) => {
          if (slot) passive.elements.current[slot.token] = el;
        },
        onNextLoad: passive.onSwapDone,
      });
      const sig = JSON.stringify([f, slot?.src ?? null, slot?.nextSrc ?? null, slot?.token ?? null, sandbox ?? null, active.x, active.y, labelProps.sig(f, did)]);
      return <StablePassiveFrame key={f.id} id={f.id} sig={sig} entries={entries} />;
    });
}

function livePageUrl(baseUrl: string | null, active: CanvasFrame, states: FrameStatesRead): string | null {
  return baseUrl ? frameStateUrl(withFramePath(baseUrl, active.path), states, active.id) : null;
}

function knownList(directions: CanvasDirections | undefined): Direction[] | undefined {
  return directions?.list;
}

function activateOf(directions: CanvasDirections | undefined): ((id: string) => void) | undefined {
  return directions?.onActivate;
}

function knownIds(directions: CanvasDirections | undefined): string[] | undefined {
  return directions?.list.map((d) => d.id);
}

interface LabelInput {
  projectId: string;
  kind: ProjectKind;
  directionId: string | null;
  activeId: string;
  directions: CanvasDirections | undefined;
  selection: SelectionContext[];
  setSelection: Props['setSelection'];
  frames: ReturnType<typeof useCanvasFrames>;
  baseLabel: ReturnType<typeof useFrameActions>['labelProps'];
  directionName: string | null;
  frameActions?: (frame: CanvasFrame, directionId: string | null) => FrameMenuItem[];
  appPages?: (() => Promise<string[]>) | null;
}

function frameMenuItems(o: LabelInput, frame: CanvasFrame, did: string | null): FrameMenuItem[] {
  const extra = o.frameActions?.(frame, did) ?? [];
  const hide: FrameMenuItem = {
    id: 'hide',
    label: 'Hide frame',
    icon: 'eyeOff',
    run: () => o.frames.update((l) => setFrameHidden(l, frame.id, true)),
    ...(canHideFrame(o.frames.layout, frame.id) ? {} : { disabled: 'The last shown frame stays.' }),
  };
  return [...extra, hide];
}

function frameLabelSig(o: LabelInput, frame: CanvasFrame, did: string | null): string {
  const variation = did ? o.directions?.variationOf(did) : undefined;
  const items = frameMenuItems(o, frame, did).map((item) => [item.id, item.label, item.icon, item.disabled ?? '']);
  const v = variation ? [variation.label, variation.title, variation.status, variation.costText, variation.scoped, variation.error, variation.keepBlocked, variation.siblings] : null;
  const named = did ? o.directions?.list.find((d) => d.id === did)?.name : undefined;
  const index = o.frames.layout.frames.findIndex((f) => f.id === frame.id);
  return JSON.stringify([index, frame.id === o.activeId, o.frames.layout.frames.length > 1, did, did === o.directionId, named, o.directionName, o.kind, Boolean(o.appPages), v, items]);
}

function liveVariation(variation: FrameVariation, did: string, live: MutableRefObject<LabelInput>): FrameVariation {
  const now = () => live.current.directions?.variationOf(did) ?? variation;
  return { ...variation, onKeep: () => now().onKeep(), onMix: (to, element) => now().onMix(to, element) };
}

function liveMenuItems(o: LabelInput, frame: CanvasFrame, did: string | null, live: MutableRefObject<LabelInput>): FrameMenuItem[] {
  return frameMenuItems(o, frame, did).map((item) => ({ ...item, run: () => frameMenuItems(live.current, frame, did).find((cur) => cur.id === item.id)?.run() }));
}

function useFrameLabels(o: LabelInput) {
  const { projectId } = o;
  const live = useRef(o);
  live.current = o;
  const listPages = useCallback(
    (did: string) => () => api.workTreeFiles(projectId, did).then(({ files }) => files.filter((f) => f.endsWith('.html')).sort()),
    [projectId],
  );
  const pagesFor = (did: string | null): (() => Promise<string[]>) | null => {
    if (!o.appPages && !(o.kind === 'html' && did)) return null;
    return () => (live.current.appPages ?? listPages(did as string))();
  };
  const label = (frame: CanvasFrame, did: string | null) => {
    const variation = did ? o.directions?.variationOf(did) : undefined;
    const isActive = frame.id === o.activeId;
    const index = o.frames.layout.frames.findIndex((f) => f.id === frame.id);
    const named = did ? o.directions?.list.find((d) => d.id === did)?.name : undefined;
    return {
      ...o.baseLabel(frame),
      number: variation ? `1${variation.label.toLowerCase()}` : String(index + 1),
      title: variation ? undefined : (frame.label ?? named ?? o.directionName ?? undefined),
      directionId: did,
      badge: variation ? { label: variation.label, title: variation.title, current: did === o.directionId } : undefined,
      extras: (
        <>
          {variation && did && <VariationControls variation={liveVariation(variation, did, live)} active={isActive} element={isActive ? (o.selection[0] ?? null) : null} onMixed={() => live.current.setSelection(() => [])} />}
          <FramePageMenu path={frame.path ?? ''} routes={Boolean(o.appPages)} listPages={pagesFor(did)} onPath={(path) => live.current.frames.update((l) => setFramePath(l, frame.id, path))} />
          <FrameMoreMenu name={frame.label ?? frameName(frame)} items={liveMenuItems(o, frame, did, live)} />
        </>
      ),
    };
  };
  return Object.assign(label, { sig: (frame: CanvasFrame, did: string | null) => frameLabelSig(o, frame, did) });
}

function overlayHover<T extends { fromTree?: boolean }>(hover: T | null, picking: boolean): T | null {
  return picking || hover?.fromTree ? hover : null;
}

function CheckResults({ projectId, check }: { projectId: string; check: ReturnType<typeof useRenderCheck> }) {
  if (!check.results && !check.error) return null;
  return <RenderCheckPanel projectId={projectId} results={check.results} error={check.error} onClose={check.close} />;
}

function stageCursor(pz: { panning: boolean; spaceHeld: boolean; zoomHeld: boolean }): string {
  if (pz.panning) return 'grabbing';
  if (pz.spaceHeld) return 'grab';
  return pz.zoomHeld ? 'zoom-in' : '';
}

function useSelectKey(setSelectMode: (update: (m: boolean) => boolean) => void, onEscape: () => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setSelectMode((m) => !m);
      } else if (e.key === 'Escape') {
        setSelectMode(() => false);
        onEscape();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

}

function useFrameChange(key: string, onChange: (() => void) | undefined) {
  const last = useRef(key);
  const latest = useRef(onChange);
  latest.current = onChange;
  useEffect(() => {
    if (last.current === key) return;
    last.current = key;
    latest.current?.();
  }, [key]);
}

function canvasClass(editing: boolean): string {
  return editing ? 'canvas text-editing' : 'canvas';
}

type CommentLayerProps = Parameters<typeof CommentLayer>[0];

function CanvasComments(p: { comment: ReturnType<typeof useCommentMode>; control: Props['comments']; draw: DrawTool } & Omit<CommentLayerProps, 'control' | 'commentMode' | 'onExitCommentMode'>) {
  const { comment, control, draw, ...rest } = p;
  if (!comment.available || !control) return null;
  return (
    <>
      <CommentLayer {...rest} control={control} commentMode={comment.on} onExitCommentMode={() => comment.setOn(false)} />
      {draw.on && <DrawSurface draw={draw} control={control} zoom={rest.zoom} frame={rest.frame} tools={rest.tools} />}
    </>
  );
}

export function Canvas(props: Props) {
  const { projectId, directionId, kind, source, headVersionId } = props;
  const ui = useUi();
  useResetPassiveGateInFirstRender();
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const canvasFrames = useCanvasFrames(projectId, directionId, activateOf(props.directions), knownIds(props.directions));
  const { layout, active } = canvasFrames;
  const shown = shownFrames(layout);
  const viewport = { width: active.width, height: active.height };
  const selectionRef = useRef(props.selection);
  selectionRef.current = props.selection;
  const pz = usePanZoom({
    stageRef,
    artboardRef,
    layout: { activeId: active.id, active, bounds: boundsOf(shown) },
    setting: ui.zoom,
    selectionRect: () => unionRect(selectionRef.current),
  });
  const zoomBy = useZoomInput(pz.applyZoomKey);
  const [selectMode, setSelectMode] = useState(false);
  const check = useRenderCheck(projectId, directionId);

  const comment = useCommentMode(props.comments, source.kind === 'live', setSelectMode);
  noteCommentFrame(props.comments, active);
  const commentMode = comment.on;
  const live = source.kind === 'live';
  const pane = useShellPane(props.shell, comment, selectMode, setSelectMode, live, ui.layersOpen);
  const [protoOn, setProtoOn] = useState(false);
  const { layersOpen, toggleEdit } = pane;
  const picking = pane.picking || protoOn;
  const setProto = (next: boolean) => {
    setProtoOn(next);
    if (!next) return;
    comment.setOn(false);
    setSelectMode(() => false);
    if (props.shell?.pane === 'design') void props.shell.onPane('chat');
  };
  const draw = useCanvasDraw(comment, picking, setSelectMode);

  const preview = usePreviewUrl(projectId, directionId, source, headVersionId);
  const urlError = preview.urlError;
  const baseUrl = withElementMark(preview.baseUrl, markOf(knownList(props.directions), directionId));
  const frameStates = useFrameStates(projectId, Boolean(props.app));
  const liveUrl = livePageUrl(baseUrl, active, frameStates);
  const textEditAllowed = live && !props.running && !commentMode;
  const resetPreview = () => props.port?.current?.post({ type: 'preview-reset' });
  const inline = useInlineTextEdit(textEditAllowed, props.onTextCommit, resetPreview);
  const openMenu = useRef<(at: { x: number; y: number }) => void>(() => undefined);

  const frames = usePreviewFrames({
    projectId,
    directionId,
    kind,
    baseUrl: liveUrl,
    live,
    lastChange: props.lastChange,
    selectMode: picking || commentMode,
    selection: props.selection,
    setSelection: comment.guard(props.setSelection),
    onError: props.onError,
    onModeExited: () => {
      setSelectMode(false);
      setProtoOn(false);
      comment.setOn(false);
    },
    onFrameWheel: pz.frameWheel,
    onZoomKey: (key) => zoomBy(key, 'frame'),
    textEditAllowed,
    onTextEdit: inline.onMessage,
    onContextMenu: (at) => openMenu.current(at),
  });
  const resetInline = inline.reset;
  useEffect(() => resetInline(), [frames.frontToken, resetInline]);
  useTokenFrames(frames.slots, frames.elements, kind);
  const passive = useDirectionFrames({
    projectId,
    kind,
    frames: shown,
    activeId: active.id,
    currentId: directionId,
    currentUrl: baseUrl,
    live,
    lastChange: props.lastChange,
    hold: frames.slots.length > 1,
    directions: knownList(props.directions),
    frameStates,
  });
  const theme = useCanvasTheme();
  useEffect(() => setCanvasFront(frames.frontToken, frames.slots.length > 1), [frames.frontToken, frames.slots.length]);
  useEffect(() => () => setCanvasFront(null, false), []);

  usePortSync(props.port, live ? frames : null, props.lastChange, kind);

  useSelectKey(setSelectMode, () => setProtoOn(false));
  useEffect(() => {
    if (selectMode || comment.on) setProtoOn(false);
  }, [selectMode, comment.on]);
  useLayersWatch(frames.watchTree, layersOpen, frames.frontToken, toggleEdit);
  useSelectMoveKeys(picking, props.selection, frames.selectRelative);
  const editsEnabled = live && !props.running && directionId !== null;
  const layerEdits = useLayerEdits({ projectId, directionId, kind, enabled: editsEnabled, selectMode: picking, treeWanted: layersOpen, headVersionId, frames, selection: props.selection, setSelection: props.setSelection });
  useComponentInsert({ projectId, directionId, kind, enabled: editsEnabled, frames, selection: props.selection, notify: layerEdits.notify });
  const previewMenu = usePreviewMenu({ selection: props.selection, port: props.port, selectRelative: frames.selectRelative, zoom: (key) => zoomBy(key, 'menu'), edits: layerEdits, ids: { projectId, directionId } });
  openMenu.current = previewMenu.onContextMenu;
  const resize = useResizeHandles({
    projectId,
    directionId,
    selection: props.selection,
    enabled: editsEnabled && !commentMode,
    post: frames.post,
    listen: frames.listen,
    holdSwap: frames.holdSwap,
    setSelection: props.setSelection,
    refreshRects: frames.refreshRects,
    onError: layerEdits.notify,
  });

  useCanvasPresence({ projectId, directionId, activeId: active.id, liveSize: viewport, selection: props.selection, stage: () => stageRef.current });
  const pointBadge = useCanvasPoint({ projectId, frames: canvasFrames, post: frames.post, clearSelection: () => props.setSelection(() => []), zoom: (key) => zoomBy(key, 'menu') });
  const lofiList = useCanvasLofi(projectId);
  useLofiFrames(stageRef, kind, directionId, lofiList);
  const liveDirection = frameDirection(active, directionId);
  const lofiSwitch = liveDirection
    ? { on: lofiList.includes(liveDirection), onToggle: () => canvasStore.setLofi(projectId, liveDirection, !lofiList.includes(liveDirection), layout) }
    : undefined;
  const darkSwitch = themeSwitch(props.darkPreview, theme);

  const sandbox = kind === 'html' ? HTML_FRAME_SANDBOX : undefined;
  const clickThrough = useClickThrough(frames, picking);
  useFrameChange(`${active.id}|${String(liveUrl)}`, () => {
    props.setSelection((prev) => (prev.length > 0 ? [] : prev));
    props.onFrameChange?.();
  });
  const { labelProps: baseLabel, registerPassive, addFrameAt, undoRemove, dismissUndo, onResizeStart } = useFrameActions(canvasFrames, pz, artboardRef, clickThrough);
  const frameActions = (frame: CanvasFrame, did: string | null): FrameMenuItem[] => {
    const make = props.onMakeStates;
    if (!make) return [];
    const blocked = props.running ? 'A run is going.' : did !== directionId ? 'Open this direction first.' : undefined;
    return [{ id: 'states', label: 'Make states', icon: 'layers', run: () => make(frame), ...(blocked ? { disabled: blocked } : {}) }];
  };
  const labelProps = useFrameLabels({ projectId, kind, directionId, activeId: active.id, directions: props.directions, selection: props.selection, setSelection: props.setSelection, frames: canvasFrames, baseLabel, directionName: shellDirectionName(props.shell), frameActions, appPages: appRoutePages(projectId, props.app) });
  const proto = usePrototype({ projectId, kind, directionId, frames: layout.frames, shown, active, baseUrl, live, selection: props.selection, clearSelection: () => props.setSelection(() => []), sandbox, notify: layerEdits.notify, on: protoOn, preview: frames, passive });
  useCanvasCommands({ live, hasHead: headVersionId !== null, zoomBy, selectMode, setSelectMode, comment, draw, layersOpen, onLayers: toggleEdit, onSource: props.onSource, dark: darkSwitch, lofi: lofiSwitch, check, play: proto.play });
  const appCanvas = useAppCanvas({ projectId, app: props.app, listen: frames.listen, resetKey: `${active.id}|${String(liveUrl)}`, frames: canvasFrames, freeze: pz.freeze, focus: pz.zoomToActive, notify: layerEdits.notify, size: viewport });


  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);
  const note = stageNote({ running: props.running, noRuns: props.noRuns, app: props.app, live, hasHead: headVersionId !== null, urlError });
  return (
    <div className={canvasClass(inline.editing)}>
      <CanvasChrome
        shell={props.shell}
        kind={kind}
        projectId={projectId}
        directionId={directionId}
        live={live}
        ui={ui}
        zoom={pz}
        comment={comment}
        selectMode={selectMode}
        setSelectMode={setSelectMode}
        toggleEdit={toggleEdit}
        layout={layout}
        active={active}
        frames={canvasFrames}
        label={(f) => labelProps(f, frameDirection(f, directionId))}
        addFrame={addFrameAt}
        presentUrl={liveUrl}
        sandbox={sandbox}
        selection={props.selection}
        stage={() => stageRef.current}
        view={{ drawMode: draw.toolbarMode, onToggleDraw: draw.toggle, source, onSource: props.onSource, hasHead: headVersionId !== null, checking: check.checking, onCheck: check.run, theme: darkSwitch, lofi: lofiSwitch, links: proto.viewToggle }}
        proto={{ on: protoOn, set: setProto, play: proto.play }}
      />
      {appCanvas.bar}
      <CheckResults projectId={projectId} check={check} />
      <ReviewEntry projectId={projectId} directionId={directionId} frame={active} live={live} running={props.running} lastChange={props.lastChange} post={frames.post} shell={props.shell} toolKey={`${protoOn}-${comment.on}-${layersOpen}`} />
      {previewMenu.menu}
      <div className="canvas-body">
      {layersOpen && pane.place(<CanvasLayersPanel frames={frames} edits={layerEdits} frameName={frameName(active)} selection={props.selection} onSelectMode={() => setSelectMode(true)} onClose={hostedClose(props.shell, pane.closeLayers)} />)}
      <div ref={stageRef} className={`stage ${stageMode}${pz.panning ? ' panning' : ''}`} tabIndex={-1} aria-label="Canvas" onPointerDown={pz.onPointerDown}>
        <StageMessage note={note} urlError={urlError} app={appCanvas.stage} />
        <div
          ref={artboardRef}
          className="artboard"
          data-frame-id={active.id}
          data-direction-id={directionId || undefined}
          style={{
            width: viewport.width,
            height: viewport.height,
            visibility: note === 'empty' ? 'hidden' : undefined,
          }}
        >
          <PreviewSlots frames={frames} sandbox={sandbox} viewport={viewport} />
          {appCanvas.note}
          <ArtboardOverlay
            hover={overlayHover(frames.hover, picking || commentMode)}
            selection={props.selection}
            zoom={pz.zoom}
            resize={resize}
            comments={
              <CanvasComments
                comment={comment}
                draw={draw}
                control={props.comments}
                frames={frames}
                kind={kind}
                zoom={pz.zoom}
                frame={viewport}
                selectMode={picking}
                editing={inEditPane(props.shell)}
                selection={props.selection}
                tools={commentToolsOf(props, active.path)}
              />
            }
          />
          <FrameLabel {...labelProps(active, frameDirection(active, directionId))} />
          <FrameResizeHandles onPointerDown={(e, edge) => onResizeStart(e, active, edge)} />
          <OtherFrames frames={shown} active={active} passive={passive} sandbox={sandbox} labelProps={labelProps} register={registerPassive} />
          <FrameSnapLayer origin={active} />
          {proto.artboard}
        </div>
        {proto.stage}
        {ui.rulers && (
          <Suspense fallback={null}>
            <CanvasRulers artboardRef={artboardRef} origin={active} selection={unionRect(props.selection)} />
          </Suspense>
        )}
        <DrawBar draw={draw} />
        <CommentModePill mode={comment} control={props.comments} />
        {capture && <div className="capture" data-testid="pan-capture" />}
        <FrameUndoBar onUndo={undoRemove} onDismiss={dismissUndo} />
        <EditNotice edits={layerEdits} />
        <McpPointBadge badge={pointBadge} frameName={(id) => { const f = canvasFrames.layout.frames.find((item) => item.id === id); return f ? frameName(f) : id; }} />
      </div>
      </div>
    </div>
  );
}
