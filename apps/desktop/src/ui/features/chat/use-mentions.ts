import type {
  CompiledTokenEntry,
  ComponentInfo,
  RunMention,
} from "@design-studio/contracts";
import { useEffect, useMemo, useState } from "react";
import type { KeyboardEvent } from "react";

import { api } from "../../api.js";
import {
  mentionKey,
  mentionQueryOf,
  useMentionPicker,
} from "./mention-picker.js";
import type { MentionOption } from "./mention-picker.js";

const fileCache = new Map<string, Promise<string[]>>();

const loadFiles = (
  projectId: string,
  directionId: string,
  fresh: boolean
): Promise<string[]> => {
  const key = `${projectId}/${directionId}`;
  const known = fileCache.get(key);

  if (known && !fresh) {
    return known;
  }

  const next = api.workTreeFiles(projectId, directionId).then(
    (result) => result.files,
    () => []
  );

  fileCache.set(key, next);

  return next;
};

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

export interface MentionRequest {
  mention: RunMention;
  seq: number;
}

export const componentMention = (component: ComponentInfo): RunMention => ({
  file: component.file,
  kind: "component",
  name: component.name,
  selector: component.selector,
});

export const useMentions = ({
  projectId,
  directionId,
  tokens,
  draft,
  setDraft,
  components,
  request,
  lead,
  onLead,
}: Options) => {
  const [files, setFiles] = useState<string[] | null>(null);
  const [mentions, setMentions] = useState<RunMention[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const rawQuery = mentionQueryOf(draft);
  const query = rawQuery !== null && draft !== dismissed ? rawQuery : null;

  const refresh = (fresh: boolean) => {
    if (directionId) {
      void loadFiles(projectId, directionId, fresh).then(setFiles);
    }
  };

  useEffect(() => refresh(false), [projectId, directionId]);
  useEffect(() => {
    if (query === "") {
      refresh(true);
    }
  }, [query === ""]);

  const options = useMemo<MentionOption[]>(() => {
    const picked = new Set(mentions.map(mentionKey));

    const fileOptions = (files ?? []).map((path): MentionOption => ({
      detail: path,
      key: `file:${path}`,
      label: path.split("/").pop() ?? path,
      mention: { kind: "file", path },
    }));

    const tokenOptions = (tokens ?? []).map((entry): MentionOption => ({
      detail: entry.value,
      key: `token:${entry.cssVar}`,
      label: entry.cssVar,
      mention: { kind: "token", name: entry.cssVar, value: entry.value },
    }));

    const componentOptions = (components ?? []).map((item): MentionOption => {
      const mention = componentMention(item);

      return {
        detail: item.file ?? "Component",
        key: mentionKey(mention),
        label: item.name,
        mention,
      };
    });

    return [
      ...(lead ?? []),
      ...componentOptions,
      ...fileOptions,
      ...tokenOptions,
    ].filter((option) => !picked.has(option.key));
  }, [files, tokens, mentions, components, lead]);

  const add = (mention: RunMention) =>
    setMentions((prev) =>
      prev.some((item) => mentionKey(item) === mentionKey(mention))
        ? prev
        : [...prev, mention]
    );

  const requestSeq = request?.seq;
  useEffect(() => {
    if (request) {
      add(request.mention);
    }
  }, [requestSeq]);
  const picker = useMentionPicker(options, query);

  const pick = (option: MentionOption) => {
    if (lead?.some((item) => item.key === option.key)) {
      onLead?.(option);
    } else {
      add(option.mention);
    }

    setDraft(
      draft
        .replace(/@[^\s@]*$/u, "")
        .replace(/\s+$/u, (space) => (space ? " " : ""))
    );
  };

  const onKeyDown = (event: KeyboardEvent<HTMLElement>): boolean => {
    if (!picker.open) {
      return false;
    }

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      picker.move(event.key === "ArrowDown" ? 1 : -1);
    } else if (
      (event.key === "Enter" || event.key === "Tab") &&
      picker.current &&
      !event.metaKey &&
      !event.ctrlKey
    ) {
      pick(picker.current);
    } else if (event.key === "Escape") {
      setDismissed(draft);
    } else {
      return false;
    }

    event.preventDefault();
    event.stopPropagation();

    return true;
  };

  return {
    clear: () => setMentions([]),
    loading: files === null,
    mentions,
    onKeyDown,
    pick,
    picker,
    remove: (key: string) =>
      setMentions((prev) =>
        prev.filter((mention) => mentionKey(mention) !== key)
      ),
  };
};
