import type { TokenGroupName } from "@design-studio/contracts";
import type { ReactNode } from "react";

import { cssVarFor } from "../../../shared/token-match.js";
import { COPY } from "./copy.js";

interface TokenNameHelpProps {
  readonly group: TokenGroupName;
  readonly name: string;
  readonly problem: string | null;
}

const toHelpClass = (problem: string | null): string => {
  if (problem) {
    return "tk-help error";
  }

  return "tk-help ";
};

const TokenNameHelp = ({
  group,
  name,
  problem,
}: TokenNameHelpProps): ReactNode => (
  <span id="tk-name-help" className={toHelpClass(problem)}>
    {problem ?? (
      <>
        {COPY.tokenWrites}
        <code>{`var(${cssVarFor(group, name || "…")})`}</code>
      </>
    )}
  </span>
);

export { TokenNameHelp };
