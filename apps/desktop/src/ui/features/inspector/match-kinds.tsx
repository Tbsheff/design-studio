import { STYLE_KINDS } from "@design-studio/contracts/style-search";
import type { StyleValueRow } from "@design-studio/contracts/style-search";
import type { ReactElement } from "react";

import { MatchKindGroup } from "./match-kind-group.js";
import type { MatchActions } from "./match-model.js";

interface Props {
  readonly rows: StyleValueRow[];
  readonly actions: MatchActions;
  readonly replaceLabel: string;
}

const MatchKinds = ({ rows, actions, replaceLabel }: Props): ReactElement => (
  <>
    {STYLE_KINDS.map((kind) => (
      <MatchKindGroup
        key={kind}
        kind={kind}
        rows={rows}
        actions={actions}
        replaceLabel={replaceLabel}
      />
    ))}
  </>
);

export { MatchKinds };
