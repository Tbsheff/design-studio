import { useCallback, useEffect, useMemo, useRef, useState, type ComponentProps, type MutableRefObject } from 'react';
import type { CompiledTokenEntry, ComponentInfo, Direction, ProjectKind, RenderCheckResult, SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { useUi } from '../storage';
import { isTypingTarget, usePanZoom } from '../usePanZoom';
import { boundsOf, frameDirection, frameName, setFramePath, withFramePath, type CanvasFrame } from '../canvasFrames';
import { unionRect, useCanvasFrames, useFrameActions, useZoomInput } from '../useCanvasFrames';
import { useDirectionFrames, type DirectionFrames } from '../useDirectionFrames';
import { FramePageMenu, FrameResizeHandles, VariationControls, type FrameVariation } from './FrameControls';
import { FrameLabel, FrameUndoBar, PassiveFrame } from './CanvasFrames';
import { ArtboardOverlay } from './ArtboardOverlay';
import { CanvasLayersPanel, EditNotice, useLayersWatch, useSelectMoveKeys } from './CanvasLayers';
import { useLayerEdits } from '../useLayerEdits';
import { useResizeHandles } from '../useResizeHandles';
import { useCanvasCommands } from '../commands/useCanvasCommands';
import { usePreviewMenu } from '../usePreviewMenu';
import { HTML_FRAME_SANDBOX, type PreviewPort } from '../bridge';
import { usePreviewFrames } from '../usePreviewFrames';
import { broadcastTheme, setCanvasFront, useCanvasTheme, useTokenFrames, type ThemeChoice } from '../tokenFrames';
import type { BuildError, FilesChange } from '../useStudioData';
import type { CanvasSource } from './CanvasToolbar';
import { CanvasChrome, useShellPane, type CanvasShell } from './CanvasChrome';
import { CommentHint } from './CanvasOverlays';
import { RenderCheckPanel } from './RenderCheckPanel';
import { CommentLayer, CommentModePill, type CommentTools } from './CommentLayer';
import type { CommentsControl } from '../useComments';
import { useCommentMode } from '../useCommentMode';
import { useCanvasDraw, type DrawTool } from '../useDrawTool';
import { DrawBar, DrawSurface } from './DrawLayer';
import { useInlineTextEdit, type TextCommitHandler } from '../useInlineTextEdit';

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
  directions?: CanvasDirections;
  shell?: CanvasShell;
}

