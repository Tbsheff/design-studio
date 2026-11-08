import type { ReactElement } from "react";

import { copy as uiCopy } from "./copy.js";
import { Segmented } from "./segmented.js";
import type { SegmentOption } from "./segmented.js";
import { STEP_COUNTS, STEP_TIMES } from "./use-export-flow.js";
import type { ExportFlow, FlowVideoFormat } from "./use-export-flow.js";

interface ExportFlowFieldsProps {
  readonly flow: ExportFlow;
}

const MS_PER_SECOND = 1000;

const FORMAT_OPTIONS: readonly SegmentOption<FlowVideoFormat>[] = [
  { icon: null, id: "webm", label: "webm" },
  { icon: null, id: "mp4", label: "mp4" },
  { icon: null, id: "gif", label: "gif" },
];

const STEP_OPTIONS: readonly SegmentOption<number>[] = STEP_COUNTS.map(
  (count) => ({ icon: null, id: count, label: String(count) })
);

const STEP_MS_OPTIONS: readonly SegmentOption<number>[] = STEP_TIMES.map(
  (ms) => ({ icon: null, id: ms, label: `${ms / MS_PER_SECOND} s` })
);

const ExportFlowFields = ({ flow }: ExportFlowFieldsProps): ReactElement => (
  <>
    <div className="export-field export-inline">
      <span className="export-label">{uiCopy.flowFormat}</span>
      <Segmented
        label={uiCopy.flowFormatLabel}
        value={flow.videoFormat}
        options={FORMAT_OPTIONS}
        onChange={flow.handleVideoFormat}
      />
    </div>
    <div className="export-field export-inline">
      <span className="export-label">{uiCopy.flowSteps}</span>
      <Segmented
        label={uiCopy.flowStepsLabel}
        value={flow.maxSteps}
        options={STEP_OPTIONS}
        onChange={flow.handleSteps}
      />
    </div>
    <div className="export-field export-inline">
      <span className="export-label">{uiCopy.flowStepTime}</span>
      <Segmented
        label={uiCopy.flowStepTimeLabel}
        value={flow.stepMs}
        options={STEP_MS_OPTIONS}
        onChange={flow.handleStepMs}
      />
    </div>
  </>
);

export { ExportFlowFields };
