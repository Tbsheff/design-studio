import { memo } from "react";
import type { ReactElement } from "react";

import type { ToolRow } from "./run-state-model.js";
import { ToolChips } from "./tool-chips.js";

interface ToolSegmentProps {
  readonly tools: ToolRow[];
  readonly running: boolean;
  readonly workTree: string | null;
}

const ToolSegmentBody = ({
  tools,
  running,
  workTree,
}: ToolSegmentProps): ReactElement => (
  <ToolChips tools={tools} running={running} workTree={workTree} flat />
);

const isSameSegment = (
  left: ToolSegmentProps,
  right: ToolSegmentProps
): boolean =>
  left.running === right.running &&
  left.workTree === right.workTree &&
  left.tools.length === right.tools.length &&
  left.tools.every((tool, index) => tool === right.tools[index]);

const ToolSegment = memo(ToolSegmentBody, isSameSegment);

ToolSegment.displayName = "ToolSegment";

export { ToolSegment };
