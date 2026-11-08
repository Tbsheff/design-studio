import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EditSession } from "./use-edit-session.js";

const TweaksNote = ({
  session,
}: {
  readonly session: EditSession;
}): ReactElement => (
  <div className="edit-tweaks-note">
    <p className="ins-note">{copy.tweaksNote}</p>
    <div className="edit-leave-actions">
      <button
        type="button"
        className="btn ghost small"
        disabled={session.busy !== null || session.blocked !== null}
        data-tip={session.blocked ?? undefined}
        onClick={() => void session.discard()}
      >
        {session.busy === "discard" ? copy.discarding : copy.discard}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={session.busy !== null}
        onClick={() => void session.save()}
      >
        {session.busy === "save" ? copy.saving : copy.saveVersion}
      </button>
    </div>
  </div>
);

export { TweaksNote };
