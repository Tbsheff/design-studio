import type { ShipResult } from "@design-studio/contracts/ship";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-roles.js";
import { copy } from "./copy.js";
import { ShipFormatWarning } from "./ship-format-warning.js";
import { ShipResultFacts } from "./ship-result-facts.js";
import { ShipResultLead } from "./ship-result-lead.js";

interface ShipResultViewProps {
  readonly result: ShipResult;
  readonly onClose: () => void;
}

const ShipResultView = ({
  onClose,
  result,
}: ShipResultViewProps): ReactElement => (
  <>
    <div className="modal-body ship-result" role={STATUS_ROLE}>
      <ShipResultLead result={result} />
      <ShipResultFacts result={result} />
      {result.format && result.format.errors.length > 0 && (
        <ShipFormatWarning format={result.format} />
      )}
      {result.prError && (
        <div className="alert warn small" role="alert">
          {result.prError}
        </div>
      )}
      {result.mode === "branch" && (
        <p className="field-help">{`${copy.toSeeIt} ${result.branch}`}</p>
      )}
    </div>
    <div className="modal-foot">
      <span className="ship-spacer" />
      <button
        type="button"
        className="btn primary"
        data-autofocus
        onClick={onClose}
      >
        {copy.done}
      </button>
    </div>
  </>
);

export { ShipResultView };
