import type { CompiledTokenEntry } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { DarkCell } from "./dark-cell.js";
import { ValueCell } from "./value-cell.js";

const TokenRow = ({ entry }: { entry: CompiledTokenEntry }): ReactElement => {
  const isColor = entry.type === "color";

  return (
    <li className="ds-row">
      <code className="ds-var">{entry.cssVar}</code>
      <ValueCell value={entry.value} isColor={isColor} />
      <DarkCell value={entry.darkValue} isColor={isColor} />
    </li>
  );
};

export { TokenRow };
