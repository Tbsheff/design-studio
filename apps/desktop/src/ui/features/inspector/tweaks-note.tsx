import { startTransition, useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EditSession } from "./use-edit-session.js";

const toDiscardLabel = (busy: EditSession["busy"]): string => {
  if (busy === "discard") {
    return copy.discarding;
  }

  return copy.discard;
};

const toSaveLabel = (busy: EditSession["busy"]): string => {
  if (busy === "save") {
    return copy.saving;
  }

  return copy.saveVersion;
};

const TweaksNote = ({
  session,
}: {
  readonly session: EditSession;
}): ReactElement => {
  const { discard, save } = session;

  const discardEdits = useCallback(() => {
    startTransition(async () => {
      await discard();
    });
  }, [discard]);

  const saveEdits = useCallback(() => {
    startTransition(async () => {
      await save();
    });
  }, [save]);

  return (
    <div className="edit-tweaks-note">
      <p className="ins-note">{copy.tweaksNote}</p>
      <div className="edit-leave-actions">
        <button
          type="button"
          className="btn ghost small"
          disabled={session.busy !== null || session.blocked !== null}
          data-tip={session.blocked}
          onClick={discardEdits}
        >
          {toDiscardLabel(session.busy)}
        </button>
        <button
          type="button"
          className="btn small primary"
          disabled={session.busy !== null}
          onClick={saveEdits}
        >
          {toSaveLabel(session.busy)}
        </button>
      </div>
    </div>
  );
};

export { TweaksNote };
