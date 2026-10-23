import { existsSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import type { Direction, Project, TokenChange, Version, VersionMeta } from '../../shared/contracts.js';
import { TWEAKS_FILE, parseTweakCss, tweakCss, type CommitTweaksResult, type TweakControl, type TweakValue } from '../../shared/tweaks.js';
import { DESIGN_FILES, readSnapshot, restoreSnapshots } from '../design-system/create-token.js';
import { writeFileAtomic } from '../design-system/packs.js';
import { invalidateTokenSource } from '../design-system/token-preview.js';
import { plannedTokensText, writeTokensText } from '../design-system/update-tokens.js';
import { DirectEditError, assertCanEdit, publishVersion, writeAtomic, type DirectEditDeps } from '../direct-edit/index.js';
import { applyEdits, type CssEdit } from './css-vars.js';
import { describeZodError } from './schema.js';
import { declarationsFor, loadStyleSources, type StyleSource } from './sources.js';
import { readTweaksFile, readTweaksState, serializeTweaks, tokenVarPaths } from './store.js';

const requestSchema = z.object({ values: z.record(z.string(), z.union([z.number(), z.string(), z.boolean()])) }).strict();
const TITLE_LABELS = 4;

interface PlannedValue {
  control: TweakControl;
  value: TweakValue;
  css: string;
}

interface TweakPlan {
  values: PlannedValue[];
  tokenChanges: TokenChange[];
  cssWrites: { relative: string; text: string }[];
  tweaksText: string;
  tweaksChanged: boolean;
}

export function commitTitle(controls: TweakControl[]): string {
  const labels = controls.map((control) => control.label);
  const shown = labels.slice(0, TITLE_LABELS).join(', ');
  const more = labels.length > TITLE_LABELS ? ` +${labels.length - TITLE_LABELS} more` : '';
  return `Tweak: ${shown}${more}`;
}

function commitMeta(values: PlannedValue[]): VersionMeta {
  return { kind: 'manual', prompt: `Tweak: ${values.map((item) => `${item.control.cssVar} = ${item.css}`).join('; ')}` };
}

function parseRequest(raw: unknown): Record<string, TweakValue> {
  const parsed = requestSchema.safeParse(raw);
  if (!parsed.success) throw new DirectEditError('invalid_request', describeZodError(parsed.error));
  if (Object.keys(parsed.data.values).length === 0) throw new DirectEditError('invalid_request', 'values must name at least one control');
  return parsed.data.values;
}

function planValues(controls: TweakControl[], values: Record<string, TweakValue>): PlannedValue[] {
  const byId = new Map(controls.map((control) => [control.id, control]));
  return Object.entries(values).map(([id, value]) => {
    const control = byId.get(id);
    if (!control) throw new DirectEditError('unknown_tweak', `No tweak control has id ${id}`);
    const css = tweakCss(control, value);
    if (css === null) throw new DirectEditError('invalid_tweak_value', `${control.label}: ${JSON.stringify(value)} is not a valid value for this ${control.type} control`);
    return { control, value: parseTweakCss(control, css) ?? value, css };
  });
}

function planCssWrites(values: PlannedValue[], sources: StyleSource[]): { relative: string; text: string }[] {
  const edits = new Map<string, { source: StyleSource; edits: CssEdit[] }>();
  for (const { control, css } of values) {
    const found = declarationsFor(sources, control.cssVar);
    if (found.length === 0) {
      throw new DirectEditError('tweak_not_declared', `${control.cssVar} is not declared in a top-level :root rule, so ${control.label} cannot be saved`);
    }
    for (const { source, decl } of found) {
      if (decl.value === css) continue;
      const entry = edits.get(source.relative) ?? { source, edits: [] };
      entry.edits.push({ start: decl.start, end: decl.end, text: css });
      edits.set(source.relative, entry);
    }
  }
  return [...edits.values()].map(({ source, edits: list }) => ({ relative: source.relative, text: applyEdits(source.text, list) }));
}

function withDefaults(controls: TweakControl[], values: PlannedValue[]): TweakControl[] {
  const next = new Map(values.map((item) => [item.control.id, item.value]));
  return controls.map((control) => (next.has(control.id) ? ({ ...control, default: next.get(control.id) } as TweakControl) : control));
}

async function planTweakCommit(workTree: string, raw: unknown): Promise<TweakPlan> {
  const requested = parseRequest(raw);
  const read = await readTweaksFile(workTree);
  if (read.error) throw new DirectEditError('invalid_request', read.error);
  if (!read.file || read.text === null) throw new DirectEditError('no_tweaks', `${TWEAKS_FILE} does not exist; ask the agent to define tweaks first`);
  const values = planValues(read.file.controls, requested);
  const [sources, tokens] = await Promise.all([loadStyleSources(workTree), tokenVarPaths(workTree)]);
  const tokenChanges: TokenChange[] = [];
  const varValues: PlannedValue[] = [];
  for (const item of values) {
    const token = tokens.get(item.control.cssVar);
    if (token) tokenChanges.push({ path: token.path, value: item.css });
    if (!token || declarationsFor(sources, item.control.cssVar).length > 0) varValues.push(item);
  }
  const tweaksText = serializeTweaks({ controls: withDefaults(read.file.controls, values) });
  return { values, tokenChanges, cssWrites: planCssWrites(varValues, sources), tweaksText, tweaksChanged: tweaksText !== read.text };
}

async function writePlan(workTree: string, plan: TweakPlan, tokensText: string | null): Promise<string[]> {
  for (const write of plan.cssWrites) await writeAtomic(path.join(workTree, write.relative), write.text);
  if (plan.tweaksChanged) await writeFileAtomic(path.join(workTree, TWEAKS_FILE), plan.tweaksText);
  if (tokensText !== null) await writeTokensText(workTree, tokensText);
  const designFiles = tokensText === null ? [] : DESIGN_FILES.filter((relative) => existsSync(path.join(workTree, relative)));
  return [...new Set([TWEAKS_FILE, ...plan.cssWrites.map((write) => write.relative), ...designFiles])];
}

export async function commitTweaks(deps: DirectEditDeps, project: Project, direction: Direction, raw: unknown): Promise<CommitTweaksResult> {
  assertCanEdit(deps, project, direction);
  const workTree = direction.workTree;
  const plan = await planTweakCommit(workTree, raw);
  const tokensText = plan.tokenChanges.length > 0 ? await plannedTokensText(workTree, plan.tokenChanges) : null;
  if (tokensText === null && plan.cssWrites.length === 0 && !plan.tweaksChanged) throw new DirectEditError('no_change', 'The tweak values are already saved');
  const touched = [TWEAKS_FILE, ...plan.cssWrites.map((write) => write.relative), ...(tokensText === null ? [] : DESIGN_FILES)];
  const snapshots = await Promise.all(touched.map((relative) => readSnapshot(workTree, relative)));
  let version: Version | null;
  try {
    const paths = await writePlan(workTree, plan, tokensText);
    version = await deps.versions.commitFile(project, direction, paths, commitTitle(plan.values.map((item) => item.control)), commitMeta(plan.values));
    if (version === null) throw new DirectEditError('no_change', 'The tweaks did not change any tracked file');
  } catch (error) {
    await restoreSnapshots(workTree, snapshots);
    throw error;
  } finally {
    if (tokensText !== null) invalidateTokenSource(workTree);
  }
  await publishVersion(deps, project, direction, version);
  return { state: await readTweaksState(workTree), version };
}
