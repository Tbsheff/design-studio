import { Icon } from './Icon';
import type { BuildError } from '../useStudioData';

interface Props {
  errors: BuildError[];
  onSendToAgent: (e: BuildError) => void;
  onClear: () => void;
}

export function fixPrompt(e: BuildError): string {
  const where = e.file ? ` in ${e.file}${e.line ? `:${e.line}` : ''}` : '';
  const what = e.source === 'build' ? 'build error' : `${e.source} error`;
  return `Fix this ${what}${where}:\n\n${e.message}`;
}

export function ErrorsPanel({ errors, onSendToAgent, onClear }: Props) {
  if (errors.length === 0) return null;
  return (
    <div className="errors" role="region" aria-label="Preview errors">
      <div className="section-head">
        <h3>
          <Icon name="alert" size={14} />
          Errors ({errors.length})
        </h3>
        <button className="btn ghost small" onClick={onClear}>
          Clear
        </button>
      </div>
      <ul className="error-list">
        {errors.map((e) => (
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
