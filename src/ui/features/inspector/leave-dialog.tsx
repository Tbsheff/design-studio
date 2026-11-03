import { unsavedLabel, type EditSession } from "../../useEditSession.js";
import { useModalDialog } from "../../usePopover.js";
import { copy } from "./copy.js";

const LeaveDialog = ({ session }: { session: EditSession }) => {
  const dialog = useModalDialog(() => void session.answer("cancel"));

  return (
    <dialog
      ref={dialog.ref}
      className="modal edit-leave-dialog"
      style={{ width: "min(400px, 100%)" }}
      aria-labelledby="edit-leave-title"
      aria-describedby="edit-leave-text"
      onMouseDown={dialog.onMouseDown}
    >
      <div className="modal-head">
        <div className="titles">
          <h2 id="edit-leave-title">{copy.leaveTitle}</h2>
          <p id="edit-leave-text">
            You have {unsavedLabel(session.net).toLowerCase()}. Save version
            keeps them as one version. Discard removes them.
          </p>
          {session.error && <p className="edit-leave-error">{session.error}</p>}
        </div>
      </div>
      <div className="modal-foot">
        <button
          type="button"
          className="btn ghost small"
          onClick={() => void session.answer("cancel")}
        >
          {copy.cancel}
        </button>
        <button
          type="button"
          className="btn small"
          disabled={session.busy !== null || session.blocked !== null}
          onClick={() => void session.answer("discard")}
        >
          {copy.discard}
        </button>
        <button
          type="button"
          className="btn small primary"
          data-autofocus
          disabled={session.busy !== null}
          onClick={() => void session.answer("save")}
        >
          {copy.saveVersion}
        </button>
      </div>
    </dialog>
  );
};

export { LeaveDialog };
