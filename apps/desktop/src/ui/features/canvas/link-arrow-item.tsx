import { targetFrame } from "@design-studio/contracts/link-interaction";
import type { ReactElement } from "react";

import { toArrowClass } from "./link-view.js";
import { toArrowStroke, toStartPoint } from "./prototype-model.js";
import type { Box } from "./prototype-model.js";
import type { LinkState } from "./use-link-rects.js";

interface LinkArrowItemProps {
  readonly state: LinkState;
  readonly selectedId: string | null;
  readonly toFrameBox: (id: string | null) => Box | null;
}

const LinkArrowItem = ({
  state,
  selectedId,
  toFrameBox,
}: LinkArrowItemProps): ReactElement | null => {
  const from = toFrameBox(state.link.from.frame);
  const begin = from && toStartPoint(state.rect, from);

  if (!from || !begin || !state.rect) {
    return null;
  }

  const rect = {
    height: state.rect.height,
    width: state.rect.width,
    x: from.x + state.rect.x,
    y: from.y + state.rect.y,
  };

  const target = toFrameBox(targetFrame(state.link.to) ?? null);
  const stroke = toArrowStroke(begin, target, state.issue !== null);

  return (
    <g className={toArrowClass(state, selectedId)} data-link-id={state.link.id}>
      <rect
        className="link-hotspot"
        x={rect.x}
        y={rect.y}
        width={rect.width}
        height={rect.height}
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={stroke.path}
        vectorEffect="non-scaling-stroke"
        markerEnd={stroke.markerEnd}
      />
    </g>
  );
};

export { LinkArrowItem };
