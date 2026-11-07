import { copy } from "./copy.js";
import { unsavedLabel } from "./use-edit-session.js";
import type { EditSession, SessionAction } from "./use-edit-session.js";

const SessionHeader = ({
  session,
  onDone,
}: {
  readonly session: EditSession;
  readonly onDone: (action: SessionAction) => void;
}) => {
  const blockedDiscard = session.blocked !== null;

  const run = async (action: SessionAction) => {
    if (await (action === "save" ? session.save() : session.discard())) {
      onDone(action);
    }
  };

  return (
    <div className="edit-head">
      <h2 className="edit-title">{copy.editTitle}</h2>
      {session.dirty && session.net > 0 && (
        <span
          className="edit-count"
          role="status"
          data-tip={unsavedLabel(session.net)}
        >
          {session.net}
          <span className="sr-only"> unsaved edits</span>
        </span>
      )}
      <span className="edit-head-end" />
      <button
        type="button"
        className="btn ghost small"
        disabled={
          session.busy !== null || session.count === 0 || blockedDiscard
        }
        data-tip={
          blockedDiscard ? (session.blocked ?? undefined) : copy.discardTip
        }
        data-tip-align="end"
        onClick={() => void run("discard")}
      >
        {session.busy === "discard" ? copy.discarding : copy.discard}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={session.busy !== null}
        data-tip={copy.saveTip}
        data-tip-align="end"
        onClick={() => void run("save")}
      >
        {session.busy === "save" ? copy.saving : copy.saveVersion}
      </button>
    </div>
  );
};

export { SessionHeader };
