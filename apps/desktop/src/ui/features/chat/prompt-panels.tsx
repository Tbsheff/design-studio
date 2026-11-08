import { useCallback } from "react";
import type { ReactElement } from "react";

import { findElement } from "../../platform/find-element.js";
import { focusComposerInput } from "./composer-focus.js";
import { HistorySearch } from "./history-search.js";
import { MentionList } from "./mention-picker.js";
import { QueuedMessages } from "./queued-messages.js";
import { SlashMenu } from "./slash-menu.js";
import type { PromptBase } from "./use-prompt-base.js";
import type { PromptInput } from "./use-prompt-input.js";
import type { PromptSlash } from "./use-prompt-slash.js";

const PromptPanels = ({
  base,
  input,
  slash,
}: {
  base: PromptBase;
  input: PromptInput;
  slash: PromptSlash;
}): ReactElement => {
  const { promptRef, setDraft } = base;
  const { historySearch, keys, mentions } = input;
  const { close: closeHistory } = historySearch;
  const { picker, pick: pickMention } = mentions;
  const { setActive: hoverMention } = picker;
  const { setQueue } = keys;
  const { close: closeSlash, open: isSlashOpen, view } = slash.slash;

  const pickHistory = useCallback(
    (prompt: string): void => {
      closeHistory();
      setDraft(prompt);
      focusComposerInput();
    },
    [closeHistory, setDraft]
  );

  const readAnchor = useCallback((): HTMLElement | null => {
    if (!promptRef.current) {
      return null;
    }

    return findElement(promptRef.current, ".composer");
  }, [promptRef]);

  const readInput = useCallback((): HTMLElement | null => {
    if (!promptRef.current) {
      return null;
    }

    return findElement(promptRef.current, '[data-slot="composer-input"]');
  }, [promptRef]);

  return (
    <>
      <QueuedMessages items={keys.queue} onChange={setQueue} />
      <HistorySearch search={historySearch} onPick={pickHistory} />
      {picker.open && (
        <MentionList
          shown={picker.shown}
          current={picker.current}
          loading={mentions.loading}
          onPick={pickMention}
          onHover={hoverMention}
        />
      )}
      {isSlashOpen && (
        <SlashMenu
          view={view}
          anchor={readAnchor}
          input={readInput}
          onClose={closeSlash}
        />
      )}
    </>
  );
};

export { PromptPanels };
