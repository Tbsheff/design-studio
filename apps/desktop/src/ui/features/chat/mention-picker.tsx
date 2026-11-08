import type { RunMention } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useEffect, useMemo, useState } from "react";

import { fuzzyRank } from "../../../shared/fuzzy.js";
import { copy } from "./copy.js";

interface MentionOption {
  key: string;
  label: string;
  detail: string;
  mention: RunMention;
  icon?: IconName;
}

const mentionKey = (mention: RunMention): string =>
  mention.kind === "file"
    ? `file:${mention.path}`
    : `${mention.kind}:${mention.name}`;

const mentionLabel = (mention: RunMention): string =>
  mention.kind === "file"
    ? (mention.path.split("/").pop() ?? mention.path)
    : mention.name;

const mentionIcon = (mention: RunMention): IconName => {
  if (mention.kind === "file") {
    return "file";
  }

  return mention.kind === "token" ? "token" : "component";
};

const mentionTitle = (mention: RunMention): string => {
  if (mention.kind === "file") {
    return mention.path;
  }

  if (mention.kind === "token") {
    return `${mention.name}: ${mention.value}`;
  }

  return mention.file
    ? `@${mention.name} · ${mention.file}`
    : `@${mention.name}`;
};

const mentionQueryOf = (draft: string): string | null => {
  const match = /(?:^|\s)@([^\s@]*)$/u.exec(draft);

  return match ? (match[1] ?? "") : null;
};

const rankMentions = (
  options: readonly MentionOption[],
  query: string
): MentionOption[] =>
  fuzzyRank(
    options,
    query,
    (option) =>
      option.mention.kind === "file" ? option.mention.path : option.label,
    30
  );

const useMentionPicker = (
  options: readonly MentionOption[],
  query: string | null
) => {
  const [active, setActive] = useState(0);

  const shown = useMemo(
    () => (query === null ? [] : rankMentions(options, query)),
    [options, query]
  );

  useEffect(() => setActive(0), [query]);

  const current =
    shown[Math.min(active, Math.max(0, shown.length - 1))] ?? null;

  const move = (step: 1 | -1) =>
    setActive((index) =>
      shown.length === 0 ? 0 : (index + step + shown.length) % shown.length
    );

  return { current, move, open: query !== null, setActive, shown };
};

const MentionList = ({
  shown,
  current,
  loading,
  onPick,
  onHover,
  className,
}: {
  shown: MentionOption[];
  current: MentionOption | null;
  loading: boolean;
  onPick: (option: MentionOption) => void;
  onHover: (index: number) => void;
  className?: string;
}) => {
  useEffect(() => {
    if (current) {
      document
        .getElementById(`mention-${current.key}`)
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [current]);

  return (
    <div
      className={`skill-pop mention-pop ${className ?? ""}`}
      data-testid="mention-list"
    >
      <ul
        role="listbox"
        aria-label={copy.mentionAFile}
        className="skill-opts"
        id="mention-options"
      >
        {shown.map((option, index) => (
          <li
            key={option.key}
            id={`mention-${option.key}`}
            role="option"
            aria-selected={option === current}
            className={`skill-opt mention-opt ${option === current ? "active" : ""}`}
            onMouseDown={(event) => event.preventDefault()}
            onMouseEnter={() => onHover(index)}
            onClick={() => onPick(option)}
          >
            <span className="skill-opt-head">
              <Icon
                name={option.icon ?? mentionIcon(option.mention)}
                size={14}
              />
              <strong className="mention-label">{option.label}</strong>
              {option.detail && option.detail !== option.label && (
                <span className="skill-origin mention-detail">
                  {option.detail}
                </span>
              )}
            </span>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="skill-empty">
            {loading ? "Loading files…" : "Nothing matches."}
          </li>
        )}
      </ul>
      <p className="skill-pop-foot">↑↓ move · ↵ or Tab add · Esc close</p>
    </div>
  );
};

const MentionChips = ({
  mentions,
  onRemove,
}: {
  mentions: RunMention[];
  onRemove: (key: string) => void;
}) => {
  if (mentions.length === 0) {
    return null;
  }

  return (
    <div className="skill-chips" aria-label={copy.mentionsForThis}>
      {mentions.map((mention) => {
        const key = mentionKey(mention);

        return (
          <span
            key={key}
            className="skill-chip mention-chip"
            data-tip-side="top"
            data-tip={mentionTitle(mention)}
            data-testid="mention-chip"
          >
            <Icon name={mentionIcon(mention)} size={12} />
            {mentionLabel(mention)}
            <button
              type="button"
              aria-label={`Remove ${mentionLabel(mention)}`}
              onClick={() => onRemove(key)}
            >
              <Icon name="close" size={11} />
            </button>
          </span>
        );
      })}
    </div>
  );
};

export {
  MentionChips,
  MentionList,
  mentionIcon,
  mentionKey,
  mentionLabel,
  mentionQueryOf,
  mentionTitle,
  rankMentions,
  useMentionPicker,
};

export type { MentionOption };
