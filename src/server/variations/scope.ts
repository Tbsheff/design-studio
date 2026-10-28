import { readFile } from 'node:fs/promises';
import path from 'node:path';
import type { Direction, Project, SelectionContext } from '../../shared/contracts.js';
import { elementVariantsBlocker, type ElementScope, type ElementVariantInfo } from '../../shared/element-variants.js';
import { assertCanEdit, publishVersion, resolveSource, writeAtomic, type DirectEditDeps } from '../direct-edit/index.js';
import { htmlElementSpan } from '../direct-edit/html.js';
import { jsxElementSpan } from '../direct-edit/jsx.js';
import { BadRequestError, ConflictError } from '../store/errors.js';
import type { VersionStore } from '../types.js';
import { elementOf, hash } from './scope-check.js';

function lineAt(text: string, offset: number): number {
  let line = 1;
  for (let i = 0; i < offset && i < text.length; i += 1) if (text.charCodeAt(i) === 10) line += 1;
  return line;
}

function relativeFile(workTree: string, file: string): string {
  if (path.isAbsolute(file)) {
    const inside = path.relative(workTree, file);
    if (inside && !inside.startsWith('..') && !path.isAbsolute(inside)) return inside.split(path.sep).join('/');
  }
  return file.replace(/^\/+/, '');
}

function spanOf(relative: string, code: string, line: number, col: number): { start: number; end: number } | null {
  const extension = path.extname(relative).toLowerCase();
  if (extension === '.html' || extension === '.htm') return htmlElementSpan(code, { line, col });
  if (['.jsx', '.tsx', '.js', '.ts'].includes(extension)) return jsxElementSpan(code, { line, col }, extension === '.tsx' || extension === '.ts');
  return null;
}

export async function buildScope(project: Project, direction: Direction, versions: VersionStore, element: SelectionContext): Promise<ElementScope> {
  const blocker = elementVariantsBlocker(project, [element]);
  if (blocker) throw new BadRequestError(blocker);
  const source = element.source;
  if (!source) throw new BadRequestError('This element has no source location');
  if (!direction.headVersionId) throw new BadRequestError('Save the design once before you try variants of an element');
  const target = await resolveSource(direction.workTree, relativeFile(direction.workTree, source.file)).catch((error: unknown) => {
    throw new BadRequestError(`Could not read the element's source: ${error instanceof Error ? error.message : String(error)}`);
  });
  const status = await versions.status(project, direction, [target.relative]);
  if (status.changed.includes(target.relative)) throw new ConflictError(`${target.relative} has unsaved changes. Save or discard them, then try variants again.`);
  const code = await readFile(target.file, 'utf8');
  const span = spanOf(target.relative, code, source.line, source.col);
  if (!span || code[span.start] !== '<') throw new BadRequestError(`Could not find the element at ${target.relative}:${source.line}:${source.col}`);
  const elementSource = code.slice(span.start, span.end);
  const scope: ElementScope = {
    sourceDirectionId: direction.id,
    file: target.relative,
    loc: `${source.file}:${source.line}:${source.col}`,
    selector: element.selector,
    tag: element.tag,
    startLine: lineAt(code, span.start),
    endLine: lineAt(code, span.end),
    start: span.start,
    suffixLength: code.length - span.end,
    prefixHash: hash(code.slice(0, span.start)),
    suffixHash: hash(code.slice(span.end)),
    elementHash: hash(elementSource),
  };
  return scope;
}

async function readElement(direction: Direction, scope: ElementScope): Promise<{ code: string; element: string | null } | null> {
  const code = await readFile(path.join(direction.workTree, scope.file), 'utf8').catch(() => null);
  return code === null ? null : { code, element: elementOf(code, scope) };
}

