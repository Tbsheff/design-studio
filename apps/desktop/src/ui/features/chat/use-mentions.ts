import type {
  CompiledTokenEntry,
  ComponentInfo,
  RunMention,
} from "@design-studio/contracts";
import { useMemo, useState } from "react";
import type { Dispatch, KeyboardEvent, SetStateAction } from "react";

import {
  componentMention,
  toDraftWithoutMention,
  toMentionOptions,
} from "./mention-options-model.js";
import { mentionQueryOf, useMentionPicker } from "./mention-picker.js";
import type { MentionOption } from "./mention-picker.js";
import { useMentionFiles } from "./use-mention-files.js";
import { useMentionSet } from "./use-mention-set.js";
import type { MentionRequest } from "./use-mention-set.js";

interface Options {
  projectId: string;
  directionId: string | null | undefined;
  tokens: readonly CompiledTokenEntry[] | undefined;
  draft: string;
  setDraft: (value: string) => void;
  components?: readonly ComponentInfo[] | null;
  request?: MentionRequest | null;
  lead?: readonly MentionOption[];
  onLead?: (option: MentionOption) => void;
}

interface UseMentionsResult {
  readonly clear: () => void;
  readonly loading: boolean;
  readonly mentions: RunMention[];
  readonly onKeyDown: (event: KeyboardEvent<HTMLElement>) => boolean;
  readonly pick: (option: MentionOption) => void;
  readonly picker: {
    readonly current: MentionOption | null;
    readonly move: (step: 1 | -1) => void;
    readonly open: boolean;
    readonly setActive: Dispatch<SetStateAction<number>>;
    readonly shown: MentionOption[];
  };
  readonly remove: (key: string) => void;
}

type PickerKey = "dismiss" | "move" | "pick" | null;

const toPickerKey = (
  event: KeyboardEvent<HTMLElement>,
  hasCurrent: boolean
): PickerKey => {
  const { key } = event;

  if (key === "ArrowDown" || key === "ArrowUp") {
    return "move";
  }

  const isPickKey = key === "Enter" || key === "Tab";

  if (isPickKey && hasCurrent && !event.metaKey && !event.ctrlKey) {
    return "pick";
  }

  if (key === "Escape") {
    return "dismiss";
  }

  return null;
};

const toActiveQuery = (
  draft: string,
  dismissed: string | null
): string | null => {
  const rawQuery = mentionQueryOf(draft);

  if (rawQuery !== null && draft !== dismissed) {
    return rawQuery;
  }

  return null;
};

const pickDirection = (key: string): 1 | -1 => {
  if (key === "ArrowDown") {
    return 1;
  }

  return -1;
};

const useMentions = (config: Options): UseMentionsResult => {
  const { projectId, directionId, tokens, draft, setDraft } = config;
  const { components, request, lead, onLead } = config;
  const [dismissed, setDismissed] = useState<string | null>(null);
  const query = toActiveQuery(draft, dismissed);
  const files = useMentionFiles(projectId, directionId, query === "");
  const { add, clear, mentions, remove } = useMentionSet(request);

  const options = useMemo(
    () => toMentionOptions({ components, files, lead, mentions, tokens }),
    [components, files, lead, mentions, tokens]
  );

  const picker = useMentionPicker(options, query);

  const pick = (option: MentionOption): void => {
    if (lead?.some((item) => item.key === option.key)) {
      onLead?.(option);
    } else {
      add(option.mention);
    }

    setDraft(toDraftWithoutMention(draft));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    const action = toPickerKey(event, picker.current !== null);

    if (!picker.open || action === null) {
      return false;
    }

    if (action === "move") {
      picker.move(pickDirection(event.key));
    }

    if (action === "pick" && picker.current) {
      pick(picker.current);
    }

    if (action === "dismiss") {
      setDismissed(draft);
    }

    event.preventDefault();
    event.stopPropagation();

    return true;
  };

  const loading = files === null;

  return { clear, loading, mentions, onKeyDown, pick, picker, remove };
};

export { componentMention, useMentions };

export type { MentionRequest, UseMentionsResult };
