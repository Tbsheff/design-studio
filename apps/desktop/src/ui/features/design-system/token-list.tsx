import type { ReactElement } from "react";

import type { TokenLoad } from "./chip-model.js";
import { COPY } from "./copy.js";
import { TokenEntries } from "./token-entries.js";

const TokenList = ({ load }: { load: TokenLoad }): ReactElement => {
  if (load.error) {
    return (
      <div className="alert error small" role="alert">
        {COPY.textCouldNotLoadTokens}
        {load.error} {COPY.textCloseThisPanelAnd}
      </div>
    );
  }

  if (!load.state) {
    return (
      <output className="ds-loading">
        <span className="spinner" /> {COPY.textLoadingTokens}
      </output>
    );
  }

  return <TokenEntries state={load.state} />;
};

export { TokenList };
