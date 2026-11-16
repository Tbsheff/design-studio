import type { KeyboardEvent } from "react";

import type { PromptBoxProps } from "./prompt-box-props.js";
import type { SlashMenuResult } from "./slash-menu-model.js";
import { useComposerKeys } from "./use-composer-keys.js";
import type { UseComposerKeysResult } from "./use-composer-keys.js";
import type { HistorySearchState } from "./use-history-search.js";
import { useHistorySearch } from "./use-history-search.js";
import type { UseMentionsResult } from "./use-mentions.js";
import { useMentions } from "./use-mentions.js";
import type { PromptBase } from "./use-prompt-base.js";
import { usePromptKeyCapture } from "./use-prompt-key-capture.js";
import { useRunFocus } from "./use-run-focus.js";
import type { RunFocus } from "./use-run-focus.js";

interface PromptInput {
  readonly focus: RunFocus;
  readonly historySearch: HistorySearchState;
  readonly keys: UseComposerKeysResult;
  readonly mentions: UseMentionsResult;
  readonly onKeyCapture: (event: KeyboardEvent<HTMLDivElement>) => void;
}

const usePromptInput = (
  props: PromptBoxProps,
  base: PromptBase,
  slash: SlashMenuResult
): PromptInput => {
  const { draft, files, mode, setDraft, setMode } = base;
  const { components, directionId, projectId, tokens } = props;
  const request = props.mentionRequest;
  const frames = props.mentionFrames ?? null;

  const focus = useRunFocus(props.selection, props.frameFocus ?? null);
  const onFocus = focus.add;

  const mentions = useMentions({
    components,
    directionId,
    draft,
    frames,
    onFocus,
    projectId,
    request,
    setDraft,
    tokens,
  });

  const historySearch = useHistorySearch(props.history ?? []);
  const blocked = files.length > 0;
  const { history, onQueueChange, onSteer, queue, running } = props;

  const keys = useComposerKeys({
    blocked,
    draft,
    history,
    onQueueChange,
    onSteer,
    queue,
    running,
    setDraft,
  });

  const composerKeys = keys;
  const { start: onHistorySearch } = historySearch;

  const onKeyCapture = usePromptKeyCapture({
    composerKeys,
    mentions,
    mode,
    onHistorySearch,
    setMode,
    slash,
  });

  return { focus, historySearch, keys, mentions, onKeyCapture };
};

export { usePromptInput };

export type { PromptInput };
