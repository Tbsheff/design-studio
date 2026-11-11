import type { ReactElement } from "react";
import { useCallback } from "react";

import type { StarterId, WorkspaceStarter } from "./workspace-model.js";

interface StarterCardProps {
  readonly isActive: boolean;
  readonly onStarter: (id: StarterId) => void;
  readonly starter: WorkspaceStarter;
}

const StarterCard = ({
  isActive,
  onStarter,
  starter,
}: StarterCardProps): ReactElement => {
  const handlePick = useCallback((): void => {
    onStarter(starter.id);
  }, [onStarter, starter.id]);

  return (
    <button
      type="button"
      className="ide-starter"
      aria-pressed={isActive}
      onClick={handlePick}
    >
      <strong>{starter.title}</strong>
      <span>{starter.sub}</span>
    </button>
  );
};

export { StarterCard };
