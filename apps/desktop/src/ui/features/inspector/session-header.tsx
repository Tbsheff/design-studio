import { startTransition, useCallback } from "react";
import type { ReactElement } from "react";

import { toChoice } from "./choice-model.js";
import { copy } from "./copy.js";
import { toUnsavedLabel } from "./use-edit-session.js";
import type { EditSession, SessionAction } from "./use-edit-session.js";

const SessionHeader = ({
  session,
  onDone,
}: {
  readonly session: EditSession;
  readonly onDone: (action: SessionAction) => void;
}): ReactElement => {
  const { discard, save } = session;

  const discardTip = session.blocked ?? copy.discardTip;

  const finish = useCallback(
    async (action: SessionAction): Promise<void> => {
      const ok = await toChoice(action === "save", save, discard)();

      if (ok) {
        onDone(action);
      }
    },
    [discard, onDone, save]
  );

  const discardEdits = useCallback(() => {
    startTransition(async () => {
      await finish("discard");
    });
  }, [finish]);

  const saveEdits = useCallback(() => {
    startTransition(async () => {
      await finish("save");
    });
  }, [finish]);

  return (
    <div className="edit-head">
      <h2 className="edit-title">{copy.editTitle}</h2>
      {session.isDirty && session.net > 0 && (
        <output className="edit-count" data-tip={toUnsavedLabel(session.net)}>
          {session.net}
          <span className="sr-only"> {copy.unsavedEdits}</span>
        </output>
      )}
      <span className="edit-head-end" />
      <button
        type="button"
        className="btn ghost small"
        disabled={
          session.busy !== null ||
          session.count === 0 ||
          session.blocked !== null
        }
        data-tip={discardTip}
        data-tip-align="end"
        onClick={discardEdits}
      >
        {toChoice(session.busy === "discard", copy.discarding, copy.discard)}
      </button>
      <button
        type="button"
        className="btn small primary"
        disabled={session.busy !== null}
        data-tip={copy.saveTip}
        data-tip-align="end"
        onClick={saveEdits}
      >
        {toChoice(session.busy === "save", copy.saving, copy.saveVersion)}
      </button>
    </div>
  );
};

export { SessionHeader };
