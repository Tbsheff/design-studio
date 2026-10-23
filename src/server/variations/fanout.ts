import type { Direction, DirectionVariation, Project, RunLevel, RunRequest, VariationBrief, VariationStartItem } from '../../shared/contracts.js';

interface FanOutDeps {
  createDirection(name: string, variation: DirectionVariation): Promise<Direction>;
  startRun(direction: Direction, request: RunRequest): Promise<string>;
}

interface FanOutInput {
  groupId: string;
  prompt: string;
  briefs: VariationBrief[];
  level: RunLevel;
  attachmentIds?: string[];
  takenNames: ReadonlySet<string>;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function variationName(label: string, taken: ReadonlySet<string>): string {
  const base = `Variation ${label}`;
  if (!taken.has(base)) return base;
  for (let round = 2; ; round += 1) {
    const candidate = `${base} (${round})`;
    if (!taken.has(candidate)) return candidate;
  }
}

function variationRequest(input: FanOutInput, brief: VariationBrief, index: number): RunRequest {
  return {
    prompt: input.prompt,
    mode: 'edit',
    level: input.level,
    variation: { ...brief, index, count: input.briefs.length },
    ...(input.attachmentIds?.length ? { attachmentIds: input.attachmentIds } : {}),
  };
}

export async function fanOut(deps: FanOutDeps, input: FanOutInput): Promise<VariationStartItem[]> {
  const taken = new Set(input.takenNames);
  const created: { brief: VariationBrief; index: number; direction: Direction | null; error: string | null }[] = [];
  for (const [index, brief] of input.briefs.entries()) {
    const name = variationName(brief.label, taken);
    taken.add(name);
    const variation: DirectionVariation = { ...brief, groupId: input.groupId, index, count: input.briefs.length, prompt: input.prompt };
    try {
      created.push({ brief, index, direction: await deps.createDirection(name, variation), error: null });
    } catch (error) {
      created.push({ brief, index, direction: null, error: `Could not create the direction: ${describe(error)}` });
    }
  }
  const started = await Promise.allSettled(
    created.map(async (item) => (item.direction ? deps.startRun(item.direction, variationRequest(input, item.brief, item.index)) : null)),
  );
  return created.map((item, index) => {
    const outcome = started[index];
    const runId = outcome?.status === 'fulfilled' ? outcome.value : null;
    const runError = outcome?.status === 'rejected' ? `Could not start the run: ${describe(outcome.reason)}` : null;
    return { label: item.brief.label, directionId: item.direction?.id ?? null, runId, error: item.error ?? runError };
  });
}

interface GroupRegistry {
  remember(groupId: string, runIds: string[]): void;
  add(groupId: string, runId: string): void;
  runIds(groupId: string): string[];
}

export function createGroupRegistry(): GroupRegistry {
  const groups = new Map<string, Set<string>>();
  return {
    remember(groupId, runIds) {
      groups.set(groupId, new Set(runIds));
    },
    add(groupId, runId) {
      const set = groups.get(groupId) ?? new Set<string>();
      set.add(runId);
      groups.set(groupId, set);
    },
    runIds(groupId) {
      return [...(groups.get(groupId) ?? [])];
    },
  };
}

export function groupDirections(project: Project, groupId: string): Direction[] {
  return project.directions.filter((direction) => direction.variation?.groupId === groupId).sort((a, b) => (a.variation?.index ?? 0) - (b.variation?.index ?? 0));
}
