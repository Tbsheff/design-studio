import type {
  RunEffort,
  RunLevel,
  RunMention,
  SelectionContext,
} from "@design-studio/contracts";
import { elementVariantsIntent } from "@design-studio/contracts/element-variants";
import { useTransition } from "react";
import type { Dispatch, SetStateAction } from "react";

import { errorText } from "../../api.js";
import type { PendingAttachment } from "../../domain/pending-attachment.js";
import type { DraftStore } from "../../platform/storage.js";
import type { ComposerMode } from "./composer-mode-model.js";
import type { VariationsPromptProps } from "./prompt-box-model.js";
import { skillInstruction } from "./skills-model.js";

interface PromptRequest {
  readonly attachmentIds: string[];
  readonly commentIds: string[];
  readonly effort: RunEffort | null;
  readonly focusPaths: string[];
  readonly level: RunLevel;
  readonly mentions: RunMention[];
  readonly mode: ComposerMode;
  readonly prompt: string;
}

interface SendCleanup {
  readonly clearFocus: () => void;
  readonly clearMentions: () => void;
  readonly clearPrefill: () => void;
  readonly resetHistory: () => void;
}

interface UsePromptSendOptions {
  readonly isReady: boolean;
  readonly cleanup: SendCleanup;
  readonly draft: string;
  readonly draftStore: DraftStore;
  readonly effort: RunEffort | null;
  readonly files: PendingAttachment[];
  readonly focusPaths: string[];
  readonly level: RunLevel;
  readonly linkedCommentIds: string[];
  readonly mentions: RunMention[];
  readonly mode: ComposerMode;
  readonly onSend: (request: PromptRequest) => Promise<void>;
  readonly selection: SelectionContext[];
  readonly setError: (message: string | null) => void;
  readonly setFiles: Dispatch<SetStateAction<PendingAttachment[]>>;
  readonly setSkillIds: Dispatch<SetStateAction<string[]>>;
  readonly skillIds: string[];
  readonly variations: VariationsPromptProps | null | undefined;
}

interface UsePromptSendResult {
  readonly canSend: boolean;
  readonly isSending: boolean;
  readonly send: () => void;
}

const NETWORK_ERROR =
  "Could not reach the studio. Your message is still here. Check that the studio runs, then send again.";

const toAttachmentIds = (files: PendingAttachment[]): string[] =>
  files.flatMap((file) => {
    if (file.attachment) {
      return [file.attachment.id];
    }

    return [];
  });

const toElementCount = (
  options: UsePromptSendOptions,
  prompt: string
): number | null => {
  if (options.mode === "edit" && options.selection.length === 1) {
    return elementVariantsIntent(prompt);
  }

  return null;
};

const dispatchPrompt = (
  options: UsePromptSendOptions,
  prompt: string,
  ids: string[]
): Promise<void> => {
  const { variations } = options;
  const elementCount = toElementCount(options, prompt);

  if (elementCount && variations?.onElement) {
    return variations.onElement(prompt, elementCount, options.level);
  }

  const isFanOut =
    options.mode === "edit" &&
    variations &&
    variations.count > 1 &&
    options.selection.length === 0;

  if (isFanOut && variations) {
    return variations.onSend(prompt, options.level, ids);
  }

  return options.onSend({
    attachmentIds: ids,
    commentIds: options.linkedCommentIds,
    effort: options.effort,
    focusPaths: options.focusPaths,
    level: options.level,
    mentions: options.mentions,
    mode: options.mode,
    prompt,
  });
};

const clearSent = (options: UsePromptSendOptions): void => {
  options.cleanup.clearMentions();
  options.cleanup.clearFocus();
  options.cleanup.clearPrefill();

  for (const file of options.files) {
    URL.revokeObjectURL(file.previewUrl);
  }

  options.setFiles([]);
  options.setSkillIds([]);
  options.cleanup.resetHistory();
};

const usePromptSend = (options: UsePromptSendOptions): UsePromptSendResult => {
  const [isSending, startSending] = useTransition();
  const { draftStore } = options;

  const submit = async (): Promise<void> => {
    const sentDraft = options.draft;

    try {
      const prompt = [options.draft.trim(), skillInstruction(options.skillIds)]
        .filter(Boolean)
        .join("\n\n");

      const sent = dispatchPrompt(
        options,
        prompt,
        toAttachmentIds(options.files)
      );

      draftStore.set("");
      await sent;
      clearSent(options);
    } catch (thrownError) {
      if (!draftStore.get().trim()) {
        draftStore.set(sentDraft);
      }

      if (thrownError instanceof TypeError) {
        options.setError(NETWORK_ERROR);
      } else {
        options.setError(errorText(thrownError));
      }
    }
  };

  const canSend = options.isReady && !isSending;

  const send = (): void => {
    if (!canSend) {
      return;
    }

    options.setError(null);
    startSending(submit);
  };

  return { canSend, isSending, send };
};

export { usePromptSend };

export type { PromptRequest };
