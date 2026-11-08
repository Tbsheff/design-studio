import { isSharedLayout } from "@design-studio/contracts/usage-scope";
import type {
  ComponentUsage,
  EditScopeChoice,
} from "@design-studio/contracts/usage-scope";
import type { ReactElement } from "react";

import { ScopeChoice } from "./scope-choice.js";
import { SharedLayoutNote } from "./shared-layout-note.js";

interface ScopeSectionProps {
  readonly choice: EditScopeChoice;
  readonly onChoice: (choice: EditScopeChoice) => void;
  readonly usage: ComponentUsage | null;
}

const ScopeSection = ({
  usage,
  choice,
  onChoice,
}: ScopeSectionProps): ReactElement | null => {
  if (!usage) {
    return null;
  }

  if (isSharedLayout(usage.callSite)) {
    return <SharedLayoutNote usage={usage} />;
  }

  return <ScopeChoice usage={usage} choice={choice} onChoice={onChoice} />;
};

export { ScopeSection };
