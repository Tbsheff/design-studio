import type { ReactElement } from "react";

import { copy } from "./copy.js";

const BlockPanel = (): ReactElement => (
  <ul className="ui-menu">
    <li>{copy.title}</li>
  </ul>
);

export { BlockPanel };
