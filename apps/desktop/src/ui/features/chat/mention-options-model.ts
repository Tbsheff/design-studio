import type {
  CompiledTokenEntry,
  ComponentInfo,
  RunMention,
} from "@design-studio/contracts";

import { mentionKey } from "./mention-picker.js";
import type { MentionOption } from "./mention-picker.js";

interface MentionSources {
  readonly components: readonly ComponentInfo[] | null | undefined;
  readonly files: readonly string[] | null;
  readonly isFocusShown: boolean;
  readonly lead: readonly MentionOption[] | undefined;
  readonly mentions: readonly RunMention[];
  readonly tokens: readonly CompiledTokenEntry[] | undefined;
}

const componentMention = (component: ComponentInfo): RunMention => ({
  file: component.file,
  kind: "component",
  name: component.name,
  selector: component.selector,
});

const toFileOption = (path: string): MentionOption => ({
  detail: path,
  key: `file:${path}`,
  label: path.split("/").pop() ?? path,
  mention: { kind: "file", path },
});

const toFocusOption = (path: string): MentionOption => ({
  detail: path,
  icon: "pointer",
  key: `focus:${path}`,
  label: `Focus on ${path.split("/").pop() ?? path}`,
  mention: { kind: "file", path },
});

const toTokenOption = (entry: CompiledTokenEntry): MentionOption => ({
  detail: entry.value,
  key: `token:${entry.cssVar}`,
  label: entry.cssVar,
  mention: { kind: "token", name: entry.cssVar, value: entry.value },
});

const toComponentOption = (item: ComponentInfo): MentionOption => {
  const mention = componentMention(item);

  return {
    detail: item.file ?? "Component",
    key: mentionKey(mention),
    label: item.name,
    mention,
  };
};

const toFocusOptions = (sources: MentionSources): MentionOption[] => {
  if (!sources.isFocusShown) {
    return [];
  }

  return (sources.files ?? []).map((path) => toFocusOption(path));
};

const toMentionOptions = (sources: MentionSources): MentionOption[] => {
  const picked = new Set(
    sources.mentions.map((mention) => mentionKey(mention))
  );

  return [
    ...(sources.lead ?? []),
    ...(sources.components ?? []).map((item) => toComponentOption(item)),
    ...(sources.files ?? []).map((path) => toFileOption(path)),
    ...toFocusOptions(sources),
    ...(sources.tokens ?? []).map((entry) => toTokenOption(entry)),
  ].filter((option) => !picked.has(option.key));
};

const toMentionsWith = (
  list: readonly RunMention[],
  mention: RunMention
): readonly RunMention[] => {
  if (list.some((item) => mentionKey(item) === mentionKey(mention))) {
    return list;
  }

  return [...list, mention];
};

const toDraftWithoutMention = (draft: string): string => {
  const base = draft.replace(/@[^\s@]*$/u, "");
  const trimmed = base.trimEnd();

  if (trimmed.length < base.length) {
    return `${trimmed} `;
  }

  return base;
};

export {
  componentMention,
  toDraftWithoutMention,
  toMentionOptions,
  toMentionsWith,
};

export type { MentionSources };
