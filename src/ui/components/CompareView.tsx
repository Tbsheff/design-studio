import { lazy, Suspense, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { ProjectKind, Version } from '../../shared/contracts';
import { useUi } from '../storage';
import { displayTitle, indexVersions } from '../versionLabels';
import { CompareFrame } from './CompareFrame';
import { OverlayBoard, SliderBoard, type BoardProps } from './CompareModes';
import { Icon } from './Icon';

type Mode = 'side' | 'slider' | 'overlay' | 'code';

const CompareCode = lazy(() => import('./CompareCode'));

const MODES: { id: Mode; label: string; tip: string }[] = [
  { id: 'side', label: 'Side by side', tip: 'Both versions next to each other' },
  { id: 'slider', label: 'Slider', tip: 'Drag a line to wipe between versions' },
  { id: 'overlay', label: 'Overlay', tip: 'The newer version with changed pixels in red' },
  { id: 'code', label: 'Code', tip: 'The line changes in each changed file' },
];
const MODE_KEY = 'design-studio.compare-mode';

function savedMode(): Mode {
  try {
    const value = localStorage.getItem(MODE_KEY);
    return MODES.some((mode) => mode.id === value) ? (value as Mode) : 'side';
  } catch {
    return 'side';
  }
}

function ModeSwitch({ mode, onMode }: { mode: Mode; onMode: (mode: Mode) => void }) {
  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const delta = event.key === 'ArrowRight' || event.key === 'ArrowDown' ? 1 : event.key === 'ArrowLeft' || event.key === 'ArrowUp' ? -1 : 0;
    if (delta === 0) return;
    event.preventDefault();
    const index = (MODES.findIndex((item) => item.id === mode) + delta + MODES.length) % MODES.length;
    const next = MODES[index];
    if (!next) return;
    onMode(next.id);
    event.currentTarget.querySelectorAll<HTMLButtonElement>('[role="radio"]')[index]?.focus();
  };
  return (
    <div className="segmented compare-modes" role="radiogroup" aria-label="Compare mode" onKeyDown={onKeyDown}>
      {MODES.map((item) => (
        <button
          key={item.id}
          type="button"
          role="radio"
          aria-checked={mode === item.id}
          tabIndex={mode === item.id ? 0 : -1}
          className={mode === item.id ? 'on' : ''}
          {...{ 'aria-description': item.tip }}
          onClick={() => onMode(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function SidePane(props: BoardProps & { side: 'A' | 'B' }) {
  const version = props.side === 'A' ? props.older : props.newer;
  const title = props.side === 'A' ? props.olderTitle : props.newerTitle;
  return (
    <div className="compare-pane">
      <div className="compare-label" data-tip={title}>
        <span className="badge accent">{props.side}</span>
        <span className="compare-title truncate">
          {title}
        </span>
      </div>
      <div className="compare-stage">
        <div className="compare-board" style={{ width: props.viewport.width * props.scale, height: props.viewport.height * props.scale }}>
          <CompareFrame projectId={props.projectId} version={version} title={title} kind={props.kind} viewport={props.viewport} scale={props.scale} onError={props.onError} />
        </div>
      </div>
    </div>
  );
}

interface Props {
  projectId: string;
  kind: ProjectKind;
  left: Version;
  right: Version;
  versions?: Version[];
  onClose: () => void;
}

export function CompareView({ projectId, kind, left, right, versions, onClose }: Props) {
  const { viewport } = useUi();
  const ref = useRef<HTMLDivElement>(null);
  const [mode, setModeState] = useState<Mode>(savedMode);
  const [scale, setScale] = useState(0.5);
  const [error, setError] = useState<string | null>(null);
  const [older, newer] = left.createdAt <= right.createdAt ? [left, right] : [right, left];
  const index = useMemo(() => indexVersions(versions ?? [left, right]), [versions, left, right]);
  const setMode = (next: Mode) => {
    setModeState(next);
    try {
      localStorage.setItem(MODE_KEY, next);
    } catch {
      return;
    }
  };
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const paneW = mode === 'side' ? (el.clientWidth - 48) / 2 : el.clientWidth - 32;
      const paneH = el.clientHeight - 76;
      setScale(Math.max(0.1, Math.min(1, paneW / viewport.width, paneH / viewport.height)));
    };
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    measure();
    return () => ro.disconnect();
  }, [viewport.width, viewport.height, mode]);
  const board: BoardProps = {
    projectId,
    kind,
    older,
    newer,
    olderTitle: displayTitle(older, index),
    newerTitle: displayTitle(newer, index),
    viewport: { width: viewport.width, height: viewport.height },
    scale,
    onError: setError,
  };
  return (
    <div className="canvas">
      <div className="toolbar">
        <Icon name="compare" />
        <strong className="toolbar-title">Compare</strong>
        <span className="dims-readout">
          {viewport.width} × {viewport.height}
        </span>
        <ModeSwitch mode={mode} onMode={setMode} />
        <div className="spacer" />
        <button className="btn small has-icon" onClick={onClose}>
          <Icon name="close" size={14} />
          Close compare
        </button>
      </div>
      {mode === 'code' ? (
        <div className="compare-code-scroll" data-mode={mode}>
          <Suspense fallback={null}>
            <CompareCode projectId={projectId} older={older} newer={newer} />
          </Suspense>
        </div>
      ) : (
        <div className={`compare ${mode === 'side' ? '' : 'single'}`} ref={ref} data-mode={mode}>
          {error && (
            <div className="stage-message" role="alert">
              {error}
            </div>
          )}
          {mode === 'side' && (
            <>
              <SidePane {...board} side="A" />
              <SidePane {...board} side="B" />
            </>
          )}
          {mode === 'slider' && <SliderBoard {...board} />}
          {mode === 'overlay' && <OverlayBoard {...board} />}
        </div>
      )}
    </div>
  );
}
