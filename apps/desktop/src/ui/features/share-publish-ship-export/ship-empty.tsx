import { CopyButton, Icon } from "@design-studio/ui";
import type { ReactElement } from "react";

import { STATUS_ROLE } from "./aria-roles.js";
import { copy } from "./copy.js";
import { FIRST_COMMIT } from "./ship-model.js";

interface ShipEmptyProps {
  readonly text: string | null;
}

const ShipEmpty = ({ text }: ShipEmptyProps): ReactElement => (
  <div className="ship-empty" role={STATUS_ROLE}>
    <span className="ship-empty-icon" aria-hidden="true">
      <Icon name="branch" size={16} />
    </span>
    <p className="ship-empty-title">{text ?? copy.nothingToShip}</p>
    <p className="ship-empty-text">{copy.runThisInThe}</p>
    <div className="ship-empty-command">
      <code>{FIRST_COMMIT}</code>
      <CopyButton text={FIRST_COMMIT} label={copy.copyCommandLabel} />
    </div>
  </div>
);

export { ShipEmpty };
