import type { ReactElement } from "react";

import { copy } from "./copy";

interface StudioBootProps {
  readonly message: string | null;
  readonly onExit: () => void;
}

const StudioBoot = ({ message, onExit }: StudioBootProps): ReactElement => {
  if (message === null) {
    return <div className="boot muted">{copy.loadingProject}</div>;
  }

  return (
    <div className="boot">
      <div className="boot-card">
        <h1>{copy.cannotOpenProject}</h1>
        <p className="muted">{message}</p>
        <button type="button" className="btn" onClick={onExit}>
          {copy.backToProjects}
        </button>
      </div>
    </div>
  );
};

export { StudioBoot };
