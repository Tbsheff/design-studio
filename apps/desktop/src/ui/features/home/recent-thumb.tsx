import type { Project } from "@design-studio/contracts";
import type { ReactElement } from "react";
import { useCallback } from "react";

import { useThumbnail } from "./use-thumbnail.js";

const THUMB_WIDTH = 320;
const THUMB_HEIGHT = 200;

interface RecentThumbProps {
  readonly onOpen: (projectId: string) => void;
  readonly project: Project;
}

const RecentThumb = ({ onOpen, project }: RecentThumbProps): ReactElement => {
  const url = useThumbnail(project);

  const handleOpen = useCallback((): void => {
    onOpen(project.id);
  }, [onOpen, project.id]);

  return (
    <button type="button" className="ide-thumb" onClick={handleOpen}>
      <span className="ide-thumb-frame">
        {url !== null && (
          <img
            src={url}
            alt=""
            width={THUMB_WIDTH}
            height={THUMB_HEIGHT}
            draggable={false}
          />
        )}
      </span>
      <span className="ide-thumb-name">{project.name}</span>
    </button>
  );
};

export { RecentThumb };
