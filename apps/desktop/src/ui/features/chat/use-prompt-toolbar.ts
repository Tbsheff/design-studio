import { useCallback, useMemo } from "react";

import { focusComposerInput } from "./composer-focus.js";
import type { SendProps } from "./prompt-box-model.js";
import type { PromptParts } from "./prompt-parts.js";

interface PromptToolbarActions {
  readonly insertMention: () => void;
  readonly openSkills: () => void;
  readonly sendProps: SendProps;
}

const toMentionDraft = (draft: string): string => {
  if (draft === "" || /\s$/u.test(draft)) {
    return `${draft}@`;
  }

  return `${draft} @`;
};

const usePromptToolbar = (parts: PromptParts): PromptToolbarActions => {
  const { base, box, input, sending: sendState, slash } = parts;
  const { draft, setDraft } = base;
  const { close: closeSlash, openMenu } = slash.slash;
  const { canQueue, queueDraft: onQueue } = input.keys;
  const { onCancel, running } = box;
  const { canSend, isSending: sending, send: onSend } = sendState;
  const { status } = sendState;
  const hasDraft = draft.trim().length > 0;
  const { tip } = status;

  const insertMention = useCallback((): void => {
    closeSlash();
    setDraft(toMentionDraft(draft));
    focusComposerInput();
  }, [closeSlash, setDraft, draft]);

  const openSkills = useCallback((): void => {
    openMenu();
    focusComposerInput();
  }, [openMenu]);

  const onStop = useCallback((): void => {
    onCancel();
    focusComposerInput();
  }, [onCancel]);

  const sendProps = useMemo(
    (): SendProps => ({
      canQueue,
      canSend,
      hasDraft,
      onQueue,
      onSend,
      onStop,
      running,
      sending,
      tip,
    }),
    [
      canQueue,
      canSend,
      hasDraft,
      onQueue,
      onSend,
      onStop,
      running,
      sending,
      tip,
    ]
  );

  return { insertMention, openSkills, sendProps };
};

export { usePromptToolbar };

export type { PromptToolbarActions };
