import type {
  ComponentUsage,
  EditScopeChoice,
} from "@design-studio/contracts/usage-scope";
import type { ReactElement } from "react";

import { ScopeOption } from "./scope-option.js";

interface ScopeChoiceProps {
  readonly choice: EditScopeChoice;
  readonly onChoice: (choice: EditScopeChoice) => void;
  readonly usage: ComponentUsage;
}

const ScopeChoice = ({
  usage,
  choice,
  onChoice,
}: ScopeChoiceProps): ReactElement => {
  const name = usage.component ?? usage.file;
  const count = usage.routes.length;

  return (
    <div
      className="inline-prompt-scope"
      role="radiogroup"
      aria-label={`Where to change ${name}`}
    >
      <ScopeOption
        id="this"
        isOn={choice === "this"}
        label="This use"
        tip={`Change only this page. ${name} stays as it is.`}
        onChoice={onChoice}
      />
      <ScopeOption
        id="all"
        isOn={choice === "all"}
        label={`All uses (${count})`}
        tip={`Change ${name} on all ${count} routes`}
        onChoice={onChoice}
      />
    </div>
  );
};

export { ScopeChoice };
