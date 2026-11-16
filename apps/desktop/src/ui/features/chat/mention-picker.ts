import type { RunMention } from "@design-studio/contracts";
import type { IconName } from "@design-studio/ui";
import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";

import { fuzzyRank } from "../../../shared/fuzzy.js";

const MAX_MATCHES = 30;

interface MentionOption {
  key: string;
  label: string;
  detail: string;
  mention: RunMention;
  icon?: IconName;
}

const mentionKey = (mention: RunMention): string => {
  if (mention.kind === "file") {
    return `file:${mention.path}`;
  }

  if (mention.kind === "frame") {
    return `frame:${mention.frameId}`;
  }

  return `${mention.kind}:${mention.name}`;
};

const mentionLabel = (mention: RunMention): string => {
  if (mention.kind === "file") {
    return mention.path.split("/").pop() ?? mention.path;
  }

  if (mention.kind === "frame") {
    return mention.label ?? mention.frameId;
  }

  return mention.name;
};

const mentionIcon = (mention: RunMention): IconName => {
  if (mention.kind === "file") {
    return "file";
  }

  if (mention.kind === "token") {
    return "token";
  }

  if (mention.kind === "frame") {
    return "frame";
  }

  return "component";
};

const mentionTitle = (mention: RunMention): string => {
  if (mention.kind === "file") {
    return mention.path;
  }

  if (mention.kind === "token") {
    return `${mention.name}: ${mention.value}`;
  }

  if (mention.kind === "frame") {
    return `${mentionLabel(mention)} · frame ${mention.frameId}`;
  }

  if (mention.file) {
    return `@${mention.name} · ${mention.file}`;
  }

  return `@${mention.name}`;
};

const mentionQueryOf = (draft: string): string | null => {
  const match = /(?:^|\s)@(?<query>[^\s@]*)$/u.exec(draft);

  if (match) {
    return match[1] ?? "";
  }

  return null;
};

const rankMentions = (
  options: readonly MentionOption[],
  query: string
): MentionOption[] =>
  fuzzyRank(
    options,
    query,
    (option) => {
      if (option.mention.kind === "file") {
        return option.mention.path;
      }

      if (option.mention.kind === "frame") {
        return `${option.label} ${option.detail}`;
      }

      return option.label;
    },
    MAX_MATCHES
  );

interface UseMentionPickerResult {
  readonly current: MentionOption | null;
  readonly move: (step: 1 | -1) => void;
  readonly open: boolean;
  readonly setActive: Dispatch<SetStateAction<number>>;
  readonly shown: MentionOption[];
}

const useMentionPicker = (
  options: readonly MentionOption[],
  query: string | null
): UseMentionPickerResult => {
  const [active, setActive] = useState(0);
  const [seenQuery, setSeenQuery] = useState(query);

  const shown = useMemo(() => {
    if (query === null) {
      return [];
    }

    return rankMentions(options, query);
  }, [options, query]);

  if (seenQuery !== query) {
    setSeenQuery(query);
    setActive(0);
  }

  const current =
    shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;

  const move = (step: 1 | -1): void =>
    setActive((index) => {
      if (shown.length === 0) {
        return 0;
      }

      return (index + step + shown.length) % shown.length;
    });

  const open = query !== null;

  return { current, move, open, setActive, shown };
};

export { MentionList } from "./mention-list.js";

export {
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionQueryOf,
  mentionTitle,
  rankMentions,
  useMentionPicker,
};

export type { MentionOption };
