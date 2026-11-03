import { Icon } from "../../kit/Icon.js";

interface Props {
  count: number;
  busy: boolean;
  runStopped: boolean;
  onKeep: () => void;
  onDiscard: () => void;
}

export const UnfinishedBanner = ({
  count,
  busy,
  runStopped,
  onKeep,
  onDiscard,
}: Props) => (
  <div className="banner" role="status">
    <Icon name="alert" />
    <span>
      Unfinished changes in {count} file{count === 1 ? "" : "s"}
    </span>
    <span className="sub">
      {runStopped
        ? "A run stopped before it saved a version."
        : "Files changed outside a run since the last version."}
    </span>
    <div className="spacer" />
    <button
      className="btn small ghost danger"
      disabled={busy}
      onClick={onDiscard}
    >
      Discard
    </button>
    <button className="btn small" disabled={busy} onClick={onKeep}>
      Keep
    </button>
  </div>
);
