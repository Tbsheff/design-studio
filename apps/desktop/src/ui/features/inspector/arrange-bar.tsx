import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { ArrangeAction } from "../../../shared/arrange.js";
import { ALIGN_TOOLS, SPACE_TOOLS } from "./arrange-model.js";
import { ArrangeToolGroup } from "./arrange-tool-group.js";
import { copy } from "./copy.js";

interface ArrangeBarProps {
  readonly selection: SelectionContext[];
  readonly isBusy: boolean;
  readonly onRun: (action: ArrangeAction) => void;
}

const ArrangeBar = ({
  selection,
  isBusy,
  onRun,
}: ArrangeBarProps): ReactElement => (
  <div
    className="ins-tools ins-arrange"
    role="toolbar"
    aria-label={copy.arrange}
  >
    <ArrangeToolGroup
      tools={ALIGN_TOOLS}
      selection={selection}
      isBusy={isBusy}
      onRun={onRun}
    />
    <span className="ins-tools-sep" aria-hidden="true" />
    <ArrangeToolGroup
      tools={SPACE_TOOLS}
      selection={selection}
      isBusy={isBusy}
      onRun={onRun}
    />
  </div>
);

export { ArrangeBar };
