import type { ReactElement } from "react";

import { NO_MARGINS } from "./box-model-model.js";
import { BoxRing } from "./box-ring.js";
import type { DirectEdit } from "./deps.js";

interface Props {
  readonly edit: DirectEdit;
  readonly isLinked: boolean;
  readonly onToggle: () => void;
}

const BoxPadding = ({ edit, isLinked, onToggle }: Props): ReactElement => (
  <BoxRing
    box="padding"
    edit={edit}
    isLinked={isLinked}
    declared={NO_MARGINS}
    onToggle={onToggle}
  >
    <span className="box-content" aria-hidden="true" />
  </BoxRing>
);

export { BoxPadding };
