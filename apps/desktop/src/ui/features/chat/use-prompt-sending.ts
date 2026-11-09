import type { PromptBoxProps } from "./prompt-box-props.js";
import { sendReady, sendStatus } from "./prompt-send-model.js";
import type { PromptBase } from "./use-prompt-base.js";
import { usePromptDesktopCommand } from "./use-prompt-desktop-command.js";
import type { PromptInput } from "./use-prompt-input.js";
import { usePromptSend } from "./use-prompt-send.js";
import type { PromptRequest } from "./use-prompt-send.js";

interface PromptLink {
  readonly clear: () => void;
  readonly linked: string[];
}

interface PromptSending {
  readonly canSend: boolean;
  readonly isSending: boolean;
  readonly send: () => void;
  readonly status: ReturnType<typeof sendStatus>;
}

const usePromptSending = (
  props: PromptBoxProps,
  base: PromptBase,
  input: PromptInput,
  prefill: PromptLink
): PromptSending => {
  const { draft, effort, files, mode, setError, setFiles } = base;
  const { setSkillIds, skillIds, uploading } = base;
  const { keys, mentions: mentionState } = input;
  const { running, selection, variations, waitReason } = props;
  const empty = draft.trim() === "" && skillIds.length === 0;
  const loading = props.disabled;

  const status = sendStatus({ empty, loading, running, uploading, waitReason });

  const blocked = props.disabled || Boolean(waitReason);
  const busy = uploading;
  const isReady = sendReady({ blocked, busy, empty, running });

  const sendRequest = (request: PromptRequest): Promise<void> =>
    props.onSend(
      request.prompt,
      request.mode,
      request.attachmentIds,
      request.level,
      request.effort,
      request.mentions,
      request.commentIds,
      request.focusPaths
    );

  const cleanup = {
    clearFocus: input.focus.clear,
    clearMentions: mentionState.clear,
    clearPrefill: prefill.clear,
    resetHistory: keys.resetHistory,
  };

  const draftStore = props.draft;
  const { level } = base.runLevel;
  const linkedCommentIds = prefill.linked;
  const { mentions } = mentionState;
  const focusPaths = input.focus.paths;
  const onSend = sendRequest;

  const { canSend, isSending, send } = usePromptSend({
    cleanup,
    draft,
    draftStore,
    effort,
    files,
    focusPaths,
    isReady,
    level,
    linkedCommentIds,
    mentions,
    mode,
    onSend,
    selection,
    setError,
    setFiles,
    setSkillIds,
    skillIds,
    variations,
  });

  const isRunning = running;
  const { onCancel } = props;
  usePromptDesktopCommand({ canSend, isRunning, onCancel, send });

  return { canSend, isSending, send, status };
};

export { usePromptSending };

export type { PromptLink, PromptSending };
