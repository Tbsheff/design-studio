import type { CSSProperties, ReactElement } from "react";

import { AgentPresenceChip } from "./agent-presence-chip.js";
import type { PresenceMark } from "./agent-presence-model.js";
import type { CanvasFrame } from "./canvas-layout-types.js";
import type { AgentPresence } from "./use-agent-presence.js";

interface AgentPresenceLayerProps {
  readonly frames: readonly CanvasFrame[];
  readonly offset: { readonly x: number; readonly y: number };
  readonly presence: AgentPresence;
  readonly zoom: number;
}

const OUTLINE_PX = 2;

const toMarkStyle = (
  frame: CanvasFrame,
  offset: AgentPresenceLayerProps["offset"],
  zoom: number
): CSSProperties => ({
  height: frame.height,
  left: frame.x - offset.x,
  outlineWidth: OUTLINE_PX / zoom,
  top: frame.y - offset.y,
  width: frame.width,
});

const toMarkKey = (mark: PresenceMark): string => `${mark.agent}-${mark.at}`;

const AgentPresenceLayer = ({
  frames,
  offset,
  presence,
  zoom,
}: AgentPresenceLayerProps): ReactElement | null => {
  if (presence.marks.length === 0) {
    return null;
  }

  return (
    <div className="agent-presence" aria-hidden="true">
      {presence.marks.map((mark) => {
        const frame = frames.find((entry) => entry.id === mark.frameId);

        if (!frame) {
          return null;
        }

        return (
          <div
            key={toMarkKey(mark)}
            className="agent-presence-mark"
            data-testid="agent-presence"
            data-frame-id={frame.id}
            style={toMarkStyle(frame, offset, zoom)}
          >
            <AgentPresenceChip agent={mark.agent} zoom={zoom} />
          </div>
        );
      })}
    </div>
  );
};

export { AgentPresenceLayer };
