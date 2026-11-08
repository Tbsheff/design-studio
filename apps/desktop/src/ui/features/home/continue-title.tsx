import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { toProjectBadge } from "./project-card-model.js";

interface ContinueTitleProps {
  readonly project: Project;
  readonly line: string;
}

const ContinueTitle = ({ project, line }: ContinueTitleProps): ReactElement => {
  const badge = toProjectBadge(project);

  return (
    <div className="home-continue-title">
      <b className="truncate">{project.name}</b>
      <span className={`home-badge ${badge.tone}`}>{badge.label}</span>
      {line && (
        <span className="mono truncate home-continue-route">{line}</span>
      )}
    </div>
  );
};

export { ContinueTitle };
