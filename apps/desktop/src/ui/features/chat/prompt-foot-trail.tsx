import type { Project, ProjectSettings } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { BudgetIndicator } from "./budget-indicator.js";
import { ContextMeter } from "./context-meter.js";

interface PromptFootTrailProps {
  readonly contextTokens: number | null;
  readonly model: string;
  readonly onSettingsSaved: (project: Project) => void;
  readonly projectId: string;
  readonly settings: ProjectSettings;
}

const PromptFootTrail = (props: PromptFootTrailProps): ReactElement => (
  <span className="prompt-foot-trail">
    <BudgetIndicator
      projectId={props.projectId}
      settings={props.settings}
      onSaved={props.onSettingsSaved}
    />
    <ContextMeter tokens={props.contextTokens} model={props.model} />
  </span>
);

export { PromptFootTrail };

export type { PromptFootTrailProps };
