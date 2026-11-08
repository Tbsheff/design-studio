import type { ReactElement } from "react";

import type { FlowResult } from "../../../shared/route-flow.js";
import { copy } from "./copy.js";
import { flowSummary } from "./flow-summary-model.js";

const SLICE_4 = 4;

const FlowResultView = ({ result }: { result: FlowResult }): ReactElement => (
  <output className="flow-result">
    <span>
      {flowSummary(result)}
      {copy.text}
    </span>
    {result.missingParams.length > 0 && (
      <span className="flow-warn">
        {copy.set}
        {result.missingParams.join(", ")}
        {copy.soTheFramesShow}
      </span>
    )}
    {result.skipped.slice(0, SLICE_4).map((item) => (
      <span
        key={`${item.fromRoute}|${item.href}|${item.source}`}
        className="flow-skip"
        data-tip={`${item.reason} ${item.source}`}
        data-tip-align="start"
      >
        {item.kind} {item.href}
      </span>
    ))}
  </output>
);

export { FlowResultView };
