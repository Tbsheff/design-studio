import type { ReactElement } from "react";

import { ValueSwatch } from "./value-swatch.js";

const ValueCell = ({
  isColor,
  value,
}: {
  isColor: boolean;
  value: string;
}): ReactElement => (
  <span className="ds-value" data-tip={value}>
    <ValueSwatch isColor={isColor} value={value} />
    <span className="truncate">{value}</span>
  </span>
);

export { ValueCell };
