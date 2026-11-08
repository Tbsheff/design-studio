import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { Busy } from "./home-model.js";

const StarterRow = ({
  template,
  busy,
  onOpen,
}: {
  readonly template: {
    readonly label: string;
    readonly starter: Starter | null;
  } | null;
  readonly busy: Busy;
  readonly onOpen: (starter: Starter) => void;
}): ReactElement | null => {
  const starter = template?.starter;

  if (!template || !starter) {
    return null;
  }

  return (
    <div className="home-starter-row">
      <span className="ui-chip">{template.label} starter</span>
      <button
        type="button"
        className="link"
        disabled={busy !== null}
        onClick={() => onOpen(starter)}
      >
        {busy === "starter" ? "Opening…" : "Open it now"}
      </button>
      <span className="home-starter-hint">No agent run, no cost</span>
    </div>
  );
};

export { StarterRow };
