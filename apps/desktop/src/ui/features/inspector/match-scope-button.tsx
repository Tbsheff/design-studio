import type { ReactElement } from "react";
import { useCallback } from "react";

import { SCOPE_LABEL, toOnClass } from "./match-rows-model.js";
import type { Scope } from "./match-scan-model.js";

const MatchScopeButton = ({
  id,
  isOn,
  onScope,
}: {
  readonly id: Scope;
  readonly isOn: boolean;
  readonly onScope: (scope: Scope) => void;
}): ReactElement => {
  const select = useCallback(() => onScope(id), [onScope, id]);

  return (
    <button
      type="button"
      aria-pressed={isOn}
      className={toOnClass(isOn)}
      onClick={select}
    >
      {SCOPE_LABEL[id]}
    </button>
  );
};

export { MatchScopeButton };
