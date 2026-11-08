import type { ReactElement } from "react";

import type { Segment } from "./run-segments-model.js";
import { SegmentView } from "./segment-view.js";

const SegmentList = ({
  segments,
  running,
  workTree,
}: {
  segments: Segment[];
  running: boolean;
  workTree: string | null;
}): ReactElement => (
  <>
    {segments.map((segment) => (
      <SegmentView
        key={segment.key}
        segment={segment}
        running={running}
        workTree={workTree}
      />
    ))}
  </>
);

export { SegmentList };