export async function variantInfo(project: Project, direction: Direction, isRunning: boolean): Promise<ElementVariantInfo | null> {
  const variation = direction.variation;
  const scope = variation?.scope;
  if (!variation || !scope) return null;
  let state: ElementVariantInfo['state'];
  if (variation.settled) state = variation.settled;
  else if (isRunning) state = 'running';
  else if (variation.rejected) state = 'rejected';
  else {
    const read = await readElement(direction, scope);
    state = read?.element !== null && read?.element !== undefined && hash(read.element) !== scope.elementHash ? 'ready' : 'unchanged';
  }
  return {
    groupId: variation.groupId,
    label: variation.label,
    title: variation.title,
    directionId: direction.id,
    file: scope.file,
    lines: `${scope.startLine}-${scope.endLine}`,
    state,
    rejected: variation.rejected ?? null,
  };
}

export interface KeepDeps extends DirectEditDeps {
  projects: DirectEditDeps['projects'] & { get(projectId: string): Promise<Project> };
}

export interface KeepResult {
  versionId: string;
  directionId: string;
  label: string;
}

interface KeepPlan {
  variant: Direction;
  variation: NonNullable<Direction['variation']>;
  scope: ElementScope;
  target: Direction;
  code: string;
}

function readyVariant(deps: KeepDeps, project: Project, variantId: string): Omit<KeepPlan, 'code'> {
  const variant = project.directions.find((d) => d.id === variantId);
  const variation = variant?.variation;
  const scope = variation?.scope;
  if (!variant || !variation || !scope) throw new BadRequestError('This is not an element variant');
  if (variation.settled) throw new ConflictError(`This group is already ${variation.settled === 'kept' ? 'kept' : 'discarded'}.`);
  if (deps.runner.isRunning(project.id, variant.id)) throw new ConflictError('This variant is still running. Wait for it to finish.');
  if (variation.rejected) throw new ConflictError(variation.rejected);
  const target = project.directions.find((d) => d.id === scope.sourceDirectionId);
  if (!target) throw new BadRequestError('The design these variants came from is gone');
  return { variant, variation, scope, target };
}

async function planKeep(deps: KeepDeps, project: Project, variantId: string): Promise<KeepPlan> {
  const plan = readyVariant(deps, project, variantId);
  if ((await deps.versions.status(project, plan.variant)).dirty) throw new ConflictError('This variant has unsaved changes.');
  const read = await readElement(plan.variant, plan.scope);
  if (!read || read.element === null) throw new ConflictError('This variant changed code outside the element, so it cannot be kept.');
  if (hash(read.element) === plan.scope.elementHash) throw new ConflictError('This variant did not change the element.');
  return { ...plan, code: read.code };
}

async function settleGroup(deps: KeepDeps, project: Project, groupId: string, keptId: string): Promise<void> {
  for (const direction of project.directions) {
    if (direction.variation?.groupId !== groupId) continue;
    const settled = direction.id === keptId ? 'kept' : 'discarded';
    const updated = await deps.projects.updateDirection(project.id, direction.id, { variation: { ...direction.variation, settled } });
    deps.bus.emit({ type: 'direction.updated', projectId: project.id, directionId: direction.id, direction: updated });
  }
}

export async function keepElementVariant(deps: KeepDeps, project: Project, variantId: string): Promise<KeepResult> {
  const { variant, variation, scope, target, code } = await planKeep(deps, project, variantId);
  assertCanEdit(deps, project, target);
  const targetFile = path.join(target.workTree, scope.file);
  const current = await readFile(targetFile, 'utf8');
  const original = elementOf(current, scope);
  if (original === null || hash(original) !== scope.elementHash) throw new ConflictError(`${scope.file} changed in the main design since the variants started. Try the variants again.`);
  await writeAtomic(targetFile, code);
  const version = await deps.versions.commitFile(project, target, scope.file, `Keep variant ${variation.label}: ${variation.title}`, { kind: 'keep', prompt: variation.prompt }).catch(async (error: unknown) => {
    await writeAtomic(targetFile, current);
    throw error;
  });
  if (!version) {
    await writeAtomic(targetFile, current);
    throw new ConflictError('Nothing changed in the main design.');
  }
  await publishVersion(deps, project, target, version);
  await settleGroup(deps, project, variation.groupId, variant.id);
  return { versionId: version.id, directionId: target.id, label: variation.label };
}
