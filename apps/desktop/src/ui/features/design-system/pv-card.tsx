import type { ReactElement } from "react";

import { COPY } from "./copy.js";

const PvCard = ({ name }: { name: string }): ReactElement => (
  <div className="pv-card">
    <h4>{name}</h4>
    <p>{COPY.textCardsTextAndControls}</p>
    <div className="pv-row">
      <span className="pv-btn primary">{COPY.textPrimary}</span>
      <span className="pv-btn accent">{COPY.textAccent}</span>
      <span className="pv-btn outline">{COPY.labelOutline}</span>
    </div>
    <span className="pv-input">{COPY.textNameExampleCom}</span>
  </div>
);

export { PvCard };
