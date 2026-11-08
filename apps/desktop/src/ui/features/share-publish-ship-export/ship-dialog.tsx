import { useModalDialog } from "@design-studio/ui";
import { useCallback, useMemo } from "react";
import type { ReactElement } from "react";

import "../../styles/ship.css";
import { copy } from "./copy.js";
import { ShipDialogBody } from "./ship-dialog-body.js";
import { ShipDialogFoot } from "./ship-dialog-foot.js";
import { ShipDialogHead } from "./ship-dialog-head.js";
import { fieldsOf, leadText, shipRequestOf } from "./ship-model.js";
import { ShipResultView } from "./ship-result-view.js";
import { useShipPlan } from "./use-ship-plan.js";
import { useShipSubmit } from "./use-ship-submit.js";

interface Props {
  projectId: string;
  onClose: () => void;
}

const ShipDialog = ({ onClose, projectId }: Props): ReactElement => {
  const {
    draft,
    focus,
    loadError,
    patchDraft,
    plan,
    selectBase,
    setFocus,
    toggleFile,
  } = useShipPlan(projectId);

  const fields = useMemo(
    () => (plan && draft ? fieldsOf(plan, draft) : null),
    [plan, draft]
  );

  const request = shipRequestOf(plan, draft, fields);
  const { failure, isBusy, result, submit } = useShipSubmit(projectId, request);

  const closeUnlessBusy = useCallback((): boolean | void => {
    if (isBusy) {
      return false;
    }

    onClose();
  }, [isBusy, onClose]);

  const dialog = useModalDialog(closeUnlessBusy);

  return (
    <dialog
      ref={dialog.ref}
      className="modal ship-dialog"
      aria-label={copy.shipAsA}
      onMouseDown={dialog.onMouseDown}
    >
      <form className="modal-form" onSubmit={submit} noValidate>
        <ShipDialogHead
          lead={leadText(plan)}
          isBusy={isBusy}
          onClose={onClose}
        />
        {result && <ShipResultView result={result} onClose={onClose} />}
        {!result && (
          <ShipDialogBody
            plan={plan}
            draft={draft}
            fields={fields}
            focus={focus}
            shown={failure ?? loadError}
            onFocus={setFocus}
            onToggle={toggleFile}
            onBase={selectBase}
            onPatch={patchDraft}
          />
        )}
        {!result && (
          <ShipDialogFoot
            plan={plan}
            draft={draft}
            count={draft?.files.size ?? 0}
            canSubmit={request !== null}
            isBusy={isBusy}
            onClose={onClose}
          />
        )}
      </form>
    </dialog>
  );
};

export { ShipDialog };

export type { Props };
