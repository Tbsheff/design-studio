import type { ReactElement } from "react";

import { toLatestMark, toPresenceFrameName } from "./agent-presence-model.js";
import type { CanvasFrame } from "./canvas-layout-types.js";
import { copy } from "./copy.js";
import type { AgentPresence } from "./use-agent-presence.js";

interface AgentPresenceLineProps {
  readonly frames: readonly CanvasFrame[];
  readonly presence: AgentPresence;
}

const AgentPresenceLine = ({
  frames,
  presence,
}: AgentPresenceLineProps): ReactElement | null => {
  const mark = toLatestMark(presence.marks);

  if (mark === null) {
    return null;
  }

  const frame = frames.find((entry) => entry.id === mark.frameId);

  if (!frame) {
    return null;
  }

  return (
    <output
      key={`${mark.agent}-${mark.at}`}
      className="agent-presence-line"
      data-testid="agent-presence-line"
    >
      <span className="agent-presence-dot" aria-hidden="true" />
      <strong>{mark.agent}</strong>
      {copy.isEditing}
      <strong>{toPresenceFrameName(frame)}</strong>
      {copy.ellipsis}
    </output>
  );
};

export { AgentPresenceLine };
