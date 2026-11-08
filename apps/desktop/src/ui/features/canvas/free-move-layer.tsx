import type { ReactElement } from "react";

import { formatMeasure } from "../../../shared/measure.js";
import { SnapGuides } from "./artboard-overlay.js";
import { gapStyle } from "./canvas-overlays.js";
import type { FreeMoveView } from "./use-free-move.js";

const FreeMoveLayer = ({
  view,
}: {
  view: FreeMoveView | null;
}): ReactElement | null => {
  if (!view) {
    return null;
  }

  const { box, line } = view;

  return (
    <div className="overlay" aria-hidden="true" data-testid="free-move">
      <div
        className={`box move-ghost${view.copy ? " copy" : ""}`}
        style={{
          height: box.height,
          left: box.x,
          top: box.y,
          width: box.width,
        }}
      />
      <SnapGuides guides={view.guides} full />
      {view.spacing.length > 0 && (
        <div className="snap-guides">
          {view.spacing.map((b) => (
            <div
              key={`s-${b.axis}-${b.from}-${b.to}`}
              className={`snap-gap ${b.axis}`}
              style={gapStyle(b)}
            >
              <span className="snap-gap-label" data-value={b.value}>
                {formatMeasure(b.value)}
              </span>
            </div>
          ))}
        </div>
      )}
      {line && (
        <div
          className={`move-insert ${line.axis}`}
          data-testid="move-insert"
          style={
            line.axis === "x"
              ? { height: line.to - line.from, left: line.at, top: line.from }
              : { left: line.from, top: line.at, width: line.to - line.from }
          }
        />
      )}
    </div>
  );
};

export { FreeMoveLayer };
