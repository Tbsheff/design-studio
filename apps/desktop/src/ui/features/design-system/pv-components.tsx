import type { ReactElement } from "react";

import { COPY } from "./copy.js";
import { PvAlert } from "./pv-alert.js";
import { PvCard } from "./pv-card.js";

const PvComponents = ({ name }: { name: string }): ReactElement => (
  <div className="pv-components">
    <PvCard name={name} />
    <div className="pv-alerts">
      <PvAlert tone="success" text={COPY.textSaved} />
      <PvAlert tone="warning" text={COPY.textCheckThis} />
      <PvAlert tone="danger" text={COPY.textCouldNotSave} />
    </div>
  </div>
);

export { PvComponents };
