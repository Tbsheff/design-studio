import { useCallback, useState } from "react";
import type { ChangeEvent, FormEvent, ReactElement } from "react";

import { copy } from "./copy.js";
import type { PermissionDecision } from "./deps.js";

interface ApprovalActionsProps {
  readonly answer: (decision: PermissionDecision) => Promise<void>;
  readonly busy: boolean;
}

const ApprovalActions = ({
  answer,
  busy,
}: ApprovalActionsProps): ReactElement => {
  const [denying, setDenying] = useState(false);

  const [note, setNote] = useState("");

  const allow = useCallback(() => answer({ allow: true }), [answer]);

  const startDeny = useCallback(() => setDenying(true), []);

  const changeNote = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setNote(event.target.value),
    []
  );

  const submitDeny = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      const text = note.trim();
      const decision: PermissionDecision = { allow: false };

      if (text) {
        decision.note = text;
      }

      return answer(decision);
    },
    [answer, note]
  );

  if (denying) {
    return (
      <form className="permission-deny" onSubmit={submitDeny}>
        <input
          className="input small"
          name="note"
          aria-label={copy.denyNoteLabel}
          placeholder={copy.denyNote}
          value={note}
          onChange={changeNote}
        />
        <button type="submit" className="btn small danger" disabled={busy}>
          {copy.deny}
        </button>
      </form>
    );
  }

  return (
    <div className="permission-actions">
      <button
        type="button"
        className="btn small primary"
        disabled={busy}
        onClick={allow}
      >
        {copy.allow}
      </button>
      <button
        type="button"
        className="btn small"
        disabled={busy}
        onClick={startDeny}
      >
        {copy.denyWithNote}
      </button>
    </div>
  );
};

export { ApprovalActions };
