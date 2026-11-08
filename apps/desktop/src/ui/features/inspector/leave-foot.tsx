import { useCallback, useTransition } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import type { EditSession } from "./use-edit-session.js";

const LeaveFoot = ({
  session,
}: {
  readonly session: EditSession;
}): ReactElement => {
  const [, startTransition] = useTransition();

  const cancel = useCallback(() => {
    startTransition(async () => {
      await session.answer("cancel");
    });
  }, [session]);

  const discard = useCallback(() => {
    startTransition(async () => {
      await session.answer("discard");
    });
  }, [session]);

  const save = useCallback(() => {
    startTransition(async () => {
      await session.answer("save");
    });
  }, [session]);

  return (
    <div className="modal-foot">
      <button type="button" className="btn ghost small" onClick={cancel}>
        {copy.cancel}
      </button>
      <button
        type="button"
        className="btn small"
        disabled={session.busy !== null || session.blocked !== null}
        onClick={discard}
      >
        {copy.discard}
      </button>
      <button
        type="button"
        className="btn small primary"
        data-autofocus
        disabled={session.busy !== null}
        onClick={save}
      >
        {copy.saveVersion}
      </button>
    </div>
  );
};

export { LeaveFoot };
