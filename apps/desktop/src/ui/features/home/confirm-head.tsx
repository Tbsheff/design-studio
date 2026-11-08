import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { hasFolderStaying, toConfirmWhat } from "./trash-model.js";
import type { Confirm } from "./trash-model.js";

interface ConfirmHeadProps {
  readonly confirm: Confirm;
  readonly title: string;
}

const ConfirmHead = ({ confirm, title }: ConfirmHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{title}</h2>
      <p>
        {toConfirmWhat(confirm)}
        {hasFolderStaying(confirm) && copy.filesInFolderStay}
      </p>
    </div>
  </div>
);

export { ConfirmHead };
