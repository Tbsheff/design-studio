import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toCssVarList } from "./draft-bar-model.js";

const DraftFallbacks = ({ tokens }: { tokens: string[] }): ReactElement => {
  if (tokens.length === 0) {
    return <span className="draft-fallbacks">{copy.noFallbackTokens}</span>;
  }

  return (
    <span
      className="draft-fallbacks"
      data-tip={`From base: ${toCssVarList(tokens)}`}
      data-tip-align="start"
    >
      {tokens.length}
      {copy.fromBase}
      <span className="sr-only">
        {copy.text6}
        {toCssVarList(tokens)}
      </span>
    </span>
  );
};

export { DraftFallbacks };
