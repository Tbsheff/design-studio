import type { ReactElement } from "react";

import { AssistantText } from "./assistant-text.js";
import type { Segment } from "./run-segments-model.js";
import { SentWhileRunning } from "./sent-while-running.js";
import { Thinking } from "./thinking.js";
import { ToolSegment } from "./tool-segment.js";

const SegmentView = ({
  segment,
  running,
  workTree,
}: {
  segment: Segment;
  running: boolean;
  workTree: string | null;
}): ReactElement => {
  if (segment.kind === "tools") {
    return (
      <ToolSegment
        tools={segment.tools}
        running={running}
        workTree={workTree}
      />
    );
  }

  if (segment.kind === "user") {
    return <SentWhileRunning text={segment.text} />;
  }

  if (segment.kind === "thinking") {
    return <Thinking text={segment.text} live={running && segment.open} />;
  }

  return (
    <AssistantText text={segment.text} streaming={running && segment.open} />
  );
};

export { SegmentView };
