import type { ToolDiff } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { ActionLabel } from "../../ai/components/ai/action-label.js";
import { ActionTrigger } from "../../ai/components/ai/action-trigger.js";
import { Chip } from "../../ai/components/ai/chip.js";
import type { ToolRow } from "./run-state-model.js";
import { toStyled, toStyledByKey } from "./styled.js";
import type { RowGroup, ToolState } from "./tool-chips-model.js";
import { ToolIconSlot } from "./tool-icon-slot.js";
import { toIconTool, toTargetText } from "./tool-item-model.js";
import { ToolMeta } from "./tool-meta.js";
import { VERB_CLASSES, toVariantKey } from "./tool-state-model.js";

const Trigger = toStyled(
  ActionTrigger,
  "tool-trigger max-w-full min-w-0 min-h-6 text-xs"
);

const TargetChip = toStyled(Chip, "tool-target min-w-0 truncate font-mono");
const Verb = toStyledByKey(ActionLabel, VERB_CLASSES);

interface ToolTriggerProps {
  readonly group: RowGroup;
  readonly state: ToolState;
  readonly tool: ToolRow;
  readonly tip: string;
  readonly edits: ToolDiff[];
  readonly target: string;
  readonly verb: string;
  readonly totals: Parameters<typeof ToolMeta>[0]["totals"];
  readonly isSkill: boolean;
  readonly isMixed: boolean;
}

const ToolTrigger = ({
  group,
  state,
  tool,
  tip,
  edits,
  target,
  verb,
  totals,
  isSkill,
  isMixed,
}: ToolTriggerProps): ReactElement => (
  <Trigger data-tip={tip}>
    <ToolIconSlot state={state} tool={toIconTool(tool, edits)} />
    <Verb data-variant={toVariantKey(state, isSkill)}>{verb}</Verb>
    {target && (
      <TargetChip size="sm">
        {toTargetText(target, isSkill || isMixed)}
      </TargetChip>
    )}
    <ToolMeta group={group} state={state} totals={totals} />
  </Trigger>
);

export { ToolTrigger };
