import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { SCOPES } from "./match-rows-model.js";
import type { Scope } from "./match-scan-model.js";
import { MatchScopeButton } from "./match-scope-button.js";

const ScopeToggle = ({
  scope,
  onScope,
}: {
  readonly scope: Scope;
  readonly onScope: (scope: Scope) => void;
}): ReactElement => (
  <div
    className="segmented sm-scope"
    role="toolbar"
    aria-label={copy.valuesFrom}
  >
    {SCOPES.map((id) => (
      <MatchScopeButton
        key={id}
        id={id}
        isOn={scope === id}
        onScope={onScope}
      />
    ))}
  </div>
);

export { ScopeToggle };
