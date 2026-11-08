import type { ReactElement, ReactNode } from "react";

import type { MultiEdit } from "./simple-model.js";
import { SimpleSections } from "./simple-sections.js";
import type { TokenUi } from "./use-token-snap.js";

interface MultiFieldsetProps {
  readonly edit: MultiEdit;
  readonly ui: TokenUi | null;
  readonly textStyle: ReactNode;
}

const MultiFieldset = ({
  edit,
  ui,
  textStyle,
}: MultiFieldsetProps): ReactElement => (
  <fieldset className="ins-fieldset" disabled={edit.blocked !== null}>
    <SimpleSections
      edit={edit}
      ui={ui}
      selection={null}
      textStyle={textStyle}
      fill={null}
    />
  </fieldset>
);

export { MultiFieldset };