export interface CanvasCommentTools {
  tokens?: readonly CompiledTokenEntry[];
  components?: readonly ComponentInfo[] | null;
  onSteer?: (text: string) => void;
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

function stageNote(p: { running?: boolean; noRuns?: boolean; live: boolean; hasHead: boolean; urlError: string | null }): StageNote {
  if (p.urlError || !p.live || p.hasHead) return null;
  if (p.running) return 'building';
  return p.noRuns ? 'empty' : null;
}

function StageMessage({ note, urlError }: { note: StageNote; urlError: string | null }) {
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
  return null;
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
  labelProps: (frame: CanvasFrame, directionId: string | null) => ComponentProps<typeof FrameLabel>;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  return frames
    .filter((f) => f.id !== active.id)
    .map((f) => {
      const slot = passive.slots.find((item) => item.id === f.id);
      return (
        <PassiveFrame
          key={f.id}
          frame={f}
          src={slot?.src ?? null}
          nextSrc={slot?.nextSrc ?? null}
          sandbox={sandbox}
          offset={active}
          label={labelProps(f, slot?.directionId ?? null)}
          register={register}
          frameRef={(el) => {
            if (slot) passive.elements.current[slot.token] = el;
          }}
          onNextLoad={passive.onSwapDone}
        />
      );
    });
}

function livePageUrl(baseUrl: string | null, active: CanvasFrame): string | null {
  return baseUrl ? withFramePath(baseUrl, active.path) : null;
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
}

function useFrameLabels(o: LabelInput) {
  const { projectId } = o;
  const listPages = useCallback(
    (did: string) => () => api.workTreeFiles(projectId, did).then(({ files }) => files.filter((f) => f.endsWith('.html')).sort()),
    [projectId],
  );
  return (frame: CanvasFrame, did: string | null) => {
    const variation = did ? o.directions?.variationOf(did) : undefined;
    const isActive = frame.id === o.activeId;
    const index = o.frames.layout.frames.findIndex((f) => f.id === frame.id);
    const named = did ? o.directions?.list.find((d) => d.id === did)?.name : undefined;
    return {
      ...o.baseLabel(frame),
      number: variation ? `1${variation.label.toLowerCase()}` : String(index + 1),
      title: variation ? undefined : (named ?? o.directionName ?? undefined),
      directionId: did,
      badge: variation ? { label: variation.label, title: variation.title, current: did === o.directionId } : undefined,
      extras: (
        <>
          {variation && <VariationControls variation={variation} active={isActive} element={isActive ? (o.selection[0] ?? null) : null} onMixed={() => o.setSelection(() => [])} />}
          <FramePageMenu path={frame.path ?? ''} listPages={o.kind === 'html' && did ? listPages(did) : null} onPath={(path) => o.frames.update((l) => setFramePath(l, frame.id, path))} />
        </>
      ),
    };
  };
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

function useSelectKey(setSelectMode: (update: (m: boolean) => boolean) => void) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setSelectMode((m) => !m);
      } else if (e.key === 'Escape') {
        setSelectMode(() => false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const canvasFrames = useCanvasFrames(projectId, directionId, activateOf(props.directions), knownIds(props.directions));
  const { layout, active } = canvasFrames;
  const viewport = { width: active.width, height: active.height };
  const selectionRef = useRef(props.selection);
  selectionRef.current = props.selection;
  const pz = usePanZoom({
    stageRef,
    artboardRef,
    layout: { activeId: active.id, active, bounds: boundsOf(layout.frames) },
    setting: ui.zoom,
    selectionRect: () => unionRect(selectionRef.current),
  });
  const zoomBy = useZoomInput(pz.applyZoomKey);
  const [selectMode, setSelectMode] = useState(false);
  const check = useRenderCheck(projectId, directionId);

  const comment = useCommentMode(props.comments, source.kind === 'live', setSelectMode);
  const commentMode = comment.on;
  const live = source.kind === 'live';
  const pane = useShellPane(props.shell, comment, selectMode, setSelectMode, live, ui.layersOpen);
  const { layersOpen, toggleEdit, picking } = pane;
  const draw = useCanvasDraw(comment, picking, setSelectMode);

  const { baseUrl, urlError } = usePreviewUrl(projectId, directionId, source, headVersionId);
  const liveUrl = livePageUrl(baseUrl, active);
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
      comment.setOn(false);
    },
    onFrameWheel: pz.frameWheel,
    onZoomKey: (key) => zoomBy(key, 'frame'),
    textEditAllowed,
    onTextEdit: inline.onMessage,
    onContextMenu: (at) => openMenu.current(at),
  });
  const previewMenu = usePreviewMenu({ selection: props.selection, port: props.port, selectRelative: frames.selectRelative, zoom: (key) => zoomBy(key, 'menu') });
  openMenu.current = previewMenu.onContextMenu;
  const resetInline = inline.reset;
  useEffect(() => resetInline(), [frames.frontToken, resetInline]);
  useTokenFrames(frames.slots, frames.elements, kind);
  const passive = useDirectionFrames({
    projectId,
    kind,
    frames: layout.frames,
    activeId: active.id,
    currentId: directionId,
    currentUrl: baseUrl,
    live,
    lastChange: props.lastChange,
    hold: frames.slots.length > 1,
    directions: knownList(props.directions),
  });
  const theme = useCanvasTheme();
  useEffect(() => setCanvasFront(frames.frontToken, frames.slots.length > 1), [frames.frontToken, frames.slots.length]);
  useEffect(() => () => setCanvasFront(null, false), []);

  usePortSync(props.port, live ? frames : null, props.lastChange, kind);

  useSelectKey(setSelectMode);
  useLayersWatch(frames.watchTree, layersOpen, frames.frontToken, toggleEdit);
  useSelectMoveKeys(picking, props.selection, frames.selectRelative);
  const editsEnabled = live && !props.running && directionId !== null;
  const layerEdits = useLayerEdits({ projectId, directionId, kind, enabled: editsEnabled, selectMode: picking, treeWanted: layersOpen, headVersionId, frames, selection: props.selection, setSelection: props.setSelection });
  const resize = useResizeHandles({
    projectId,
    directionId,
    selection: props.selection,
    enabled: editsEnabled && !commentMode,
    post: frames.post,
    holdSwap: frames.holdSwap,
    setSelection: props.setSelection,
    refreshRects: frames.refreshRects,
    onError: layerEdits.notify,
  });

  const darkSwitch = themeSwitch(props.darkPreview, theme);
  useCanvasCommands({ live, hasHead: headVersionId !== null, zoomBy, selectMode, setSelectMode, comment, draw, layersOpen, onLayers: toggleEdit, onSource: props.onSource, dark: darkSwitch, check });

  const sandbox = kind === 'html' ? HTML_FRAME_SANDBOX : undefined;
  const { labelProps: baseLabel, registerPassive, addFrameAt, undoRemove, dismissUndo, onResizeStart } = useFrameActions(canvasFrames, pz, artboardRef);
  const labelProps = useFrameLabels({ projectId, kind, directionId, activeId: active.id, directions: props.directions, selection: props.selection, setSelection: props.setSelection, frames: canvasFrames, baseLabel, directionName: props.shell?.directionName ?? null });


  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);
  const note = stageNote({ running: props.running, noRuns: props.noRuns, live, hasHead: headVersionId !== null, urlError });
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
        view={{ drawMode: draw.toolbarMode, onToggleDraw: draw.toggle, source, onSource: props.onSource, hasHead: headVersionId !== null, checking: check.checking, onCheck: check.run, theme: darkSwitch }}
      />
      <CheckResults projectId={projectId} check={check} />
      {previewMenu.menu}
      <div className="canvas-body">
      {layersOpen && pane.place(<CanvasLayersPanel frames={frames} edits={layerEdits} frameName={frameName(active)} hasSelection={props.selection.length > 0} onSelectMode={() => setSelectMode(true)} onClose={pane.closeLayers} />)}
      <div ref={stageRef} className={`stage ${stageMode}${pz.panning ? ' panning' : ''}`} tabIndex={-1} aria-label="Canvas" onPointerDown={pz.onPointerDown}>
        <StageMessage note={note} urlError={urlError} />
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
                selection={props.selection}
                tools={commentToolsOf(props, active.path)}
              />
            }
          />
          <FrameLabel {...labelProps(active, frameDirection(active, directionId))} />
          <FrameResizeHandles onPointerDown={(e, edge) => onResizeStart(e, active, edge)} />
          <OtherFrames frames={layout.frames} active={active} passive={passive} sandbox={sandbox} labelProps={labelProps} register={registerPassive} />
        </div>
        <CommentHint on={commentMode} />
        <DrawBar draw={draw} />
        <CommentModePill mode={comment} control={props.comments} />
        {capture && <div className="capture" data-testid="pan-capture" />}
        <FrameUndoBar onUndo={undoRemove} onDismiss={dismissUndo} />
        <EditNotice edits={layerEdits} />
      </div>
      </div>
    </div>
  );
}
