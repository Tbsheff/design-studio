import { useEffect, useMemo, useState, type KeyboardEvent } from 'react';
import type { CompiledTokenEntry, ComponentInfo, RunMention } from '../shared/contracts';
import { api } from './api';
import { mentionKey, mentionQueryOf, useMentionPicker, type MentionOption } from './components/MentionPicker';

const fileCache = new Map<string, Promise<string[]>>();

function loadFiles(projectId: string, directionId: string, fresh: boolean): Promise<string[]> {
  const key = `${projectId}/${directionId}`;
  const known = fileCache.get(key);
  if (known && !fresh) return known;
  const next = api.workTreeFiles(projectId, directionId).then((result) => result.files, () => []);
  fileCache.set(key, next);
  return next;
}

interface Options {
  projectId: string;
  directionId: string | null | undefined;
  tokens: readonly CompiledTokenEntry[] | undefined;
  draft: string;
  setDraft: (value: string) => void;
  components?: readonly ComponentInfo[] | null;
  request?: MentionRequest | null;
}

export interface MentionRequest {
  mention: RunMention;
  seq: number;
}

export function componentMention(component: ComponentInfo): RunMention {
  return { kind: 'component', name: component.name, file: component.file, selector: component.selector };
}

export function useMentions({ projectId, directionId, tokens, draft, setDraft, components, request }: Options) {
  const [files, setFiles] = useState<string[] | null>(null);
  const [mentions, setMentions] = useState<RunMention[]>([]);
  const [dismissed, setDismissed] = useState<string | null>(null);
  const rawQuery = mentionQueryOf(draft);
  const query = rawQuery !== null && draft !== dismissed ? rawQuery : null;

  const refresh = (fresh: boolean) => {
    if (directionId) void loadFiles(projectId, directionId, fresh).then(setFiles);
  };
  useEffect(() => refresh(false), [projectId, directionId]);
  useEffect(() => {
    if (query === '' ) refresh(true);
  }, [query === '']);

  const options = useMemo<MentionOption[]>(() => {
    const picked = new Set(mentions.map(mentionKey));
    const fileOptions = (files ?? []).map((path): MentionOption => ({ key: `file:${path}`, label: path.split('/').pop() ?? path, detail: path, mention: { kind: 'file', path } }));
    const tokenOptions = (tokens ?? []).map((entry): MentionOption => ({ key: `token:${entry.cssVar}`, label: entry.cssVar, detail: entry.value, mention: { kind: 'token', name: entry.cssVar, value: entry.value } }));
    const componentOptions = (components ?? []).map((item): MentionOption => {
      const mention = componentMention(item);
      return { key: mentionKey(mention), label: item.name, detail: item.file ?? 'Component', mention };
    });
    return [...componentOptions, ...fileOptions, ...tokenOptions].filter((option) => !picked.has(option.key));
  }, [files, tokens, mentions, components]);
  const add = (mention: RunMention) => setMentions((prev) => (prev.some((item) => mentionKey(item) === mentionKey(mention)) ? prev : [...prev, mention]));
  const requestSeq = request?.seq;
  useEffect(() => {
    if (request) add(request.mention);
  }, [requestSeq]);
  const picker = useMentionPicker(options, query);

  const pick = (option: MentionOption) => {
    add(option.mention);
    setDraft(draft.replace(/@[^\s@]*$/, '').replace(/\s+$/, (space) => (space ? ' ' : '')));
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>): boolean => {
    if (!picker.open) return false;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') picker.move(event.key === 'ArrowDown' ? 1 : -1);
    else if ((event.key === 'Enter' || event.key === 'Tab') && picker.current && !event.metaKey && !event.ctrlKey) pick(picker.current);
    else if (event.key === 'Escape') setDismissed(draft);
    else return false;
    event.preventDefault();
    event.stopPropagation();
    return true;
  };

  return {
    picker,
    loading: files === null,
    mentions,
    pick,
    onKeyDown,
    remove: (key: string) => setMentions((prev) => prev.filter((mention) => mentionKey(mention) !== key)),
    clear: () => setMentions([]),
  };
}
