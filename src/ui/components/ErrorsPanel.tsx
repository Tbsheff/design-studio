import { useEffect, useState } from 'react';
import { Icon } from './Icon';
import type { BuildError } from '../useStudioData';

interface Props {
  errors: BuildError[];
  onSendToAgent: (e: BuildError) => void;
  onClear: () => void;
  pane?: string;
}

const DEV_NOISE = [
  /\bduring prerender/i,
  /\bprerender(ing)?\b.*\b(URL|searchParams|params|headers|cookies)\b/i,
  /should be awaited before using its properties/i,
  /\[Fast Refresh\]/,
  /\[HMR\]/,
  /Download the React DevTools/i,
  /\bnext-dev-overlay\b|\b__nextjs_original-stack-frame/,
];

export function isDevNoise(e: BuildError): boolean {
  return e.source === 'console' && DEV_NOISE.some((pattern) => pattern.test(e.message));
}

function countText(n: number): string {
  return n === 1 ? '1 error' : `${n} errors`;
}

export function fixPrompt(e: BuildError): string {
  const where = e.file ? ` in ${e.file}${e.line ? `:${e.line}` : ''}` : '';
  const what = e.source === 'build' ? 'build error' : `${e.source} error`;
  return `Fix this ${what}${where}:\n\n${e.message}`;
}

function ErrorsChip({ count, onOpen, onClear }: { count: number; onOpen: () => void; onClear: () => void }) {
  return (
    <div className="errors-chip" role="region" aria-label="Preview errors">
      <button type="button" className="errors-chip-open" aria-expanded={false} data-tip="Show the errors" onClick={onOpen}>
        <Icon name="alert" size={14} />
        <span>{countText(count)}</span>
        <Icon name="chevronRight" size={12} />
      </button>
      <button type="button" className="icon-btn" aria-label="Clear errors" data-tip="Clear" data-tip-align="end" onClick={onClear}>
        <Icon name="close" size={12} />
      </button>
    </div>
  );
}

export function ErrorsPanel({ errors, onSendToAgent, onClear, pane }: Props) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (pane === 'design') setOpen(false);
  }, [pane]);
  const shown = errors.filter((e) => !isDevNoise(e));
  if (shown.length === 0) return null;
  if (!open) return <ErrorsChip count={shown.length} onOpen={() => setOpen(true)} onClear={onClear} />;
  return (
    <div className="errors" role="region" aria-label="Preview errors">
      <div className="section-head">
        <button type="button" className="errors-head" aria-expanded={true} data-tip="Hide the errors" onClick={() => setOpen(false)}>
          <Icon name="alert" size={14} />
          <span>{countText(shown.length)}</span>
          <Icon name="chevronDown" size={12} />
        </button>
        <button className="btn ghost small" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="error-list">
        {shown.map((e) => (
          <li key={e.id}>
            <div className="row between">
              <span className="badge fail">{e.source}</span>
              <button className="btn small has-icon" onClick={() => onSendToAgent(e)}>
                <Icon name="sparkle" size={14} />
                Send to agent
              </button>
            </div>
            <div className="mono error-msg">{e.message}</div>
            {e.file && (
              <div className="mono error-loc">
                {e.file}
                {e.line ? `:${e.line}` : ''}
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
