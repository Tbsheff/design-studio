import type { ReactElement } from "react";

import { toChoice } from "./choose-text.js";
import { COPY } from "./copy.js";
import { toWritesText } from "./port-model.js";
import type { PortForm } from "./use-port-form.js";

const FormFoot = ({
  form,
  isBusy,
  count,
  appName,
  onClose,
}: {
  form: PortForm;
  isBusy: boolean;
  count: number;
  appName: string;
  onClose: () => void;
}): ReactElement => {
  const noApp = form.targets.apps?.length === 0;

  return (
    <div className="modal-foot">
      {!noApp && form.chosenApp && (
        <span className="port-foot-note">
          {toWritesText(count, appName, form.update)}
        </span>
      )}
      <span className="port-spacer" />
      <button type="button" className="btn ghost" onClick={onClose}>
        {COPY.textCancel}
      </button>
      <button
        type="submit"
        className="btn primary"
        disabled={noApp || !form.isReady || isBusy}
      >
        {toChoice(isBusy, COPY.textStarting, COPY.textStartRun)}
      </button>
    </div>
  );
};

export { FormFoot };
