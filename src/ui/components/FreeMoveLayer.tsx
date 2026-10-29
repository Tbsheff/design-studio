import { formatMeasure } from '../measure';
import type { FreeMoveView } from '../useFreeMove';
import { SnapGuides } from './ArtboardOverlay';
import { gapStyle } from './CanvasOverlays';

export function FreeMoveLayer({ view }: { view: FreeMoveView | null }) {
  if (!view) return null;
  const { box, line } = view;
  return (
    <div className="overlay" aria-hidden="true" data-testid="free-move">
      <div className={`box move-ghost${view.copy ? ' copy' : ''}`} style={{ left: box.x, top: box.y, width: box.width, height: box.height }} />
      <SnapGuides guides={view.guides} full />
      {view.spacing.length > 0 && (
        <div className="snap-guides">
          {view.spacing.map((b) => (
            <div key={`s-${b.axis}-${b.from}-${b.to}`} className={`snap-gap ${b.axis}`} style={gapStyle(b)}>
              <span className="snap-gap-label" data-value={b.value}>
                {formatMeasure(b.value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {line && <div className={`move-insert ${line.axis}`} data-testid="move-insert" style={line.axis === 'x' ? { left: line.at, top: line.from, height: line.to - line.from } : { left: line.from, top: line.at, width: line.to - line.from }} />}
    </div>
  );
}
