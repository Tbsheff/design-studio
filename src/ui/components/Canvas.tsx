import { useEffect, useRef, useState, type ComponentProps, type MutableRefObject } from 'react';
import type { ProjectKind, RenderCheckResult, SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { uiStore, useUi } from '../storage';
import { isTypingTarget, usePanZoom } from '../usePanZoom';
import { boundsOf, canAddFrame, frameName, type CanvasFrame } from '../canvasFrames';
import { passiveSrc, unionRect, useCanvasFrames, useFrameActions, useZoomInput } from '../useCanvasFrames';
import { AddFrameMenu, FrameLabel, FrameUndoBar, PassiveFrame } from './CanvasFrames';
import { ArtboardOverlay } from './ArtboardOverlay';
import { CanvasLayersPanel, LayersToggle, useLayersWatch, useSelectMoveKeys } from './CanvasLayers';
import { HTML_FRAME_SANDBOX, type PreviewPort } from '../bridge';
import { usePreviewFrames } from '../usePreviewFrames';
import { setCanvasFront, useTokenFrames } from '../tokenFrames';
import type { BuildError, FilesChange } from '../useStudioData';
import { CanvasToolbar, type CanvasSource } from './CanvasToolbar';
import { RenderCheckPanel } from './RenderCheckPanel';
import { CommentLayer } from './CommentLayer';
import type { CommentsControl } from '../useComments';
import { useCommentMode } from '../useCommentMode';

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
  running?: boolean;
  noRuns?: boolean;
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
    port.current = frames ? { post: frames.post, refreshRects: frames.refreshRects } : null;
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

function OtherFrames({ frames, active, src, sandbox, labelProps, register }: {
  frames: CanvasFrame[];
  active: CanvasFrame;
  src: string | null;
  sandbox?: string;
  labelProps: (frame: CanvasFrame) => ComponentProps<typeof FrameLabel>;
  register: (id: string, el: HTMLDivElement | null) => void;
}) {
  return frames
    .filter((f) => f.id !== active.id)
    .map((f) => <PassiveFrame key={f.id} frame={f} src={src} sandbox={sandbox} offset={active} label={labelProps(f)} register={register} />);
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

export function Canvas(props: Props) {
  const { projectId, directionId, kind, source, headVersionId } = props;
  const ui = useUi();
  const stageRef = useRef<HTMLDivElement>(null);
  const artboardRef = useRef<HTMLDivElement>(null);
  const canvasFrames = useCanvasFrames(projectId);
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

  const { baseUrl, urlError } = usePreviewUrl(projectId, directionId, source, headVersionId);

  const frames = usePreviewFrames({
    projectId,
    directionId,
    kind,
    baseUrl,
    live: source.kind === 'live',
    lastChange: props.lastChange,
    selectMode: selectMode || commentMode,
    selection: props.selection,
    setSelection: comment.guard(props.setSelection),
    onError: props.onError,
    onModeExited: () => {
      setSelectMode(false);
      comment.setOn(false);
    },
    onFrameWheel: pz.frameWheel,
    onZoomKey: (key) => zoomBy(key, 'frame'),
  });
  useTokenFrames(frames.slots, frames.elements, kind);
  useEffect(() => setCanvasFront(frames.frontToken, frames.slots.length > 1), [frames.frontToken, frames.slots.length]);
  useEffect(() => () => setCanvasFront(null, false), []);

  const live = source.kind === 'live';
  usePortSync(props.port, live ? frames : null, props.lastChange, kind);

  useSelectKey(setSelectMode);
  const layersOpen = ui.layersOpen && live;
  useLayersWatch(frames.watchTree, layersOpen, frames.frontToken);
  useSelectMoveKeys(selectMode, props.selection, frames.selectRelative);

  const sandbox = kind === 'html' ? HTML_FRAME_SANDBOX : undefined;
  const { labelProps, registerPassive, addFrameAt, undoRemove, dismissUndo } = useFrameActions(canvasFrames, pz, artboardRef);

  const capture = pz.spaceHeld || pz.panning || pz.zoomHeld;
  const stageMode = stageCursor(pz);
  const note = stageNote({ running: props.running, noRuns: props.noRuns, live, hasHead: headVersionId !== null, urlError });
  return (
    <div className="canvas">
      <CanvasToolbar
        viewport={ui.viewport}
        zoomSetting={ui.zoom}
        zoom={pz.zoom}
        onZoomTo={pz.zoomTo}
        onZoomStep={pz.zoomStep}
        onFit={pz.fit}
        selectMode={selectMode}
        onToggleSelect={() => {
          comment.setOn(false);
          setSelectMode((m) => !m);
        }}
        commentMode={comment.available ? commentMode : undefined}
        onToggleComment={comment.toggle}
        source={source}
        onSource={props.onSource}
        hasHead={headVersionId !== null}
        checking={check.checking}
        onCheck={check.run}
        addFrame={<AddFrameMenu disabled={!canAddFrame(layout)} onAdd={addFrameAt} />}
        layers={<LayersToggle open={layersOpen} disabled={!live} />}
      />
      <CheckResults projectId={projectId} check={check} />
      <div className="canvas-body">
      {layersOpen && <CanvasLayersPanel frames={frames} frameName={frameName(active)} hasSelection={props.selection.length > 0} onSelectMode={() => setSelectMode(true)} />}
      <div ref={stageRef} className={`stage ${stageMode}${pz.panning ? ' panning' : ''}`} onPointerDown={pz.onPointerDown}>
        <StageMessage note={note} urlError={urlError} />
        <div
          ref={artboardRef}
          className="artboard"
          data-frame-id={active.id}
          style={{
            width: viewport.width,
            height: viewport.height,
            visibility: note === 'empty' ? 'hidden' : undefined,
          }}
        >
          <PreviewSlots frames={frames} sandbox={sandbox} viewport={viewport} />
          <ArtboardOverlay
            hover={overlayHover(frames.hover, selectMode || commentMode)}
            selection={props.selection}
            zoom={pz.zoom}
            comments={
              comment.available && props.comments ? (
                <CommentLayer
                  control={props.comments}
                  frames={frames}
                  kind={kind}
                  zoom={pz.zoom}
                  frame={viewport}
                  commentMode={commentMode}
                  selectMode={selectMode}
                  selection={props.selection}
                  onExitCommentMode={() => comment.setOn(false)}
                />
              ) : null
            }
          />
          {layout.frames.length > 1 && <FrameLabel {...labelProps(active)} />}
          <OtherFrames frames={layout.frames} active={active} src={passiveSrc(baseUrl, kind, live ? props.lastChange : null)} sandbox={sandbox} labelProps={labelProps} register={registerPassive} />
        </div>
        {capture && <div className="capture" data-testid="pan-capture" />}
        <FrameUndoBar onUndo={undoRemove} onDismiss={dismissUndo} />
      </div>
      </div>
    </div>
  );
}
