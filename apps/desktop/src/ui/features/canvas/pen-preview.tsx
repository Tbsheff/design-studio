import type { ReactElement } from "react";

import { penPath } from "./drawing-model.js";
import type { PenAnchor } from "./drawing-model.js";
import type { Point } from "./vector-layer.js";
import {
  PREVIEW_STROKE,
  toAnchorClass,
  toRubberPath,
} from "./vector-preview-model.js";

const ZOOM_4 = 4;

const PenPreview = ({
  anchors,
  hover,
  zoom,
  closing,
}: {
  anchors: PenAnchor[];
  hover: Point | null;
  zoom: number;
  closing: boolean;
}): ReactElement => {
  const last = anchors.at(-1);
  const [first] = anchors;
  const stroke = PREVIEW_STROKE / zoom;
  const ratio = ZOOM_4 / zoom;

  const rubber = toRubberPath(last, hover, (list) => penPath(list, false));

  return (
    <svg
      className="vector-preview pen"
      width="100%"
      height="100%"
      aria-hidden="true"
    >
      <path d={penPath(anchors, false)} strokeWidth={stroke} />
      {rubber && <path className="rubber" d={rubber} strokeWidth={stroke} />}
      {anchors.map((anchor, index) => (
        <g key={`${anchor.x}:${anchor.y}:${anchor.hin?.x ?? ""}`}>
          {anchor.hout && anchor.hin && (
            <path
              className="handle"
              d={`M${anchor.hin.x} ${anchor.hin.y}L${anchor.hout.x} ${anchor.hout.y}`}
              strokeWidth={stroke / PREVIEW_STROKE}
            />
          )}
          <rect
            className={toAnchorClass(index, closing)}
            x={anchor.x - ratio}
            y={anchor.y - ratio}
            width={ratio * 2}
            height={ratio * 2}
            strokeWidth={stroke}
          />
        </g>
      ))}
      {first && closing && (
        <circle
          className="close-ring"
          cx={first.x}
          cy={first.y}
          r={ratio * 2}
          strokeWidth={stroke}
        />
      )}
    </svg>
  );
};

export { PenPreview };
