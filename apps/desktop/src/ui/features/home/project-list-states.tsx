import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { ListFilter } from "./project-card-model.js";

const STATE_ICON_SIZE = 16;

const SKELETON_KEYS = [0, 1, 2];

interface ProjectListStatesProps {
  readonly projects: readonly Project[] | null;
  readonly error: string | null;
  readonly filter: ListFilter | null;
  readonly query: string;
  readonly shownCount: number;
  readonly onClearQuery: () => void;
}

const ProjectListStates = ({
  projects,
  error,
  filter,
  query,
  shownCount,
  onClearQuery,
}: ProjectListStatesProps): ReactElement => {
  const onClearFilter = filter?.onClear;

  return (
    <>
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      {projects === null && !error && (
        <div className="project-grid" aria-busy="true">
          {SKELETON_KEYS.map((key) => (
            <div key={key} className="project-card skeleton" />
          ))}
        </div>
      )}
      {filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={STATE_ICON_SIZE} />
          <span>{filter.empty ?? `No ${filter.label} ${copy.yet}`}</span>
          {!filter.empty && (
            <button type="button" className="link" onClick={onClearFilter}>
              {copy.showAll}
            </button>
          )}
        </div>
      )}
      {!filter && projects?.length === 0 && (
        <div className="home-empty">
          <Icon name="folder" size={STATE_ICON_SIZE} />
          <span>{copy.noProjectsYet}</span>
        </div>
      )}
      {projects && projects.length > 0 && shownCount === 0 && (
        <output className="home-empty">
          <Icon name="search" size={STATE_ICON_SIZE} />
          <span>{`${copy.noProjectsMatch} “${query.trim()}”.`}</span>
          <button type="button" className="link" onClick={onClearQuery}>
            {copy.clearSearch}
          </button>
        </output>
      )}
    </>
  );
};

export { ProjectListStates };
