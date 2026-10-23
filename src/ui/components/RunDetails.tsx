import { useEffect, useRef, type KeyboardEvent } from 'react';
import { formatMs, formatTime, formatUsd } from '../format';
import type { RunStatus } from '../../shared/contracts';
import type { RunView } from '../runState';
import { SKILL_TOOL, prettyToolName, skillToolName, toolTarget } from '../toolLabels';
import { useReturnFocusOnUnmount } from '../usePopover';
import { Icon } from './Icon';
import { LatencyBreakdown } from './LatencyBreakdown';

const STATUS_TEXT: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  canceled: 'Canceled',
  failed: 'Failed',
  budget_exceeded: 'Spending limit reached',
};

const SMALL_COST = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumSignificantDigits: 3 });

function preciseUsd(n: number): string {
  return n < 0.01 ? SMALL_COST.format(n) : `$${n.toFixed(4)}`;
}

function costText(s: NonNullable<RunView['summary']>): string {
  const roundingHidesCost = s.costUsd !== Number(s.costUsd.toFixed(2));
  const shown = roundingHidesCost ? `${formatUsd(s.costUsd)} (${preciseUsd(s.costUsd)})` : formatUsd(s.costUsd);
  return s.status === 'canceled' ? `${shown} (estimate)` : shown;
}

export function RunDetails({ projectId, run, onClose }: { projectId: string; run: RunView; onClose: () => void }) {
  const s = run.summary;
  const rows: [string, string][] = s
    ? [
        ['Status', STATUS_TEXT[s.status] ?? s.status],
        ['Model', s.model],
        ['Cost', costText(s)],
        ['Duration', formatMs(s.durationMs)],
        ['Model time', formatMs(s.modelMs)],
        ['Tool time', formatMs(s.toolMs)],
        ['Input tokens', s.usage.inputTokens.toLocaleString()],
        ['Output tokens', s.usage.outputTokens.toLocaleString()],
        ['Cache read', s.usage.cacheReadTokens.toLocaleString()],
        ['Cache write', s.usage.cacheWriteTokens.toLocaleString()],
        ['Version', s.versionId ?? 'None'],
        ['Session', s.sessionId ?? 'None'],
      ]
    : [
        ['Status', STATUS_TEXT[run.status] ?? run.status],
        ['Started', formatTime(run.startedAt)],
      ];
  const skills = [...new Set(run.tools.filter((t) => t.name === SKILL_TOOL).map((t) => skillToolName(t.input) || 'unknown'))];
  rows.push(['Skills used', skills.length > 0 ? skills.join(', ') : 'None']);
  const closeButton = useRef<HTMLButtonElement>(null);
  useReturnFocusOnUnmount();
  useEffect(() => closeButton.current?.focus(), []);
  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopPropagation();
    onClose();
  };
  return (
    <div className="drawer" role="dialog" aria-label="Run details" onKeyDown={onKeyDown}>
      <div className="drawer-head">
        <strong>Run details</strong>
        <div className="spacer" />
        <button ref={closeButton} className="icon-btn" aria-label="Close" data-tip="Close" data-tip-align="end" onClick={onClose}>
          <Icon name="close" />
        </button>
      </div>
      <div className="drawer-body">
        <div className="drawer-id">
          <span className="badge">Run</span>
          <span className="mono muted truncate" title={run.runId}>
            {run.runId}
          </span>
        </div>
        <dl className="kv">
          {rows.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <LatencyBreakdown projectId={projectId} run={run} />
        {s?.error && <div className="alert error">{s.error}</div>}
        <h4>Tool calls ({run.tools.length})</h4>
        <div className="tools-table">
          <table className="table compact">
            <thead>
              <tr>
                <th>Tool</th>
                <th>Input</th>
                <th>Time</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {run.tools.map((t) => (
                <tr key={t.toolUseId}>
                  <td>{prettyToolName(t.name)}</td>
                  <td className="mono truncate" title={JSON.stringify(t.input)}>
                    {t.name === SKILL_TOOL ? skillToolName(t.input) : toolTarget(t.input, null)}
                  </td>
                  <td className="num">{t.durationMs === null ? 'Running…' : formatMs(t.durationMs)}</td>
                  <td>{t.isError && <span className="badge fail">Error</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
