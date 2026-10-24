import type { ReactNode } from 'react';
import type { SelectionContext } from '../../shared/contracts';
import { formatMeasure, measureBetween, type MeasureLine } from '../measure';
import type { HoverBox } from '../usePreviewFrames';

const LABEL_ROOM = 24;

interface Props {
  hover: HoverBox | null;
  selection: SelectionContext[];
  comments: ReactNode;
  zoom: number;
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

export function ArtboardOverlay({ hover, selection, comments, zoom }: Props) {
  const anchor = selection.at(-1);
  const measuring = hover?.altKey && anchor && !hover.fromTree;
  return (
    <div className="overlay">
      {hover && !measuring && (
        <div className="box hover" style={{ left: hover.rect.x, top: hover.rect.y, width: hover.rect.width, height: hover.rect.height }}>
          {hover.label && <span className={`box-label${hover.rect.y * zoom < LABEL_ROOM ? ' inside' : ''}`}>{hover.label}</span>}
        </div>
      )}
      {selection.map((s) => (
        <div key={s.selector} className="box selected" style={{ left: s.rect.x, top: s.rect.y, width: s.rect.width, height: s.rect.height }} />
      ))}
      {measuring && hover && anchor && <Measurements from={anchor.rect} to={hover.rect} />}
      {comments}
    </div>
  );
}
