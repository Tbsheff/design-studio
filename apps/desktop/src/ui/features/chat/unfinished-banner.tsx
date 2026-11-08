import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface UnfinishedBannerProps {
  count: number;
  busy: boolean;
  runStopped: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

const UnfinishedBanner = ({
  count,
  busy,
  runStopped,
  onKeep,
  onDiscard,
}: UnfinishedBannerProps): ReactElement => (
  <div className="banner" role="status">
    <Icon name="alert" />
    <span>
      {copy.unfinishedChangesIn}
      {count}
      {copy.file}
      {count === 1 && ""}
      {count !== 1 && "s"}
    </span>
    <span className="sub">
      {runStopped && "A run stopped before it saved a version."}
      {!runStopped && "Files changed outside a run since the last version."}
    </span>
    <div className="spacer" />
    <button
      type="button"
      className="btn small ghost danger"
      disabled={busy}
      onClick={onDiscard}
    >
      {copy.discard}
    </button>
    <button
      type="button"
      className="btn small"
      disabled={busy}
      onClick={onKeep}
    >
      {copy.keep}
    </button>
  </div>
);

export { UnfinishedBanner };

export type { UnfinishedBannerProps };
