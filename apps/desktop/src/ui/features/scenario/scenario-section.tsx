import type { ReactElement } from "react";

import { ScenarioPanel } from "./scenario-panel.js";

interface SectionProps {
  readonly directionId: string | null;
  readonly frameId: string;
  readonly projectId: string;
}

const ScenarioSection = (props: SectionProps): ReactElement | null => {
  if (props.directionId === null) {
    return null;
  }

  return (
    <ScenarioPanel
      directionId={props.directionId}
      frameId={props.frameId}
      projectId={props.projectId}
    />
  );
};

export { ScenarioSection };

export type { SectionProps };
