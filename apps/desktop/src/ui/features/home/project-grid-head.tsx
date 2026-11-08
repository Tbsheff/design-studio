import type { Project } from "@design-studio/contracts";
import { useCallback } from "react";
import type { ReactElement, ReactNode, RefObject } from "react";

import type { CardActions } from "./project-card-model.js";
import { ProjectListTools } from "./project-list-tools.js";

interface ProjectGridHeadProps {
  readonly tabs: ReactNode;
  readonly headActions: ReactNode;
  readonly hasProjects: boolean;
  readonly first: Project | null;
  readonly shownCount: number;
  readonly query: string;
  readonly searchRef: RefObject<HTMLInputElement | null>;
  readonly actions: CardActions;
  readonly onQuery: (query: string) => void;
  readonly focusAt: (index: number) => void;
}

const ProjectGridHead = ({
  tabs,
  headActions,
  hasProjects,
  first,
  shownCount,
  query,
  searchRef,
  actions,
  onQuery,
  focusAt,
}: ProjectGridHeadProps): ReactElement => {
  const focusFirst = useCallback((): void => {
    focusAt(0);
  }, [focusAt]);

  const openFirst = useCallback((): void => {
    if (first) {
      actions.onOpen(first);
    }
  }, [actions, first]);

  return (
    <div className="home-list-head">
      {tabs}
      <div className="spacer" />
      {headActions}
      {hasProjects && (
        <ProjectListTools
          query={query}
          onQuery={onQuery}
          searchRef={searchRef}
          onFirst={focusFirst}
          onOpenFirst={openFirst}
          canOpen={shownCount > 0}
        />
      )}
    </div>
  );
};

export { ProjectGridHead };
