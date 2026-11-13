import type { ReactElement } from "react";

import { copy } from "./copy.js";

interface EditAppConfirmHeadProps {
  readonly path: string;
}

const EditAppConfirmHead = ({
  path,
}: EditAppConfirmHeadProps): ReactElement => (
  <div className="modal-head">
    <div className="titles">
      <h2>{copy.editAppConfirmTitle}</h2>
      <p>
        {copy.editAppConfirmLead}
        {path}
        {copy.editAppConfirmNote}
      </p>
    </div>
  </div>
);

export { EditAppConfirmHead };
