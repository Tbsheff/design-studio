import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { TWEAKS_FILE, parseTweakCss, type TweakControl, type TweaksFile, type TweaksState, type TweakValue } from '../../shared/tweaks.js';
import { writeFileAtomic } from '../design-system/packs.js';
import { readDesignSystemFiles } from '../design-system/sync.js';
import { isNodeError } from '../store/errors.js';
import { parseControls, parseTweaksText } from './schema.js';
import { declarationsFor, isVarUsed, loadStyleSources, type StyleSource } from './sources.js';

interface TweaksRead {
  file: TweaksFile | null;
  text: string | null;
  error: string | null;
}

export async function readTweaksFile(workTree: string): Promise<TweaksRead> {
  let text: string;
  try {
    text = await readFile(path.join(workTree, TWEAKS_FILE), 'utf8');
  } catch (error) {
    if (isNodeError(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR')) return { file: null, text: null, error: null };
    throw error;
  }
  const parsed = parseTweaksText(text);
  return { file: parsed.file, text, error: parsed.error };
}

export function serializeTweaks(file: TweaksFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

async function writeTweaksFile(workTree: string, file: TweaksFile): Promise<void> {
  const target = path.join(workTree, TWEAKS_FILE);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFileAtomic(target, serializeTweaks(file));
}

export async function tokenVarPaths(workTree: string): Promise<Map<string, { path: string; value: string }>> {
  const files = await readDesignSystemFiles(workTree);
  const out = new Map<string, { path: string; value: string }>();
  for (const entry of files?.entries ?? []) out.set(entry.cssVar, { path: entry.path, value: entry.value });
  return out;
}

interface ControlSource {
  current: string | null;
  tokenPath: string | null;
  problems: string[];
}

function inspectControl(control: TweakControl, sources: StyleSource[], tokens: Map<string, { path: string; value: string }>): ControlSource {
  const token = tokens.get(control.cssVar);
  const problems: string[] = [];
  const found = declarationsFor(sources, control.cssVar);
  const current = found[found.length - 1]?.decl.value ?? token?.value ?? null;
  if (!token && found.length === 0) problems.push(`${control.cssVar} (${control.label}) is not declared in a top-level :root rule. Add \`:root { ${control.cssVar}: <default>; }\` to the page CSS.`);
  if (!isVarUsed(sources, control.cssVar)) problems.push(`${control.cssVar} (${control.label}) is never used. Use var(${control.cssVar}) in the rules it should change.`);
  return { current, tokenPath: token?.path ?? null, problems };
}

export async function readTweaksState(workTree: string): Promise<TweaksState> {
  const read = await readTweaksFile(workTree);
  const empty: TweaksState = { controls: [], current: {}, tokenPaths: {}, problems: [], error: read.error };
  if (!read.file || read.file.controls.length === 0) return empty;
  const [sources, tokens] = await Promise.all([loadStyleSources(workTree), tokenVarPaths(workTree)]);
  const current: Record<string, TweakValue> = {};
  const tokenPaths: Record<string, string> = {};
  const problems: string[] = [];
  for (const control of read.file.controls) {
    const info = inspectControl(control, sources, tokens);
    const value = info.current === null ? null : parseTweakCss(control, info.current);
    current[control.id] = value ?? control.default;
    if (info.tokenPath) tokenPaths[control.id] = info.tokenPath;
    problems.push(...info.problems);
  }
  return { controls: read.file.controls, current, tokenPaths, problems, error: null };
}

interface DefineResult {
  ok: boolean;
  text: string;
  controls: TweakControl[];
  problems: string[];
}

function describeControl(control: TweakControl): string {
  if (control.type === 'range') return `${control.label} (${control.cssVar}, range ${control.min}-${control.max}${control.unit ?? ''}, default ${control.default}${control.unit ?? ''})`;
  if (control.type === 'toggle') return `${control.label} (${control.cssVar}, toggle ${control.off} / ${control.on})`;
  if (control.type === 'select') return `${control.label} (${control.cssVar}, select ${control.options.map((option) => option.value).join(' | ')})`;
  return `${control.label} (${control.cssVar}, color ${control.default})`;
}

export async function defineTweaks(workTree: string, raw: unknown): Promise<DefineResult> {
  const parsed = parseControls(raw);
  if (parsed.controls === null) return { ok: false, text: `define_tweaks rejected the controls: ${parsed.error}. Nothing was saved.`, controls: [], problems: [] };
  const controls = parsed.controls;
  await writeTweaksFile(workTree, { controls });
  if (controls.length === 0) return { ok: true, text: `Removed all tweaks (${TWEAKS_FILE}).`, controls, problems: [] };
  const [sources, tokens] = await Promise.all([loadStyleSources(workTree), tokenVarPaths(workTree)]);
  const problems = controls.flatMap((control) => inspectControl(control, sources, tokens).problems);
  const lines = [`Saved ${controls.length} tweak control(s) to ${TWEAKS_FILE}: ${controls.map(describeControl).join('; ')}.`];
  if (problems.length > 0) lines.push(`Fix these with Edit now, or the controls will not change the page:\n- ${problems.join('\n- ')}`);
  else lines.push('Every cssVar is declared in :root and used. The user can now drag these controls in the Tweaks panel.');
  return { ok: true, text: lines.join('\n'), controls, problems };
}
