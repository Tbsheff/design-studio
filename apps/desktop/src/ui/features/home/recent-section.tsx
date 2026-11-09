import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { RecentThumb } from "./recent-thumb.js";

interface RecentSectionProps {
  readonly name: string;
  readonly onOpen: (projectId: string) => void;
  readonly projects: readonly Project[];
}

const RecentSection = ({
  name,
  onOpen,
  projects,
}: RecentSectionProps): ReactElement | null => {
  if (projects.length === 0) {
    return null;
  }

  return (
    <section className="ide-recent" aria-label={`${copy.recentIn} ${name}`}>
      <h2>{`${copy.recentIn} ${name}`}</h2>
      <div className="ide-thumbs">
        {projects.map((project) => (
          <RecentThumb key={project.id} onOpen={onOpen} project={project} />
        ))}
      </div>
    </section>
  );
};

export { RecentSection };
