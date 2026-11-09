import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { ScreenRow } from "./screen-row.js";
import { useScreens } from "./use-screens.js";
import { WorkspaceGroup } from "./workspace-group.js";

interface ScreensGroupProps {
  readonly groupKey: string;
  readonly isOpen: boolean;
  readonly onOpenRoute: (projectId: string, route: string) => void;
  readonly onToggle: (key: string) => void;
  readonly projectId: string;
}

const ScreensGroup = ({
  groupKey,
  isOpen,
  onOpenRoute,
  onToggle,
  projectId,
}: ScreensGroupProps): ReactElement => {
  const { isLoading, screens } = useScreens(projectId, isOpen);
  const shown = screens ?? [];

  return (
    <WorkspaceGroup
      count={screens?.length ?? null}
      groupKey={groupKey}
      isOpen={isOpen}
      label={copy.screensGroup}
      onToggle={onToggle}
    >
      {shown.map((screen) => (
        <ScreenRow
          key={screen.route}
          onOpenRoute={onOpenRoute}
          projectId={projectId}
          route={screen.route}
        />
      ))}
      {isLoading && <p className="ide-empty">{copy.loadingScreens}</p>}
      {!isLoading && shown.length === 0 && (
        <p className="ide-empty">{copy.noScreens}</p>
      )}
    </WorkspaceGroup>
  );
};

export { ScreensGroup };
