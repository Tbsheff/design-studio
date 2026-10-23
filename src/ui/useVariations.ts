import { useCallback, useEffect, useRef, useState } from 'react';
import { VARIATION_MIN, type Direction, type Project, type RunLevel, type RunRequest, type SelectionContext, type VariationBrief, type VariationBriefsResult } from '../shared/contracts';
import { resolveRunConfig } from '../shared/run-levels';
import { errorText } from './api';
import { maxVariationsFor, variationsApi } from './variationsApi';

export interface BriefDraft {
  prompt: string;
  level: RunLevel;
  attachmentIds: string[];
  count: number;
  fromDirectionId: string | null;
  briefs: VariationBrief[] | null;
  result: VariationBriefsResult | null;
  loading: boolean;
  starting: boolean;
  autoStart: boolean;
  error: string | null;
}

interface Options {
  projectId: string;
  project: Project | null;
  direction: Direction | null;
  setDirectionId: (id: string) => void;
  seedRun: (runId: string, directionId: string, request: RunRequest) => void;
}

const COUNT_KEY = 'studio.variations.count';

function storedCount(): number {
  const raw = Number(window.localStorage.getItem(COUNT_KEY));
  return Number.isInteger(raw) && raw >= 1 && raw <= 4 ? raw : 1;
}

function relabel(briefs: VariationBrief[]): VariationBrief[] {
  return briefs.map((brief, index) => ({ ...brief, label: 'ABCD'[index] ?? String(index + 1) }));
}

export { formatUsd as money } from './format';

export function budgetFor(project: Project | null, level: RunLevel, count: number): { perRun: number | null; total: number | null } {
  if (!project) return { perRun: 0, total: 0 };
  const perRun = resolveRunConfig(project.settings, level).maxBudgetUsd;
  return { perRun, total: perRun === null ? null : Math.round(perRun * count * 100) / 100 };
}

export function useVariations(o: Options) {
  const [count, setCountState] = useState(storedCount);
  const [draft, setDraft] = useState<BriefDraft | null>(null);
  const [gridGroupId, setGridGroupId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [kept, setKept] = useState<string | null>(null);
  const opts = useRef(o);
  opts.current = o;
  const requestRef = useRef(0);
  const autoStartRef = useRef(false);
  const max = o.project ? maxVariationsFor(o.project.kind) : 4;
  const effectiveCount = Math.min(count, max);

  const setCount = useCallback((next: number) => {
    setCountState(next);
    window.localStorage.setItem(COUNT_KEY, String(next));
  }, []);

  useEffect(() => {
    setDraft(null);
    setGridGroupId(null);
    setNotice(null);
    setKept(null);
  }, [o.projectId]);

  const startWith = useCallback(async (current: BriefDraft, briefs: VariationBrief[]) => {
    const { projectId, seedRun } = opts.current;
    setDraft({ ...current, starting: true, error: null });
    try {
      const result = await variationsApi.start(projectId, {
        prompt: current.prompt,
        briefs,
        level: current.level,
        fromDirectionId: current.fromDirectionId,
        ...(current.attachmentIds.length ? { attachmentIds: current.attachmentIds } : {}),
      });
      result.items.forEach((item, index) => {
        const brief = briefs[index];
        if (!item.runId || !item.directionId || !brief) return;
        seedRun(item.runId, item.directionId, { prompt: current.prompt, mode: 'edit', level: current.level, variation: { ...brief, index, count: briefs.length } });
      });
      const failed = result.items.filter((item) => item.error);
      setNotice(failed.length ? failed.map((item) => `${item.label}: ${item.error}`).join(' ') : null);
      setDraft(null);
      setGridGroupId(result.groupId);
    } catch (err) {
      setDraft({ ...current, starting: false, autoStart: false, error: errorText(err) });
    }
  }, []);

  const propose = useCallback(
    async (prompt: string, level: RunLevel, attachmentIds: string[], requestedCount?: number) => {
      const { projectId, project, direction } = opts.current;
      const count = requestedCount === undefined ? effectiveCount : Math.min(requestedCount, project ? maxVariationsFor(project.kind) : requestedCount);
      const fromDirectionId = direction?.headVersionId ? direction.id : null;
      const ticket = requestRef.current + 1;
      requestRef.current = ticket;
      autoStartRef.current = false;
      const base: BriefDraft = { prompt, level, attachmentIds, count, fromDirectionId, briefs: null, result: null, loading: true, starting: false, autoStart: false, error: null };
      setDraft(base);
      try {
        const result = await variationsApi.briefs(projectId, { prompt, count, fromDirectionId });
        if (requestRef.current !== ticket) return;
        const ready: BriefDraft = { ...base, briefs: result.briefs, result, loading: false, autoStart: autoStartRef.current };
        if (autoStartRef.current) await startWith(ready, result.briefs);
        else setDraft(ready);
      } catch (err) {
        if (requestRef.current === ticket) setDraft({ ...base, loading: false, error: errorText(err) });
      }
    },
    [effectiveCount, startWith],
  );

  const editBrief = useCallback((index: number, patch: Partial<Pick<VariationBrief, 'title' | 'brief'>>) => {
    setDraft((prev) => (prev?.briefs ? { ...prev, briefs: prev.briefs.map((brief, i) => (i === index ? { ...brief, ...patch } : brief)) } : prev));
  }, []);

  const removeBrief = useCallback((index: number) => {
    setDraft((prev) => (prev?.briefs && prev.briefs.length > VARIATION_MIN ? { ...prev, briefs: relabel(prev.briefs.filter((_, i) => i !== index)) } : prev));
  }, []);

  const start = useCallback(() => {
    if (draft?.briefs && !draft.starting) void startWith(draft, relabel(draft.briefs));
  }, [draft, startWith]);

  const skip = useCallback(() => {
    if (!draft || draft.starting) return;
    if (draft.briefs && draft.result) {
      void startWith(draft, draft.result.briefs);
      return;
    }
    autoStartRef.current = true;
    setDraft({ ...draft, autoStart: true });
  }, [draft, startWith]);

  const mix = useCallback(async (fromDirectionId: string, toDirectionId: string, element: SelectionContext, level: RunLevel) => {
    const { projectId, seedRun } = opts.current;
    const { runId } = await variationsApi.mix(projectId, { fromDirectionId, toDirectionId, element, level });
    seedRun(runId, toDirectionId, { prompt: `Use the ${element.tag} from another variation`, mode: 'edit', level });
    return runId;
  }, []);

  const cancelAll = useCallback(async (groupId: string) => {
    await variationsApi.cancel(opts.current.projectId, groupId);
  }, []);

  return {
    count: effectiveCount,
    max,
    setCount,
    draft,
    propose,
    editBrief,
    removeBrief,
    start,
    skip,
    dismiss: () => {
      requestRef.current += 1;
      autoStartRef.current = false;
      setDraft(null);
    },
    gridGroupId,
    openGrid: (groupId: string) => {
      setKept(null);
      setGridGroupId(groupId);
    },
    closeGrid: () => setGridGroupId(null),
    notice,
    clearNotice: () => setNotice(null),
    kept,
    keepNotice: setKept,
    mix,
    cancelAll,
  };
}

export type VariationsState = ReturnType<typeof useVariations>;
