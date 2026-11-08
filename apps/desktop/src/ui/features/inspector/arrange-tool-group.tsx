import type { SelectionContext } from "@design-studio/contracts";
import type { ReactElement } from "react";

import type { ArrangeAction } from "../../../shared/arrange.js";
import { getMinCount } from "./arrange-model.js";
import type { Tool } from "./arrange-model.js";
import { copy } from "./copy.js";
import { ToolButton } from "./tool-button.js";

interface ArrangeToolGroupProps {
  readonly isBusy: boolean;
  readonly onRun: (action: ArrangeAction) => void;
  readonly selection: SelectionContext[];
  readonly tools: readonly Tool[];
}

const toWhy = (tool: Tool, selection: SelectionContext[]): string | null => {
  const need = getMinCount(tool.action, selection);

  if (selection.length < need) {
    return `${copy.select} ${need} ${copy.orMoreElements}`;
  }

  return null;
};

const ArrangeToolGroup = ({
  isBusy,
  onRun,
  selection,
  tools,
}: ArrangeToolGroupProps): ReactElement => (
  <>
    {tools.map((tool) => {
      const why = toWhy(tool, selection);

      return (
        <ToolButton
          key={tool.key}
          tool={tool}
          isDisabled={isBusy || why !== null}
          why={why}
          onRun={onRun}
        />
      );
    })}
  </>
);

export { ArrangeToolGroup };
