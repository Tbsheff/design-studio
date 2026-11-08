import type { ReactElement } from "react";
import { useCallback } from "react";

import type { ComposerSubmit } from "./comment-composer-model.js";
import { breadcrumbOf } from "./comment-placement.js";
import type { SelectionContext } from "./deps.js";
import { focusLater } from "./focus-later.js";
import { LayerComposer } from "./layer-composer.js";
import type { LayerShared } from "./layer-composer.js";
import { submitComment } from "./submit-comment.js";
import type { FeedbackPrompt } from "./use-feedback-prompt.js";

const toLabel = (count: number): string => {
  if (count > 1) {
    return `Comment on ${count} elements`;
  }

  return "Comment on selection";
};

const FeedbackComposer = ({
  feedback,
  selection,
  shared,
}: {
  feedback: FeedbackPrompt;
  selection: SelectionContext[];
  shared: LayerShared;
}): ReactElement | null => {
  const { control, tools } = shared;
  const { dismiss, input, isActive, selKey } = feedback;
  const last = selection.at(-1);

  const cancel = useCallback((): void => {
    dismiss();
    focusLater(".stage");
  }, [dismiss]);

  const submit = useCallback(
    (value: ComposerSubmit): Promise<boolean> =>
      submitComment(
        { control, tools },
        { finish: dismiss, selections: selection },
        value
      ),
    [control, dismiss, selection, tools]
  );

  if (!last) {
    return null;
  }

  return (
    <LayerComposer
      key={selKey}
      anchor={last.rect}
      shouldFocus={isActive}
      breadcrumb={breadcrumbOf(tools.pageName, selection)}
      draftKey={`sel:${selKey}`}
      focusRef={input}
      label={toLabel(selection.length)}
      onCancel={cancel}
      onSubmit={submit}
      shared={shared}
      testId="comment-feedback"
      trap={isActive}
    />
  );
};

export { FeedbackComposer };
