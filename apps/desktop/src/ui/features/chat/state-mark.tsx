import type { DraftSourceStatus } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

const MARK_SIZE = 12;

const StateMark = ({
  state,
}: {
  state: DraftSourceStatus["state"];
}): ReactElement => {
  if (state === "reading") {
    return <span className="spinner" aria-hidden="true" />;
  }

  if (state === "read") {
    return <Icon name="check" size={MARK_SIZE} />;
  }

  if (state === "blocked" || state === "failed") {
    return <Icon name="alert" size={MARK_SIZE} />;
  }

  return <span className="ds-src-dot" aria-hidden="true" />;
};

export { StateMark };
