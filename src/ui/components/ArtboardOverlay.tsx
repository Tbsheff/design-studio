import type { ReactNode } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { formatMeasure, measureBetween, type MeasureLine } from '../measure';
import { unionBox, type SnapGuide } from '../snap';
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

export function guideStyle(g: SnapGuide) {
  return g.axis === 'x' ? { left: g.at, top: g.from, height: g.to - g.from } : { left: g.from, top: g.at, width: g.to - g.from };
}

function fullStyle(g: SnapGuide) {
  return g.axis === 'x' ? { left: g.at, top: 0, bottom: 0 } : { top: g.at, left: 0, right: 0 };
}

export function SnapGuides({ guides, full }: { guides: SnapGuide[]; full?: boolean }) {
  if (guides.length === 0) return null;
  return (
    <div className={`snap-guides${full ? ' full' : ''}`} data-testid="snap-guides">
      {guides.map((g) => (
        <div key={`${g.axis}-${g.at}`} className={`snap-guide ${g.axis}`} style={full ? fullStyle(g) : guideStyle(g)} />
      ))}
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

function sameRect(a: SelectionContext['rect'], b: SelectionContext['rect']): boolean {
  return Math.abs(a.x - b.x) < 0.5 && Math.abs(a.y - b.y) < 0.5 && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}

export function ArtboardOverlay({ hover, selection, comments, zoom, resize }: Props) {
  const anchor = unionBox(selection.map((s) => s.rect));
  const measuring = hover?.altKey && anchor && !hover.fromTree;
  const onSelected = hover !== null && selection.some((s) => sameRect(s.rect, hover.rect));
  return (
    <div className="overlay">
      {hover && !measuring && !onSelected && (
        <div className="box hover" style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.width, height: hover.rect.height }}>
          {hover.label && <span className={`box-label${hover.rect.y * zoom < LABEL_ROOM ? ' inside' : ''}`}>{hover.label}</span>}
        </div>
      )}
      {selection.map((s) => {
        const live = resize?.target?.selector === s.selector ? resize.live : null;
        return <div key={s.selector} className="box selected" data-selector={s.selector} style={{ left: s.rect.x, top: s.rect.y, width: live?.boxWidth ?? s.rect.width, height: live?.boxHeight ?? s.rect.height }} />;
      })}
      {resize?.target && <ResizeHandles control={resize} rect={resize.target.rect} />}
      {resize?.live && <SnapGuides guides={resize.live.guides} full />}
      {measuring && hover && anchor && <Measurements from={anchor} to={hover.rect} />}
      {comments}
    </div>
  );
}
