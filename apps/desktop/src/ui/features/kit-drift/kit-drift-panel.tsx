import type { ReactElement } from "react";

import { copy } from "./copy.js";

const KitDriftPanel = (): ReactElement => (
  <ul className="ui-menu">
    <li>{copy.title}</li>
  </ul>
);

export { KitDriftPanel };
