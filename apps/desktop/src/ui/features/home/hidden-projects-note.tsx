import { shortenHome } from "@design-studio/contracts/folders";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { useHiddenProjects } from "./use-hidden-projects.js";

const toHiddenText = (count: number): string => {
  if (count === 1) {
    return "1 project is in the app's hidden folder";
  }

  return `${count} projects are in the app's hidden folder`;
};

const toMoveText = (
  isMoving: boolean,
  target: string,
  homeDir: string | null
): string => {
  if (isMoving) {
    return "Moving…";
  }

  return `Move to ${shortenHome(target, homeDir)}`;
};

const HiddenProjectsNote = ({
  homeDir,
  onMoved,
}: {
  readonly homeDir: string | null;
  readonly onMoved: () => void;
}): ReactElement | null => {
  const { error, hidden, isMoving, move } = useHiddenProjects(onMoved);

  const handleMove = useCallback((): void => {
    move();
  }, [move]);

  if (!hidden || hidden.count === 0) {
    return null;
  }

  return (
    <output className="home-hidden-note">
      <span>{toHiddenText(hidden.count)}</span>
      <button
        type="button"
        className="btn small"
        onClick={handleMove}
        disabled={isMoving}
      >
        {toMoveText(isMoving, hidden.target, homeDir)}
      </button>
      {error && <span className="home-hidden-error">{error}</span>}
    </output>
  );
};

export { HiddenProjectsNote };
