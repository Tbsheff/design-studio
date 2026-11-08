import { Icon } from "@design-studio/ui";
import { useCallback, useMemo, useState } from "react";
import type { ReactElement, ReactNode } from "react";

import { ActionContent } from "../../ai/components/ai/action-content.js";
import { ActionIcon } from "../../ai/components/ai/action-icon.js";
import { ActionLabel } from "../../ai/components/ai/action-label.js";
import { ActionTrigger } from "../../ai/components/ai/action-trigger.js";
import { Action } from "../../ai/components/ai/action.js";
import { ChainOfThoughtContent } from "../../ai/components/ai/chain-of-thought-content.js";
import { ChainOfThoughtHeader } from "../../ai/components/ai/chain-of-thought-header.js";
import { ChainOfThoughtIcon } from "../../ai/components/ai/chain-of-thought-icon.js";
import { ChainOfThought } from "../../ai/components/ai/chain-of-thought.js";
import { Chip } from "../../ai/components/ai/chip.js";
import { CheckDetail } from "./check-detail.js";
import { copy } from "./copy.js";
import { GroupSummary } from "./group-summary.js";
import { toPlural } from "./plural-model.js";
import type { ToolRow } from "./run-state-model.js";
import { CHECK_GROUP, COLLAPSE_AFTER, failed } from "./tool-chips-model.js";
import type { RowGroup, ToolState } from "./tool-chips-model.js";
import { ToolDetail } from "./tool-detail.js";
import {
  toEditCount,
  toIconTool,
  toRowClass,
  toSummaryLabel,
  toTargetText,
  toVerbClass,
} from "./tool-item-model.js";
import { SKILL_TOOL } from "./tool-labels-model.js";
import { ToolMeta } from "./tool-meta.js";
import { groupRepeats, rowView, toolState } from "./tool-rows-model.js";
import { ToolStateIcon } from "./tool-state-icon.js";

const TOOL_ICON_SIZE = 14;

const STATE_TONE: Record<ToolState, string> = {
  denied: "text-muted-foreground",
  done: "text-muted-foreground",
  error: "text-destructive",
  pending: "text-primary",
  stopped: "text-muted-foreground",
};

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
    <Action
      className={toRowClass(state, isSkill)}
      data-state={state}
      data-tool={tool.name}
      data-shell-edits={toEditCount(edits)}
      open={open ?? state === "error"}
      onOpenChange={handleOpenChange}
    >
      <ActionTrigger
        className="tool-trigger max-w-full min-w-0 min-h-6 text-xs"
        data-tip={tip}
      >
        <ActionIcon className={STATE_TONE[state]}>
          <ToolStateIcon tool={toIconTool(tool, edits)} state={state} />
        </ActionIcon>
        <ActionLabel className={toVerbClass(state, isSkill)}>
          {verb}
        </ActionLabel>
        {target && (
          <Chip size="sm" className="tool-target min-w-0 truncate font-mono">
            {toTargetText(target, isSkill || isMixed)}
          </Chip>
        )}
        <ToolMeta group={group} state={state} totals={totals} />
      </ActionTrigger>
      <ActionContent className="pl-6">
        {isMixed && <CheckDetail members={group.members} workTree={workTree} />}
        {!isMixed && <ToolDetail tool={tool} target={target} state={state} />}
      </ActionContent>
    </Action>
  );
};

const ToolChips = ({
  tools,
  running,
  workTree,
  flat = false,
}: {
  tools: ToolRow[];
  running: boolean;
  workTree: string | null;
  flat?: boolean;
}): ReactElement | null => {
  const [open, setOpen] = useState<boolean | null>(null);

  const handleOpenChange = useCallback(
    (next: boolean): void => setOpen(next),
    []
  );

  if (tools.length === 0) {
    return null;
  }

  const rows = (
    <div className="tool-list flex flex-col">
      {groupRepeats(tools, workTree).map((group) => (
        <ToolItem
          key={group.tool.toolUseId}
          group={group}
          workTree={workTree}
          running={running}
        />
      ))}
    </div>
  );

  if (flat || tools.length < COLLAPSE_AFTER) {
    return <div className="tools tool-chips">{rows}</div>;
  }

  const expanded = open ?? (running || tools.some((tool) => failed(tool)));

  return (
    <ChainOfThought
      className="tools -ml-2"
      open={expanded}
      onOpenChange={handleOpenChange}
    >
      <ChainOfThoughtHeader className="tools-toggle text-xs">
        <ChainOfThoughtIcon>
          <Icon name="terminal" size={TOOL_ICON_SIZE} />
        </ChainOfThoughtIcon>
        <GroupSummary tools={tools} />
      </ChainOfThoughtHeader>
      <ChainOfThoughtContent className="tool-chips">
        <div className="ml-4 border-l border-border pl-3">{rows}</div>
      </ChainOfThoughtContent>
    </ChainOfThought>
  );
};

const ToolSummary = ({
  tools,
  children,
}: {
  tools: ToolRow[];
  children: ReactNode;
}): ReactElement | null => {
  const [open, setOpen] = useState(false);
  const label = useMemo(() => toSummaryLabel(tools), [tools]);

  const failedCount = useMemo(
    () => tools.filter((tool) => failed(tool)).length,
    [tools]
  );

  const toggle = useCallback((): void => setOpen((value) => !value), []);

  if (tools.length === 0) {
    return null;
  }

  return (
    <div
      className="tool-summary"
      data-open={open || null}
      data-testid="tool-summary"
    >
      <button
        type="button"
        className="tool-summary-head"
        aria-expanded={open}
        data-tip={label}
        onClick={toggle}
      >
        <span className="tool-summary-icon" aria-hidden="true">
          <Icon name="sparkle" size={TOOL_ICON_SIZE} />
        </span>
        <span className="tool-summary-count tabular-nums">
          {tools.length}
          {copy.step}
          {toPlural(tools.length)}
        </span>
        <span className="tool-summary-label">{label}</span>
        {failedCount > 0 && (
          <span className="tool-summary-failed">
            {failedCount}
            {copy.failed2}
          </span>
        )}
        <Icon
          name="chevronDown"
          size={TOOL_ICON_SIZE}
          className="tool-summary-caret"
        />
      </button>
      {open && <div className="tool-summary-body">{children}</div>}
    </div>
  );
};

export { ToolChips, ToolSummary };
