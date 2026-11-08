import type { Project } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

const THUMB_ICON_SIZE = 20;

interface ContinueThumbProps {
  readonly project: Project;
  readonly thumb: string | null;
  readonly onOpen: (project: Project) => void;
}

const ContinueThumb = ({
  project,
  thumb,
  onOpen,
}: ContinueThumbProps): ReactElement => {
  const open = useCallback((): void => {
    onOpen(project);
  }, [onOpen, project]);

  if (thumb) {
    return (
      <button
        type="button"
        className="home-continue-thumb"
        tabIndex={-1}
        aria-hidden="true"
        onClick={open}
      >
        <img src={thumb} alt="" draggable={false} />
      </button>
    );
  }

  if (project.app) {
    return (
      <button
        type="button"
        className="home-continue-thumb"
        tabIndex={-1}
        aria-hidden="true"
        onClick={open}
      >
        <Icon name="code" size={THUMB_ICON_SIZE} />
      </button>
    );
  }

  return (
    <button
      type="button"
      className="home-continue-thumb"
      tabIndex={-1}
      aria-hidden="true"
      onClick={open}
    >
      <Icon name="frame" size={THUMB_ICON_SIZE} />
    </button>
  );
};

export { ContinueThumb };
