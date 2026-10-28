import type { DirectEditRequest, Direction, Project, Version } from '../../shared/contracts.js';
import type { ReviewFinding, ReviewFixResult } from '../../shared/review.js';
import { applyDirectEditBatch } from '../direct-edit/batch.js';
import { applyDirectEdit, planDirectEdit, type DirectEditDeps } from '../direct-edit/index.js';
import { knownTokenVars } from '../direct-edit/tokens.js';
import type { Draft, FixGuard } from './checks.js';

const VERIFY_MAX = 60;

function count(text: string, needle: string): number {
  if (!needle) return 0;
  let hits = 0;
  for (let at = text.indexOf(needle); at !== -1; at = text.indexOf(needle, at + needle.length)) hits += 1;
  return hits;
}

interface DryRun {
  original: string;
  code: string;
  mode: 'classes' | 'inline' | 'none' | null;
  classes: string[];
}

function guardProblem(run: DryRun, guard: FixGuard | undefined): string | null {
  if (run.code === run.original) return 'the edit changes nothing';
  if (!guard) return null;
  if (guard.literal && count(run.code, guard.literal) >= count(run.original, guard.literal)) return 'the raw value stays in the file';
  if (!guard.noArbitrary) return null;
  if (run.mode !== 'classes') return 'no theme class fits';
  const before = new Set(guard.classes ?? []);
  return run.classes.some((cls) => !before.has(cls) && /[[(]/.test(cls)) ? 'no theme step fits the value' : null;
}

async function dryRun(project: Project, direction: Direction, edit: DirectEditRequest, known: Set<string> | null): Promise<DryRun> {
  const plan = await planDirectEdit(direction.workTree, edit, known, { projectKind: project.kind });
  return { original: plan.original, code: plan.patch.code, mode: plan.patch.tailwind?.mode ?? null, classes: plan.patch.tailwind?.classes ?? [] };
}

export async function verifyFixes(project: Project, direction: Direction, drafts: Draft[]): Promise<void> {
  const known = await knownTokenVars(direction.workTree);
  let checked = 0;
  for (const draft of drafts) {
    if (!draft.fix) continue;
    if (checked >= VERIFY_MAX) {
      draft.fix = null;
      continue;
    }
    checked += 1;
    const problem = await dryRun(project, direction, draft.fix.edit, known).then(
      (run) => guardProblem(run, draft.guard),
      (error: unknown) => (error instanceof Error ? error.message : String(error)),
    );
    if (problem) draft.fix = null;
  }
}

function sourceKey(edit: DirectEditRequest): string {
  return `${edit.source.file}:${edit.source.line}:${edit.source.col}`;
}

export function mergeEdits(findings: ReviewFinding[]): DirectEditRequest[] {
  const merged = new Map<string, DirectEditRequest>();
  for (const finding of findings) {
    const edit = finding.fix?.edit;
    if (!edit) continue;
    const key = sourceKey(edit);
    const prior = merged.get(key);
    merged.set(key, prior ? { ...prior, style: { ...prior.style, ...edit.style } } : { ...edit, style: { ...edit.style } });
  }
  return [...merged.values()];
}

export async function applyFindingFixes(deps: DirectEditDeps, project: Project, direction: Direction, findings: ReviewFinding[]): Promise<Pick<ReviewFixResult, 'files' | 'version'>> {
  const edits = mergeEdits(findings);
  if (edits.length === 1 && edits[0]) {
    const result = await applyDirectEdit(deps, project, direction, edits[0]);
    return { files: [result.file], version: result.version };
  }
  const result = await applyDirectEditBatch(deps, project, direction, { edits });
  const version: Version | null = result.files.length > 0 ? result.version : null;
  return { files: result.files, version };
}
