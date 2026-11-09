import type { ReactElement } from "react";
import { useCallback } from "react";

import { TreeRow } from "./tree-row.js";

interface ScreenRowProps {
  readonly onOpenRoute: (projectId: string, route: string) => void;
  readonly projectId: string;
  readonly route: string;
}

const ScreenRow = ({
  onOpenRoute,
  projectId,
  route,
}: ScreenRowProps): ReactElement => {
  const handleOpen = useCallback((): void => {
    onOpenRoute(projectId, route);
  }, [onOpenRoute, projectId, route]);

  return (
    <TreeRow
      depth={2}
      isPinned={false}
      isSelected={false}
      meta={null}
      onClick={handleOpen}
    >
      {route}
    </TreeRow>
  );
};

export { ScreenRow };
