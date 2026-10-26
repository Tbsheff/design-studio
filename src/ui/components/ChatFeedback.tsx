import { memo, useId, useMemo, useState } from 'react';
import type { RunStatus } from '../../shared/contracts';
import { baseName, formatMs, formatUsd } from '../format';
import { useRunFeedback, type Thumb } from '../runFeedback';
import { runText, type RunView } from '../runState';
import { CopyButton } from './CopyButton';
import { Icon } from './Icon';
import { useRovingRadioGroup } from './LevelControl';
import { fileChanges, type FileChange } from './ToolChips';

const STATUS_LABEL: Record<RunStatus, string> = {
  running: 'Running',
  completed: 'Completed',
  canceled: 'Stopped',
  failed: 'Failed',
  budget_exceeded: 'Spending limit reached',
};

const THUMB_PATH = 'M5 7.25v6.25H2.5V7.25zM5 7.25 7.6 2.5c.9 0 1.6.7 1.6 1.6v2.4h3.3c.8 0 1.4.7 1.3 1.5l-.8 4.4c-.1.6-.7 1.1-1.3 1.1H5';
const STAR_PATH = 'M8 1.9l1.85 3.85 4.2.55-3.07 2.93.77 4.17L8 11.37l-3.75 2.03.77-4.17L1.95 6.3l4.2-.55z';

function ThumbIcon({ down = false }: { down?: boolean }) {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={THUMB_PATH} transform={down ? 'matrix(1 0 0 -1 0 16)' : undefined} />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth={1.25} strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={STAR_PATH} />
    </svg>
  );
}

function ThumbButton({ value, on, onPick }: { value: Thumb; on: boolean; onPick: (value: Thumb | null) => void }) {
  const label = value === 'up' ? 'Good response' : 'Bad response';
  return (
    <button type="button" className="icon-btn small feedback-thumb" aria-label={label} aria-pressed={on} data-tip={label} data-tip-side="top" onClick={() => onPick(on ? null : value)}>
      <ThumbIcon down={value === 'down'} />
    </button>
  );
}

const STARS = [1, 2, 3, 4, 5] as const;

function StarRating({ value, onChange }: { value: number; onChange: (stars: number) => void }) {
  const [hover, setHover] = useState(0);
  const radios = useRovingRadioGroup<number>(STARS, value, onChange);
  const shown = hover || value;
  const labelId = useId();
  return (
    <div className="run-rating" data-testid="run-rating">
      <span className="run-rating-label" id={labelId}>
        How did this design turn out?
      </span>
      <div className="run-stars" role="radiogroup" aria-labelledby={labelId} onKeyDown={radios.onKeyDown} onMouseLeave={() => setHover(0)}>
        {STARS.map((star) => {
          const props = radios.item(star);
          return (
            <button
              key={star}
              type="button"
              role="radio"
              aria-checked={value === star}
              aria-label={`${star} star${star === 1 ? '' : 's'}`}
              className={`run-star${star <= shown ? ' on' : ''}`}
              ref={props.ref}
              tabIndex={value === 0 ? (star === 1 ? 0 : -1) : props.tabIndex}
              onMouseEnter={() => setHover(star)}
              onClick={() => onChange(value === star ? 0 : star)}
            >
              <StarIcon />
            </button>
          );
        })}
      </div>
    </div>
  );
}

function fileLabel(change: FileChange): string {
  return `${change.created ? 'Created' : 'Edited'} ${baseName(change.path)}`;
}

function FileChips({ changes, onOpen }: { changes: FileChange[]; onOpen: () => void }) {
  if (changes.length === 0) return null;
  return (
    <ul className="run-changes" aria-label="Changed files" data-testid="run-changes">
      {changes.map((change) => (
        <li key={change.path} className="run-change">
          <button type="button" className="ui-file-chip" data-tip-align="start" data-tip={`${change.path} (+${change.added} −${change.removed}). Open run details`} onClick={onOpen}>
            <Icon name={change.created ? 'doc' : 'file'} size={14} />
            <span className="run-change-path">{fileLabel(change)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

export const RunFeedbackRow = memo(function RunFeedbackRow({ run, latest, onDetails }: { run: RunView; latest: boolean; onDetails: () => void }) {
  const [feedback, setFeedback] = useRunFeedback(run.runId);
  const changes = useMemo(() => (run.status === 'running' ? [] : fileChanges(run.tools)), [run.status, run.tools]);
  const summary = run.summary;
  const done = run.status === 'completed';
  const rate = done && (feedback.stars > 0 || (latest && changes.length > 0));
  return (
    <div className="run-feedback">
      <FileChips changes={changes} onOpen={onDetails} />
      <div className="run-foot" data-status={run.status}>
        {done && (
          <span className="run-thumbs" role="group" aria-label="Rate this response">
            <ThumbButton value="up" on={feedback.thumb === 'up'} onPick={(thumb) => setFeedback({ thumb })} />
            <ThumbButton value="down" on={feedback.thumb === 'down'} onPick={(thumb) => setFeedback({ thumb })} />
          </span>
        )}
        {!done && (
          <span className={`status ${run.status}`}>
            <span className="status-dot" aria-hidden="true" />
            {STATUS_LABEL[run.status]}
          </span>
        )}
        {run.status !== 'running' && runText(run) && <CopyButton text={() => runText(run)} label="Copy reply" className="reply-copy" />}
        {summary && (
          <span className="run-foot-meta tabular-nums" data-tip-side="top" data-tip={`$${summary.costUsd.toFixed(4)}`}>
            {formatMs(summary.durationMs)} · {formatUsd(summary.costUsd)}
          </span>
        )}
        <button type="button" className="btn ghost small run-foot-details" onClick={onDetails}>
          Details
        </button>
      </div>
      {rate && <StarRating value={feedback.stars} onChange={(stars) => setFeedback({ stars })} />}
    </div>
  );
});
