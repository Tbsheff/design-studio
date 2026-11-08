import type { ReactElement, Ref, RefObject } from "react";

import { DIALOG_ROLE } from "./aria-role-model.js";
import { copy } from "./copy.js";
import { toPlural } from "./plural-model.js";

interface SaveAnywayPopProps {
  readonly confirmRef: RefObject<HTMLButtonElement | null>;
  readonly count: number;
  readonly id: string;
  readonly onCancel: () => void;
  readonly onConfirm: () => void;
  readonly popRef: Ref<HTMLDivElement>;
}

const SaveAnywayPop = ({
  confirmRef,
  count,
  id,
  onCancel,
  onConfirm,
  popRef,
}: SaveAnywayPopProps): ReactElement => (
  <div
    ref={popRef}
    id={id}
    className="ui-popover draft-confirm"
    role={DIALOG_ROLE}
    aria-label={copy.saveAnyway}
  >
    <p>
      {copy.theCheckFound}
      {count}
      {copy.problem}
      {toPlural(count)}
      {copy.saveAnyway2}
    </p>
    <div className="draft-confirm-actions">
      <button type="button" className="btn ghost small" onClick={onCancel}>
        {copy.cancel}
      </button>
      <button
        ref={confirmRef}
        type="button"
        className="btn primary small"
        onClick={onConfirm}
      >
        {copy.saveAnyway}
      </button>
    </div>
  </div>
);

export { SaveAnywayPop };
