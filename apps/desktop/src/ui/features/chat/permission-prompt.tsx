import type {
  PermissionDecision,
  PermissionRequest,
} from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useState, startTransition } from "react";
import type { ReactElement } from "react";

import {
  RULE_MAX_CHARS,
  ruleForCommand,
} from "../../../shared/permissionRules.js";
import { api, errorText } from "../../api.js";
import { copy } from "./copy.js";

const PermissionPrompt = ({
  projectId,
  runId,
  request,
}: {
  projectId: string;
  runId: string;
  request: PermissionRequest;
}): ReactElement => {
  const [note, setNote] = useState("");
  const [denying, setDenying] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const answer = (decision: PermissionDecision): void => {
    setBusy(true);
    setError(null);
    startTransition(async () => {
      try {
        await api.answerPermission(projectId, runId, request.id, decision);
      } catch (thrownError: unknown) {
        setBusy(false);
        setError(errorText(thrownError));
      }
    });
  };

  const command =
    request.toolName === "Bash"
      ? (request.input as { command?: unknown } | null)?.command
      : undefined;

  let rule: string | null = null;
  if (
    typeof command === "string" &&
    command.trim() !== "" &&
    command.trim().length <= RULE_MAX_CHARS
  ) {
    rule = ruleForCommand(command);
  }

  const deny = (): void =>
    answer({ allow: false, ...(note.trim() ? { note: note.trim() } : {}) });

  return (
    <section
      className="permission"
      role="group"
      aria-label={request.title}
      data-testid="permission-prompt"
    >
      <header className="permission-head">
        <Icon name="terminal" size={14} />
        <strong>{request.title}</strong>
      </header>
      {request.detail && (
        <pre className="permission-detail">{request.detail}</pre>
      )}
      {denying && (
        <form
          className="permission-deny"
          onSubmit={(event) => {
            event.preventDefault();
            deny();
          }}
        >
          <input
            className="input small"
            aria-label={copy.noteForThe}
            placeholder={copy.tellTheAgent}
            value={note}

            onChange={(event) => setNote(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                setDenying(false);
              }
            }}
          />
          <button type="submit" className="btn small danger" disabled={busy}>
            {copy.deny}
          </button>
        </form>
      )}
      {!denying && (
        <div className="permission-actions">
          <button
            type="button"
            className="btn small primary"
            disabled={busy}
            onClick={() => answer({ allow: true })}
          >
            {copy.allowOnce}
          </button>
          {rule && (
            <button
              type="button"
              className="btn small permission-always"
              disabled={busy}
              data-tip={rule}
              aria-label={`Always allow ${rule}`}
              onClick={() => answer({ allow: true, always: rule })}
            >
              {copy.always}
              <code className="permission-rule">{rule}</code>
            </button>
          )}
          <button
            type="button"
            className="btn small"
            disabled={busy}
            onClick={() => setDenying(true)}
          >
            {copy.deny2}
          </button>
        </div>
      )}
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
};

export { PermissionPrompt };
