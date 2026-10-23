import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import type { ProjectKind, RenderCheckResult, SelectionContext } from '../../shared/contracts';
import { api, errorText } from '../api';
import { useUi } from '../storage';
import { isTypingTarget, usePanZoom } from '../usePanZoom';
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

export function Canvas(props: Props) {
  const { projectId, directionId, kind, source, headVersionId } = props;
  const ui = useUi();
  const { viewport } = ui;
  const stageRef = useRef<HTMLDivElement>(null);
  const pz = usePanZoom(stageRef, viewport.width, viewport.height, ui.zoom);
  const [selectMode, setSelectMode] = useState(false);
  const [baseUrl, setBaseUrl] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkResults, setCheckResults] = useState<RenderCheckResult[] | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  const comment = useCommentMode(props.comments, source.kind === 'live', setSelectMode);
  const commentMode = comment.on;

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
    onZoomKey: pz.applyZoomKey,
  });
  useTokenFrames(frames.slots, frames.elements, kind);
  useEffect(() => setCanvasFront(frames.frontToken, frames.slots.length > 1), [frames.frontToken, frames.slots.length]);
  useEffect(() => () => setCanvasFront(null, false), []);

  const live = source.kind === 'live';
  const port = props.port;
  useEffect(() => {
    if (!port) return;
    port.current = live ? { post: frames.post, refreshRects: frames.refreshRects } : null;
  });

  useEffect(() => {
    if (!props.lastChange || kind !== 'react') return;
    const timers = RECT_REFRESH_MS.map((ms) => window.setTimeout(() => port?.current?.refreshRects(), ms));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [props.lastChange, kind, port]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        setSelectMode((m) => !m);
      } else if (e.key === 'Escape') {
        setSelectMode(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const runCheck = async () => {
    if (!directionId) return;
    setChecking(true);
    setCheckError(null);
    try {
      setCheckResults(await api.renderCheck(projectId, directionId));
    } catch (err) {
      setCheckError(errorText(err));
      setCheckResults(null);
    } finally {
      setChecking(false);
    }
  };

  const sandbox = kind === 'html' ? HTML_FRAME_SANDBOX : undefined;
  const stroke = 1 / pz.zoom;
  const capture = pz.spaceHeld || pz.panning;
  const note = stageNote({ running: props.running, noRuns: props.noRuns, live, hasHead: headVersionId !== null, urlError });
  return (
    <div className="canvas">
      <CanvasToolbar
        viewport={viewport}
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
        checking={checking}
        onCheck={runCheck}
      />
      {(checkResults || checkError) && (
        <RenderCheckPanel
          projectId={projectId}
          results={checkResults}
          error={checkError}
          onClose={() => {
            setCheckResults(null);
            setCheckError(null);
          }}
        />
      )}
      <div
        ref={stageRef}
        className={`stage ${capture ? (pz.panning ? 'grabbing' : 'grab') : ''}`}
        onPointerDown={pz.onPointerDown}
      >
        <StageMessage note={note} urlError={urlError} />
        <div
          className="artboard"
          style={{
            width: viewport.width,
            height: viewport.height,
            transform: `translate(${pz.x}px, ${pz.y}px) scale(${pz.zoom})`,
            visibility: note === 'empty' ? 'hidden' : undefined,
          }}
        >
          {frames.slots.map((slot) => (
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
          ))}
          <div className="overlay" style={{ ['--stroke' as string]: `${stroke}px` }}>
            {(selectMode || commentMode) && frames.hover && (
              <div
                className="box hover"
                style={{
                  left: frames.hover.rect.x,
                  top: frames.hover.rect.y,
                  width: frames.hover.rect.width,
                  height: frames.hover.rect.height,
                }}
              >
                {frames.hover.label && (
                  <span className="box-label" style={{ transform: `scale(${stroke})` }}>
                    {frames.hover.label}
                  </span>
                )}
              </div>
            )}
            {props.selection.map((s) => (
              <div
                key={s.selector}
                className="box selected"
                style={{ left: s.rect.x, top: s.rect.y, width: s.rect.width, height: s.rect.height }}
              />
            ))}
            {comment.available && props.comments && (
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
            )}
          </div>
        </div>
        {capture && <div className="capture" data-testid="pan-capture" />}
      </div>
    </div>
  );
}
