import type { PermissionRequest } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { PermissionActions } from "./permission-actions.js";
import { PermissionDenyForm } from "./permission-deny-form.js";
import { toAlwaysRule } from "./permission-model.js";
import { usePermissionAnswer } from "./use-permission-answer.js";

const PermissionPrompt = ({
  projectId,
  runId,
  request,
}: {
  projectId: string;
  runId: string;
  request: PermissionRequest;
}): ReactElement => {
  const [isDenying, setIsDenying] = useState(false);
  const rule = toAlwaysRule(request);

  const { error, isPending, onAllow, onAlways, onDeny } = usePermissionAnswer(
    projectId,
    runId,
    request
  );

  const onDenyStart = useCallback(() => setIsDenying(true), []);
  const onCancel = useCallback(() => setIsDenying(false), []);

  return (
    <fieldset
      className="permission"
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
      {isDenying && (
        <PermissionDenyForm
          isDisabled={isPending}
          onDeny={onDeny}
          onCancel={onCancel}
        />
      )}
      {!isDenying && (
        <PermissionActions
          rule={rule}
          isDisabled={isPending}
          onAllow={onAllow}
          onAlways={onAlways}
          onDenyStart={onDenyStart}
        />
      )}
      {error && (
        <p className="permission-error" role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export { PermissionPrompt };
