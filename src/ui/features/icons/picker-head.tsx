import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface PickerHeadProps {
  readonly hintId: string;
  readonly title: string;
}

const PickerHead = ({ hintId, title }: PickerHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p id={hintId}>{copy.searchHint}</p>
    </div>
  </div>
);

export { PickerHead };
