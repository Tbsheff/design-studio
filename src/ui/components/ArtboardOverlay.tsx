import type { ReactNode } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { formatMeasure, measureBetween, type MeasureLine } from '../measure';
import type { HoverBox } from '../usePreviewFrames';
import type { ResizeControl, ResizeEdge } from '../useResizeHandles';

const LABEL_ROOM = 24;

interface Props {
  hover: HoverBox | null;
  selection: SelectionContext[];
  comments: ReactNode;
  zoom: number;
  resize?: ResizeControl;
}

const EDGES: ResizeEdge[] = ['e', 's', 'se'];

function ResizeHandles({ control, rect }: { control: ResizeControl; rect: SelectionContext['rect'] }) {
  const live = control.live;
  return (
    <div
      className={`resize-frame${live ? ' active' : ''}`}
      data-testid="resize-frame"
      style={{ left: rect.x, top: rect.y, width: live?.boxWidth ?? rect.width, height: live?.boxHeight ?? rect.height }}
    >
      {EDGES.map((edge) => (
        <div key={edge} className={`resize-handle ${edge}`} aria-hidden="true" onPointerDown={(e) => control.onHandleDown(edge, e)} />
      ))}
      {live && (
        <span className="resize-label" data-testid="resize-label">
          {live.width} × {live.height}
        </span>
      )}
    </div>
  );
}

function lineStyle(l: MeasureLine) {
  return l.axis === 'x' ? { left: l.from, top: l.at, width: l.to - l.from } : { left: l.at, top: l.from, height: l.to - l.from };
}

function Measurements({ from, to }: { from: SelectionContext['rect']; to: SelectionContext['rect'] }) {
  const lines = measureBetween(from, to);
  return (
    <div className="measure" data-testid="measure">
      <div className="box measure-target" style={{ left: to.x, top: to.y, width: to.width, height: to.height }} />
      {lines.map((l) => (
        <div key={`${l.axis}-${l.from}-${l.to}`} className={`measure-line ${l.axis}`} style={lineStyle(l)}>
          <span className="measure-label" data-value={l.value}>
            {formatMeasure(l.value)}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ArtboardOverlay({ hover, selection, comments, zoom, resize }: Props) {
  const anchor = selection.at(-1);
  const measuring = hover?.altKey && anchor && !hover.fromTree;
  return (
    <div className="overlay">
      {hover && !measuring && (
        <div className="box hover" style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.width, height: hover.rect.height }}>
          {hover.label && <span className={`box-label${hover.rect.y * zoom < LABEL_ROOM ? ' inside' : ''}`}>{hover.label}</span>}
        </div>
      )}
      {selection.map((s) => {
        const live = resize?.target?.selector === s.selector ? resize.live : null;
        return <div key={s.selector} className="box selected" style={{ left: s.rect.x, top: s.rect.y, width: live?.boxWidth ?? s.rect.width, height: live?.boxHeight ?? s.rect.height }} />;
      })}
      {resize?.target && <ResizeHandles control={resize} rect={resize.target.rect} />}
      {measuring && hover && anchor && <Measurements from={anchor.rect} to={hover.rect} />}
      {comments}
    </div>
  );
}
