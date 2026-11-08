import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toEmptyText } from "./match-model.js";
import type { Scope } from "./match-scan-model.js";

interface Props {
  readonly scope: Scope;
  readonly isLoading: boolean;
  readonly hasRows: boolean;
}

const MatchEmpty = ({
  scope,
  isLoading,
  hasRows,
}: Props): ReactElement | null => {
  if (isLoading) {
    return <p className="sm-empty">{copy.readingValues}</p>;
  }

  if (!hasRows) {
    return <p className="sm-empty">{toEmptyText(scope)}</p>;
  }

  return null;
};

export { MatchEmpty };
