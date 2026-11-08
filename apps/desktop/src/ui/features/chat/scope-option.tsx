import type { EditScopeChoice } from "@design-studio/contracts/usage-scope";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { cn } from "../../ai/lib/utils.js";
import { RADIO_ROLE } from "./aria-role-model.js";
import { preventDefault } from "./event-model.js";

interface ScopeOptionProps {
  readonly id: EditScopeChoice;
  readonly isOn: boolean;
  readonly label: string;
  readonly onChoice: (choice: EditScopeChoice) => void;
  readonly tip: string;
}

const ScopeOption = ({
  id,
  isOn,
  label,
  tip,
  onChoice,
}: ScopeOptionProps): ReactElement => {
  const onClick = useCallback((): void => {
    onChoice(id);
  }, [id, onChoice]);

  return (
    <button
      type="button"
      role={RADIO_ROLE}
      aria-checked={isOn}
      className={cn(isOn && "on")}
      data-tip={tip}
      onMouseDown={preventDefault}
      onClick={onClick}
    >
      {label}
    </button>
  );
};

export { ScopeOption };
