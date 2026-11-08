import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { formatRelative } from "../../domain/format.js";
import { ContinueActions } from "./continue-actions.js";
import { ContinueThumb } from "./continue-thumb.js";
import { ContinueTitle } from "./continue-title.js";
import { copy } from "./copy.js";
import type { AppHealth } from "./deps.js";
import { toRouteLine, toServerText } from "./library-model.js";
import type { LastRun } from "./library-model.js";
import { useLastRun } from "./use-last-run.js";
import { useThumbnail } from "./use-thumbnail.js";

interface ContinueCardProps {
  readonly project: Project;
  readonly health: AppHealth | null;
  readonly onOpen: (project: Project) => void;
}

const toLastText = (project: Project, last: LastRun | null): string => {
  if (last) {
    return `${copy.lastPrefix} “${last.prompt}” · ${formatRelative(last.at)}`;
  }

  const edited = formatRelative(project.updatedAt).replace(
    /^Just/u,
    copy.justLower
  );

  return `${copy.editedPrefix} ${edited}`;
};

const ContinueCard = ({
  project,
  health,
  onOpen,
}: ContinueCardProps): ReactElement => {
  const thumb = useThumbnail(project);
  const last = useLastRun(project);

  return (
    <section className="home-continue" aria-label={copy.continue}>
      <ContinueThumb project={project} thumb={thumb} onOpen={onOpen} />
      <div className="home-continue-body">
        <span className="home-continue-kicker">{copy.continue}</span>
        <ContinueTitle project={project} line={toRouteLine(project, last)} />
        <p className="home-continue-last truncate">
          {toLastText(project, last)}
        </p>
        <ContinueActions
          project={project}
          health={health}
          server={toServerText(project, health)}
          onOpen={onOpen}
        />
      </div>
    </section>
  );
};

export { ContinueCard };
