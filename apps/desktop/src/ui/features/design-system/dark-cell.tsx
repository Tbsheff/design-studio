import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { ValueCell } from "./value-cell.js";

const DarkCell = ({
  isColor,
  value,
}: {
  isColor: boolean;
  value: string | null | undefined;
}): ReactElement => {
  if (value) {
    return <ValueCell value={value} isColor={isColor} />;
  }

  return <span className="ds-none">{COPY.textSame}</span>;
};

export { DarkCell };
