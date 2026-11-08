import type { RunStatus } from "@design-studio/contracts";
import { Icon, useReturnFocusOnUnmount } from "@design-studio/ui";
import { useEffect, useRef } from "react";
import type { KeyboardEvent, ReactElement } from "react";

import { formatMs, formatTime, formatUsd } from "../../domain/format.js";
import { copy } from "./copy.js";
import { LatencyBreakdown } from "./latency-breakdown.js";
import type { RunView } from "./run-state-model.js";
import {
  SKILL_TOOL,
  prettyToolName,
  skillToolName,
  toolTarget,
} from "./tool-labels-model.js";

const STATUS_TEXT: Record<RunStatus, string> = {
  budget_exceeded: "Spending limit reached",
  canceled: "Canceled",
  completed: "Completed",
  failed: "Failed",
  running: "Running",
};

const SMALL_COST = new Intl.NumberFormat("en-US", {
  currency: "USD",
  maximumSignificantDigits: 3,
  style: "currency",
});

const preciseUsd = (amount: number): string =>
  amount < 0.01 ? SMALL_COST.format(amount) : `$${amount.toFixed(4)}`;

const costText = (summary: NonNullable<RunView["summary"]>): string => {
  const roundingHidesCost =
    summary.costUsd !== Number(summary.costUsd.toFixed(2));

  const shown = roundingHidesCost
    ? `${formatUsd(summary.costUsd)} (${preciseUsd(summary.costUsd)})`
    : formatUsd(summary.costUsd);

  return summary.status === "canceled" ? `${shown} (estimate)` : shown;
};

const RunDetails = ({
  projectId,
  run,
  onClose,
}: {
  projectId: string;
  run: RunView;
  onClose: () => void;
}): ReactElement => {
  const runSummary = run.summary;

  const rows: [string, string][] = runSummary
    ? [
        ["Status", STATUS_TEXT[runSummary.status] ?? runSummary.status],
        ["Model", runSummary.model],
        ["Cost", costText(runSummary)],
        ["Duration", formatMs(runSummary.durationMs)],
        ["Model time", formatMs(runSummary.modelMs)],
        ["Tool time", formatMs(runSummary.toolMs)],
        ["Input tokens", runSummary.usage.inputTokens.toLocaleString()],
        ["Output tokens", runSummary.usage.outputTokens.toLocaleString()],
        ["Cache read", runSummary.usage.cacheReadTokens.toLocaleString()],
        ["Cache write", runSummary.usage.cacheWriteTokens.toLocaleString()],
        ["Version", runSummary.versionId ?? "None"],
        ["Session", runSummary.sessionId ?? "None"],
      ]
    : [
        ["Status", STATUS_TEXT[run.status] ?? run.status],
        ["Started", formatTime(run.startedAt)],
      ];

  const skills = [
    ...new Set(
      run.tools
        .filter((tool) => tool.name === SKILL_TOOL)
        .map((tool) => skillToolName(tool.input) || "unknown")
    ),
  ];

  rows.push(["Skills used", skills.length > 0 ? skills.join(", ") : "None"]);
  const anyError = run.tools.some((tool) => tool.isError);
  const closeButton = useRef<HTMLButtonElement>(null);
  useReturnFocusOnUnmount();
  useEffect(() => closeButton.current?.focus(), []);

  const onKeyDown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      className="drawer"
      role="dialog"
      aria-label={copy.runDetails}
      onKeyDown={onKeyDown}
    >
      <div className="drawer-head">
        <strong>{copy.runDetails}</strong>
        <div className="spacer" />
        <button
          ref={closeButton}
          className="icon-btn"
          aria-label={copy.close}
          data-tip={copy.close}
          data-tip-align="end"
          onClick={onClose}
        >
          <Icon name="close" />
        </button>
      </div>
      <div className="drawer-body">
        <div className="drawer-id" data-tip={run.runId}>
          <span className="badge">{copy.run}</span>
          <span className="mono muted truncate">{run.runId}</span>
        </div>
        <dl className="kv">
          {rows.map(([name, value]) => (
            <div key={name}>
              <dt>{name}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        <LatencyBreakdown projectId={projectId} run={run} />
        {runSummary?.error && (
          <div className="alert error">{runSummary.error}</div>
        )}
        <h4>
          {copy.toolCalls}
          {run.tools.length}
          {copy.text4}
        </h4>
        <div className="tools-table">
          <table className="table compact">
            <colgroup>
              <col className="tools-col-tool" />
              <col />
              <col className="tools-col-time" />
              {anyError && <col className="tools-col-flag" />}
            </colgroup>
            <thead>
              <tr>
                <th>{copy.tool}</th>
                <th>{copy.input}</th>
                <th className="num">{copy.time}</th>
                {anyError && <th />}
              </tr>
            </thead>
            <tbody>
              {run.tools.map((tool) => (
                <tr key={tool.toolUseId} data-tip={JSON.stringify(tool.input)}>
                  <td className="truncate">{prettyToolName(tool.name)}</td>
                  <td className="mono truncate">
                    {tool.name === SKILL_TOOL
                      ? skillToolName(tool.input)
                      : toolTarget(tool.input, null)}
                  </td>
                  <td className="num">
                    {tool.durationMs === null
                      ? "Running…"
                      : formatMs(tool.durationMs)}
                  </td>
                  {anyError && (
                    <td>
                      {tool.isError && (
                        <span className="badge fail">{copy.error}</span>
                      )}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export { RunDetails };
