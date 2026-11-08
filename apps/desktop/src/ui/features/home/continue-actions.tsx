import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";

const ARROW_SIZE = 14;

interface ContinueActionsProps {
  readonly project: Project;
  readonly health: AppHealth | null;
  readonly server: string | null;
  readonly onOpen: (project: Project) => void;
}

const ContinueActions = ({
  project,
  health,
  server,
  onOpen,
}: ContinueActionsProps): ReactElement => {
  const open = useCallback((): void => {
    onOpen(project);
  }, [onOpen, project]);

  return (
    <div className="home-continue-actions">
      <button type="button" className="btn primary" onClick={open}>
        {copy.resume}
        <Icon name="arrowRight" size={ARROW_SIZE} />
      </button>
      {server && health && (
        <span className={`project-health ${health.state}`}>
          <span className="project-dot" aria-hidden="true" />
          {server}
        </span>
      )}
    </div>
  );
};

export { ContinueActions };
