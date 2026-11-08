import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { formatMeasure, measureBetween } from "../../../shared/measure.js";
import { lineStyle, toRectStyle } from "./overlay-styles.js";

const Measurements = ({
  from,
  to,
}: {
  from: SelectionContext["rect"];
  to: SelectionContext["rect"];
}): ReactElement => {
  const lines = measureBetween(from, to);

  return (
    <div className="measure" data-testid="measure">
      <div className="box measure-target" style={toRectStyle(to, null)} />
      {lines.map((measureLineValue) => (
        <div
          key={`${measureLineValue.axis}-${measureLineValue.from}-${measureLineValue.to}`}
          className={`measure-line ${measureLineValue.axis}`}
          style={lineStyle(measureLineValue)}
        >
          <span className="measure-label" data-value={measureLineValue.value}>
            {formatMeasure(measureLineValue.value)}
          </span>
        </div>
      ))}
    </div>
  );
};

export { Measurements };
