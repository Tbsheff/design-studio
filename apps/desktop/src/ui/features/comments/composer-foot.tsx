import type { ReactElement } from "react";

import type { RunHint } from "./comment-composer-model.js";
import { ComposerCheck } from "./composer-check.js";
import { RunHint as RunHintView } from "./composer-run-hint.js";
import { SubmitButton } from "./composer-submit-button.js";

const ComposerFoot = ({
  toClaude,
  onToClaude,
  isBlocked,
  isSubmitting,
  onSubmit,
  hint,
}: {
  toClaude: boolean;
  onToClaude: (isOn: boolean) => void;
  isBlocked: boolean;
  isSubmitting: boolean;
  onSubmit: (now: boolean) => void;
  hint: RunHint | null;
}): ReactElement => (
  <>
    <div className="comment-card-foot">
      <ComposerCheck toClaude={toClaude} onToClaude={onToClaude} />
      <SubmitButton
        toClaude={toClaude}
        isBlocked={isBlocked}
        isSubmitting={isSubmitting}
        onSubmit={onSubmit}
      />
    </div>
    {hint && <RunHintView queueOnly={hint.queueOnly} />}
  </>
);

export { ComposerFoot };
