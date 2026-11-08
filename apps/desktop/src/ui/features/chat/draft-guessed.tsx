import type { DesignSystemCoverage } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { guessedKeys, toCssVarList } from "./draft-bar-model.js";

const DraftGuessed = ({
  coverage,
}: {
  coverage: DesignSystemCoverage;
}): ReactElement | null => {
  const keys = guessedKeys(coverage);

  if (keys === null) {
    return null;
  }

  if (keys.length === 0) {
    return <span className="draft-fallbacks">{copy.keyTokensChecked}</span>;
  }

  const names = toCssVarList(keys);

  return (
    <span
      className="draft-fallbacks"
      data-tip={`Not found under their usual names in the source, so these are guesses: ${names}`}
      data-tip-align="start"
    >
      {keys.length}
      {copy.guessed}
      <span className="sr-only">
        {copy.text6}
        {names}
      </span>
    </span>
  );
};

export { DraftGuessed };
