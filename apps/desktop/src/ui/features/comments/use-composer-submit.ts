import { useCallback, useTransition } from "react";

import type { ComposerSubmit } from "./comment-composer-model.js";
import type { RunMention } from "./deps.js";

interface SubmitInput {
  attachmentIds: string[];
  isBaseBlocked: boolean;
  mentions: RunMention[];
  clearText: () => void;
  clearMentions: () => void;
  onSubmit: (input: ComposerSubmit) => Promise<boolean>;
  draftText: string;
  toClaude: boolean;
}

interface ComposerSubmitState {
  isBlocked: boolean;
  isSubmitting: boolean;
  submit: (now: boolean) => void;
}

const useComposerSubmit = (input: SubmitInput): ComposerSubmitState => {
  const [isSubmitting, startSubmit] = useTransition();
  const { attachmentIds, draftText, isBaseBlocked, mentions } = input;
  const { clearMentions, clearText, onSubmit, toClaude } = input;
  const isBlocked = isBaseBlocked || isSubmitting;

  const submit = useCallback(
    (now: boolean): void => {
      if (isBlocked) {
        return;
      }

      const text = draftText.trim();

      startSubmit(async () => {
        const isOk = await onSubmit({
          attachmentIds,
          mentions,
          now,
          text,
          toClaude,
        });

        if (isOk) {
          clearText();
          clearMentions();
        }
      });
    },
    [
      attachmentIds,
      clearMentions,
      clearText,
      draftText,
      isBlocked,
      mentions,
      onSubmit,
      toClaude,
    ]
  );

  return { isBlocked, isSubmitting, submit };
};

export { useComposerSubmit };

export type { ComposerSubmitState };
