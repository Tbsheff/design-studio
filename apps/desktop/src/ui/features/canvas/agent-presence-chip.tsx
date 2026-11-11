import type { CSSProperties, ReactElement } from "react";

interface AgentPresenceChipProps {
  readonly agent: string;
  readonly zoom: number;
}

const CHIP_INSET_PX = 8;

const toChipStyle = (zoom: number): CSSProperties => ({
  transform: `scale(${1 / zoom}) translate(${CHIP_INSET_PX}px, ${CHIP_INSET_PX}px)`,
});

const AgentPresenceChip = ({
  agent,
  zoom,
}: AgentPresenceChipProps): ReactElement => (
  <span className="agent-presence-chip" style={toChipStyle(zoom)}>
    <span className="agent-presence-cursor" />
    {agent}
  </span>
);

export { AgentPresenceChip };
