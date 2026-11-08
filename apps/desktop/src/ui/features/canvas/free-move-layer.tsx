import type { CSSProperties, ReactElement } from "react";

import { FreeMoveSpacing } from "./free-move-spacing.js";
import { SnapGuides } from "./snap-guides.js";
import type { FreeMoveView } from "./use-free-move.js";

const toBoxStyle = (box: {
  height: number;
  width: number;
  x: number;
  y: number;
}): CSSProperties => ({
  height: box.height,
  left: box.x,
  top: box.y,
  width: box.width,
});

const toInsertStyle = (
  line: NonNullable<FreeMoveView["line"]>
): CSSProperties => {
  if (line.axis === "x") {
    return { height: line.to - line.from, left: line.at, top: line.from };
  }

  return { left: line.from, top: line.at, width: line.to - line.from };
};

const FreeMoveLayer = ({
  view,
}: {
  view: FreeMoveView | null;
}): ReactElement | null => {
  if (!view) {
    return null;
  }

  const { box, line } = view;

  let part: "" | " copy" = "";

  if (view.copy) {
    part = " copy";
  }

  return (
    <div className="overlay" aria-hidden="true" data-testid="free-move">
      <div className={`box move-ghost${part}`} style={toBoxStyle(box)} />
      <SnapGuides guides={view.guides} full />
      <FreeMoveSpacing spacing={view.spacing} />
      {line && (
        <div
          className={`move-insert ${line.axis}`}
          data-testid="move-insert"
          style={toInsertStyle(line)}
        />
      )}
    </div>
  );
};

export { FreeMoveLayer };
