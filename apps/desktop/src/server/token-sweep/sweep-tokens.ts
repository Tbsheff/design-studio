import path from "node:path";

import {
  assertCanEdit,
  BadRequestError,
  loadAppTokens,
  publishVersion,
  readDesignSystemFiles,
  savesSettled,
  writeAndCommitAll,
} from "./deps.js";
import type {
  CompiledTokenEntry,
  Direction,
  Project,
  VersionMeta,
} from "./deps.js";
import { buildSweepTokens, planSweep, tagRegion } from "./engine/index.js";
import type {
  Region,
  SweepChange,
  SweepKind,
  SweepLeftover,
  SweepPlan,
  SweepToken,
} from "./engine/index.js";
import { listSourceFiles, readSource, requireSafe } from "./source-files.js";
import type { TokenSweepRuntime } from "./token-sweep-runtime.js";

interface SweepLayer {
  readonly col: number;
  readonly file: string;
  readonly line: number;
}

interface SweepCommand {
  readonly directionId: string;
  readonly dryRun: boolean;
  readonly kinds: readonly SweepKind[];
  readonly layer: SweepLayer | null;
  readonly page: string | null;
  readonly projectId: string;
  readonly select: readonly string[] | null;
}

interface SweepResult {
  readonly applied: number;
  readonly changes: readonly SweepChange[];
  readonly dryRun: boolean;
  readonly files: readonly string[];
  readonly unmatched: readonly SweepLeftover[];
  readonly versionId: string | null;
}

interface PlanContext {
  readonly kinds: ReadonlySet<SweepKind>;
  readonly select: ReadonlySet<string> | null;
  readonly tokens: readonly SweepToken[];
  readonly workTree: string;
}

interface FilePlan {
  readonly before: string;
  readonly plan: SweepPlan;
  readonly relative: string;
}

interface FileChange {
  readonly after: string;
  readonly before: string;
  readonly relative: string;
}

const TITLE = "Apply tokens";
const ALL_KINDS: readonly SweepKind[] = ["color", "font", "radius", "spacing"];

const entriesOf = async (
  workTree: string
): Promise<readonly CompiledTokenEntry[]> => {
  const system = await readDesignSystemFiles(workTree);

  if (system !== null && system.entries.length > 0) {
    return system.entries;
  }

  const app = await loadAppTokens(workTree);

  return app?.entries ?? [];
};

const tokenFilesOf = (entries: readonly CompiledTokenEntry[]): Set<string> =>
  new Set(entries.map((entry) => entry.source?.file ?? ""));

const targetsOf = async (
  workTree: string,
  command: SweepCommand,
  skipped: ReadonlySet<string>
): Promise<string[]> => {
  if (command.layer !== null) {
    return [requireSafe(command.layer.file)];
  }

  if (command.page !== null) {
    return [requireSafe(command.page)];
  }

  const all = await listSourceFiles(workTree);

  return all.filter((relative) => !skipped.has(relative));
};

const regionOf = (command: SweepCommand, code: string): Region | null => {
  if (command.layer === null) {
    return null;
  }

  return tagRegion(code, command.layer.line, command.layer.col);
};

const commitChanges = async (
  runtime: TokenSweepRuntime,
  scope: { direction: Direction; project: Project },
  files: readonly FileChange[],
  count: number
): Promise<string> => {
  const { direction, project } = scope;
  const { editDeps } = runtime;

  assertCanEdit(editDeps, project, direction);
  await savesSettled(project.id);

  const meta: VersionMeta = {
    kind: "manual",
    prompt: `${TITLE}: ${count} values in ${files.length} files`,
  };

  const version = await writeAndCommitAll(
    editDeps,
    project,
    direction,
    files.map((file) => ({
      code: file.after,
      original: file.before,
      target: {
        file: path.join(direction.workTree, file.relative),
        relative: file.relative,
      },
    })),
    TITLE,
    meta
  );

  editDeps.history?.record({
    directionId: direction.id,
    files: files.map((file) => ({
      after: file.after,
      before: file.before,
      file: path.join(direction.workTree, file.relative),
      relative: file.relative,
    })),
    label: TITLE,
    projectId: project.id,
    versionId: version.id,
  });
  await publishVersion(editDeps, project, direction, version);

  return version.id;
};

const kindsOf = (command: SweepCommand): Set<SweepKind> => {
  if (command.kinds.length > 0) {
    return new Set(command.kinds);
  }

  return new Set(ALL_KINDS);
};

const selectOf = (command: SweepCommand): Set<string> | null => {
  if (command.select === null) {
    return null;
  }

  return new Set(command.select);
};

const planFile = async (
  context: PlanContext,
  command: SweepCommand,
  relative: string
): Promise<FilePlan> => {
  const code = await readSource(context.workTree, relative);

  const plan = planSweep({
    code,
    file: relative,
    isCss: relative.endsWith(".css"),
    kinds: context.kinds,
    region: regionOf(command, code),
    select: context.select,
    tokens: context.tokens,
  });

  return { before: code, plan, relative };
};

const fileChangeOf = (entry: FilePlan): FileChange[] => {
  if (entry.plan.code === entry.before) {
    return [];
  }

  return [
    {
      after: entry.plan.code,
      before: entry.before,
      relative: entry.relative,
    },
  ];
};

const sweepIn = async (
  runtime: TokenSweepRuntime,
  scope: { direction: Direction; project: Project },
  command: SweepCommand
): Promise<SweepResult> => {
  const { workTree } = scope.direction;
  const entries = await entriesOf(workTree);
  const tokens = buildSweepTokens(entries);

  if (tokens.length === 0) {
    throw new BadRequestError("This project has no design tokens to apply.");
  }

  const context: PlanContext = {
    kinds: kindsOf(command),
    select: selectOf(command),
    tokens,
    workTree,
  };

  const targets = await targetsOf(workTree, command, tokenFilesOf(entries));

  const plans = await Promise.all(
    targets.map((relative) => planFile(context, command, relative))
  );

  const changes = plans.flatMap((entry) => entry.plan.changes);
  const unmatched = plans.flatMap((entry) => entry.plan.unmatched);

  const written = plans.flatMap((entry) => fileChangeOf(entry));

  const files = written.map((file) => file.relative);

  const rest = { changes, files, unmatched };

  if (command.dryRun || written.length === 0) {
    return { ...rest, applied: 0, dryRun: command.dryRun, versionId: null };
  }

  const versionId = await commitChanges(
    runtime,
    scope,
    written,
    changes.length
  );

  return { ...rest, applied: changes.length, dryRun: false, versionId };
};

const sweepTokens = (
  runtime: TokenSweepRuntime,
  command: SweepCommand
): Promise<SweepResult> =>
  runtime.withDirection(
    command.projectId,
    command.directionId,
    (project, direction) => sweepIn(runtime, { direction, project }, command)
  );

export { sweepTokens };

export type { SweepCommand, SweepResult };
