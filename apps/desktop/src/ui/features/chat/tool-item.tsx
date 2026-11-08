import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { Action } from "../../ai/components/ai/action.js";
import { toStyledByKey } from "./styled.js";
import { CHECK_GROUP } from "./tool-chips-model.js";
import type { RowGroup } from "./tool-chips-model.js";
import { ToolItemContent } from "./tool-item-content.js";
import { toEditCount } from "./tool-item-model.js";
import { SKILL_TOOL } from "./tool-labels-model.js";
import { rowView, toolState } from "./tool-rows-model.js";
import { ROW_CLASSES, toVariantKey } from "./tool-state-model.js";
import { ToolTrigger } from "./tool-trigger.js";

const RowAction = toStyledByKey(Action, ROW_CLASSES);

const ToolItem = ({
  group,
  workTree,
  running,
}: {
  group: RowGroup;
  workTree: string | null;
  running: boolean;
}): ReactElement => {
  const { tool } = group;
  const state = toolState(tool, running);
  const [open, setOpen] = useState<boolean | null>(null);

  const handleOpenChange = useCallback(
    (next: boolean): void => setOpen(next),
    []
  );

  const isSkill = tool.name === SKILL_TOOL;
  const { edits, target, totals, verb } = rowView(group, workTree);
  const isMixed = verb === CHECK_GROUP;
  const tip = tool.summary || target || tool.name;

  return (
    <RowAction
      data-variant={toVariantKey(state, isSkill)}
      data-state={state}
      data-tool={tool.name}
      data-shell-edits={toEditCount(edits)}
      open={open ?? state === "error"}
      onOpenChange={handleOpenChange}
    >
      <ToolTrigger
        group={group}
        state={state}
        tool={tool}
        tip={tip}
        edits={edits}
        target={target}
        verb={verb}
        totals={totals}
        isSkill={isSkill}
        isMixed={isMixed}
      />
      <ToolItemContent
        isMixed={isMixed}
        members={group.members}
        workTree={workTree}
        tool={tool}
        target={target}
        state={state}
      />
    </RowAction>
  );
};

export { ToolItem };
