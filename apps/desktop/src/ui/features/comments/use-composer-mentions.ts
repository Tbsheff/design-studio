import { useCallback, useMemo } from "react";

import { CLAUDE_OPTION } from "./comment-composer-model.js";
import type { ComposerSources } from "./comment-composer-model.js";
import { useMentions } from "./deps.js";
import type { ComposerDraft } from "./use-composer-draft.js";

type Mentions = ReturnType<typeof useMentions>;

const useComposerMentions = (
  sources: ComposerSources,
  draft: ComposerDraft
): Mentions => {
  const { changeText, changeToClaude, text, toClaude } = draft;

  const leadOptions = useMemo(() => {
    if (toClaude) {
      return [];
    }

    return [CLAUDE_OPTION];
  }, [toClaude]);

  const pickLead = useCallback(
    (): void => changeToClaude(true),
    [changeToClaude]
  );

  return useMentions({
    components: sources.components,
    directionId: sources.directionId,
    draft: text,
    lead: leadOptions,
    onLead: pickLead,
    projectId: sources.projectId,
    setDraft: changeText,
    tokens: sources.tokens,
  });
};

export { useComposerMentions };

export type { Mentions };
