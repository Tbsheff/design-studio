import type { Starter } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
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
      <span className="ui-chip">
        {template.label}
        {copy.starter}
      </span>
      <button
        type="button"
        className="link"
        disabled={busy !== null}
        onClick={() => onOpen(starter)}
      >
        {busy === "starter" ? "Opening…" : "Open it now"}
      </button>
      <span className="home-starter-hint">{copy.noAgentRunNoCost}</span>
    </div>
  );
};

export { StarterRow };
