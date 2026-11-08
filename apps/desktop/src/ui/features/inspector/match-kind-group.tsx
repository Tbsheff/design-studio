import type {
  StyleKind,
  StyleValueRow,
} from "@design-studio/contracts/style-search";
import { useMemo } from "react";
import type { ReactElement } from "react";

import type { MatchActions } from "./match-model.js";
import { KindGroup } from "./match-rows.js";

interface Props {
  readonly kind: StyleKind;
  readonly rows: StyleValueRow[];
  readonly actions: MatchActions;
  readonly replaceLabel: string;
}

const MatchKindGroup = ({
  kind,
  rows,
  actions,
  replaceLabel,
}: Props): ReactElement => {
  const kindRows = useMemo(
    () => rows.filter((row) => row.kind === kind),
    [kind, rows]
  );

  return (
    <KindGroup
      kind={kind}
      rows={kindRows}
      actions={actions}
      replaceLabel={replaceLabel}
    />
  );
};

export { MatchKindGroup };
