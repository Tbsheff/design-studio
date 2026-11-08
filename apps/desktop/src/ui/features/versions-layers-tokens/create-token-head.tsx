import type { ReactNode } from "react";

import { COPY } from "./copy.js";

const CreateTokenHead = (): ReactNode => (
  <div className="modal-head">
    <div className="titles">
      <h2>{COPY.tokenCreateTitle}</h2>
      <p>{COPY.tokenCreateIntro}</p>
    </div>
  </div>
);

export { CreateTokenHead };
