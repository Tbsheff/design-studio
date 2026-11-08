import type { DesignSystemState } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { TokenErrors } from "./token-errors.js";
import { TokenRow } from "./token-row.js";

const TokenEntries = ({
  state,
}: {
  state: DesignSystemState;
}): ReactElement => (
  <>
    <TokenErrors errors={state.errors} />
    <div className="ds-cols" aria-hidden="true">
      <span>{COPY.textVariable}</span>
      <span>{COPY.textLight}</span>
      <span>{COPY.textDark}</span>
    </div>
    <ul className="ds-list" aria-label={COPY.labelTokens}>
      {state.entries.map((entry) => (
        <TokenRow key={entry.cssVar} entry={entry} />
      ))}
    </ul>
  </>
);

export { TokenEntries };
