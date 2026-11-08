import type { ReactElement, ReactNode } from "react";

import { toBoxName } from "./box-model-model.js";
import type { Box, DeclaredMargins } from "./box-model-model.js";
import type { DirectEdit } from "./deps.js";
import { LinkToggle } from "./link-toggle.js";
import { SideInput } from "./side-input.js";

interface Props {
  readonly box: Box;
  readonly edit: DirectEdit;
  readonly isLinked: boolean;
  readonly onToggle: () => void;
  readonly declared: DeclaredMargins;
  readonly children: ReactNode;
}

const BoxRing = ({
  box,
  edit,
  isLinked,
  onToggle,
  declared,
  children,
}: Props): ReactElement => (
  <div className={`box-ring ${box}`}>
    <div className="box-ring-head">
      <span className="box-ring-label">{toBoxName(box)}</span>
      <LinkToggle box={box} isLinked={isLinked} onToggle={onToggle} />
    </div>
    <SideInput
      box={box}
      side="top"
      edit={edit}
      isLinked={isLinked}
      declared={declared}
    />
    <SideInput
      box={box}
      side="left"
      edit={edit}
      isLinked={isLinked}
      declared={declared}
    />
    <div className="box-ring-core">{children}</div>
    <SideInput
      box={box}
      side="right"
      edit={edit}
      isLinked={isLinked}
      declared={declared}
    />
    <SideInput
      box={box}
      side="bottom"
      edit={edit}
      isLinked={isLinked}
      declared={declared}
    />
  </div>
);

export { BoxRing };
