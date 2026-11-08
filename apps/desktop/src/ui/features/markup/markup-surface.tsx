import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { MarkupStrokeView } from "./markup-stroke-view.js";
import type { FrameSize, MarkupDraw } from "./use-markup-draw.js";

import styles from "./markup.module.css";

const MarkupSurface = ({
  draw,
  size,
}: {
  readonly draw: MarkupDraw;
  readonly size: FrameSize;
}): ReactElement => (
  <svg
    aria-label={copy.surfaceLabel}
    className={styles.surface}
    onPointerDown={draw.handleDown}
    onPointerMove={draw.handleMove}
    onPointerUp={draw.handleUp}
    role="application"
    viewBox={`0 0 ${size.width} ${size.height}`}
  >
    {draw.strokes.map((stroke) => (
      <MarkupStrokeView key={stroke.id} stroke={stroke} />
    ))}
    {draw.draft && <MarkupStrokeView stroke={draw.draft} />}
  </svg>
);

export { MarkupSurface };
