import { useState } from 'react';
import type { PermissionDecision, PermissionRequest } from '../../shared/contracts';
import { RULE_MAX_CHARS, ruleForCommand } from '../../shared/permissionRules';
import { api, errorText } from '../api';
import { Icon } from './Icon';

export function PermissionPrompt({ runId, request }: { runId: string; request: PermissionRequest }) {
  const [note, setNote] = useState('');
  const [denying, setDenying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const answer = (decision: PermissionDecision) => {
    setBusy(true);
    setError(null);
    api.answerPermission(runId, request.id, decision).catch((err: unknown) => {
      setBusy(false);
      setError(errorText(err));
    });
  };
  const command = request.toolName === 'Bash' ? (request.input as { command?: unknown } | null)?.command : undefined;
  const rule = typeof command === 'string' && command.trim() !== '' && command.trim().length <= RULE_MAX_CHARS ? ruleForCommand(command) : null;
  const deny = () => answer({ allow: false, ...(note.trim() ? { note: note.trim() } : {}) });
  return (
    <section className="permission" role="group" aria-label={request.title} data-testid="permission-prompt">
      <header className="permission-head">
        <Icon name="terminal" size={14} />
        <strong>{request.title}</strong>
      </header>
      {request.detail && <pre className="permission-detail">{request.detail}</pre>}
      {denying ? (
        <form
          className="permission-deny"
          onSubmit={(event) => {
            event.preventDefault();
            deny();
          }}
        >
          <input
            className="input small"
            aria-label="Note for the agent"
            placeholder="Tell the agent what to do instead (optional)"
            value={note}
            autoFocus
            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') {
                event.preventDefault();
                setDenying(false);
              }
            }}
          />
          <button type="submit" className="btn small danger" disabled={busy}>
            Deny
          </button>
        </form>
      ) : (
        <div className="permission-actions">
          <button type="button" className="btn small primary" disabled={busy} onClick={() => answer({ allow: true })}>
            Allow once
          </button>
          {rule && (
            <button type="button" className="btn small permission-always" disabled={busy} title={rule} onClick={() => answer({ allow: true, always: rule })}>
              Always allow <code className="permission-rule">{rule}</code>
            </button>
          )}
          <button type="button" className="btn small" disabled={busy} onClick={() => setDenying(true)}>
            Deny…
          </button>
        </div>
      )}
      {error && <p className="permission-error" role="alert">{error}</p>}
    </section>
  );
}
