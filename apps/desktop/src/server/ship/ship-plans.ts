import type { ApprovalCard } from "@design-studio/actions/_core/approval-card";
import { SHIP_NOTE } from "@design-studio/actions/ship/schema";
import type { ShipPlan } from "@design-studio/actions/ship/schema";
import type {
  ShipMode,
  ShipPrepare,
  ShipRepoInfo,
  ShipRequest,
  ShipResult,
} from "@design-studio/contracts/ship";

import { prepareShip } from "../git/ship-prepare.js";
import { ship } from "../git/ship.js";
import { BadRequestError } from "../platform/errors/index.js";
import type { ShipTarget } from "./ship-core.js";

interface PlanQuery {
  readonly baseVersionId?: string;
  readonly title?: string;
}

interface PublishQuery extends PlanQuery {
  readonly body?: string;
  readonly branch?: string;
  readonly commitMessage?: string;
  readonly files?: readonly string[];
  readonly headVersionId?: string;
  readonly mode?: ShipMode;
}

const DIFF_MAX = 6000;

const BASES_MAX = 10;

const SHA_SHORT = 7;

const LINE_MAX = 80;

const FILES_LINE_MAX = 300;

const COMPLETE_KEYS = [
  "baseVersionId",
  "body",
  "branch",
  "commitMessage",
  "files",
  "headVersionId",
  "title",
] as const;

const cut = (text: string, max: number): string => {
  if (text.length > max) {
    return `${text.slice(0, max)}\n[cut at ${max} characters]`;
  }

  return text;
};

const oneLine = (text: string, max: number): string => {
  const flat = text.replaceAll(/\s+/gu, " ").trim();

  if (flat.length > max) {
    return `${flat.slice(0, max - 1)}…`;
  }

  return flat;
};

const titleOf = (query: PlanQuery): Pick<PlanQuery, "title"> => {
  const trimmed = query.title?.trim() ?? "";

  if (trimmed === "") {
    return {};
  }

  return { title: trimmed };
};

const readPrepare = (
  target: ShipTarget,
  query: PlanQuery
): Promise<ShipPrepare> =>
  prepareShip(
    { project: target.project, projectDir: target.projectDir },
    query.baseVersionId,
    titleOf(query)
  );

const toPlanRepo = (repo: ShipRepoInfo | null): ShipPlan["repo"] => {
  if (repo === null) {
    return null;
  }

  return {
    checkedOut: repo.branch,
    gh: repo.gh,
    github: repo.github,
    head: repo.head,
    remote: repo.remote,
    root: repo.root,
  };
};

const toPlanFile = (
  file: ShipPrepare["files"][number]
): ShipPlan["files"][number] => {
  const tail = file.diffCut && "\n[diff cut]";

  return {
    additions: file.additions,
    conflict: file.conflict,
    deletions: file.deletions,
    diff: `${cut(file.diff, DIFF_MAX)}${tail || ""}`,
    path: file.path,
    refused: file.refused,
    status: file.status,
  };
};

const toPlan = (plan: ShipPrepare): ShipPlan => ({
  base: plan.base,
  blocked: plan.blocked,
  defaults: plan.defaults,
  files: plan.files.map((file) => toPlanFile(file)),
  format: plan.format ?? null,
  headVersionId: plan.headVersionId,
  note: SHIP_NOTE,
  otherBases: plan.bases
    .slice(0, BASES_MAX)
    .map((base) => ({ title: base.title, versionId: base.versionId })),
  repo: toPlanRepo(plan.repo),
  versions: plan.versions.map((version) => version.title),
});

const inspectPlan = async (
  target: ShipTarget,
  query: PlanQuery
): Promise<ShipPlan> => toPlan(await readPrepare(target, query));

const shippableFiles = (plan: ShipPrepare): string[] =>
  plan.files.flatMap((file) => {
    if (file.refused || file.conflict) {
      return [];
    }

    return [file.path];
  });

const isComplete = (query: PublishQuery): boolean =>
  COMPLETE_KEYS.every((key) => key in query);

const fromQuery = (query: PublishQuery): ShipRequest => ({
  baseVersionId: query.baseVersionId ?? "",
  body: query.body ?? "",
  branch: query.branch ?? "",
  commitMessage: query.commitMessage ?? "",
  files: [...(query.files ?? [])],
  headVersionId: query.headVersionId ?? "",
  mode: query.mode ?? "branch",
  title: query.title ?? "",
});

const fromPlan = (plan: ShipPrepare, query: PublishQuery): ShipRequest => {
  if (plan.blocked || !plan.base || !plan.headVersionId || !plan.repo) {
    throw new BadRequestError(plan.blocked ?? "Nothing to ship.");
  }

  const picked = [...(query.files ?? shippableFiles(plan))];

  if (picked.length === 0) {
    throw new BadRequestError(
      "No file can be shipped. Call prepare_ship to see the refused files and conflicts."
    );
  }

  return {
    baseVersionId: plan.base.versionId,
    body: query.body ?? plan.defaults.body,
    branch: query.branch ?? plan.defaults.branch,
    commitMessage: query.commitMessage ?? plan.defaults.commitMessage,
    files: picked,
    headVersionId: query.headVersionId ?? plan.headVersionId,
    mode: query.mode ?? "branch",
    title: query.title ?? plan.defaults.title,
  };
};

const toRequest = async (
  target: ShipTarget,
  query: PublishQuery
): Promise<ShipRequest> => {
  if (isComplete(query)) {
    return fromQuery(query);
  }

  return fromPlan(await readPrepare(target, query), query);
};

const whereOf = (result: ShipResult): string => {
  if (result.prUrl) {
    return `, PR ${result.prUrl}`;
  }

  if (result.pushed) {
    return `, pushed to ${result.remote ?? "remote"}`;
  }

  return "";
};

const plural = (count: number): string => {
  if (count === 1) {
    return "";
  }

  return "s";
};

const publishPlan = async (
  target: ShipTarget,
  query: PublishQuery
): Promise<ShipResult> => {
  const request = await toRequest(target, query);
  const { activity, projects, runner } = target.runtime;
  const main = projects.mainDirection(target.project);

  const result = await ship(
    {
      dataDir: target.dataDir,
      project: target.project,
      projectDir: target.projectDir,
      running: runner.isRunning(target.project.id, main.id),
    },
    request
  );

  await activity.record("ship", "You", {
    directionId: main.id,
    projectId: target.project.id,
    summary: `Shipped ${result.files.length} file${plural(result.files.length)} as ${result.branch} (${result.sha.slice(0, SHA_SHORT)})${whereOf(result)}`,
  });

  return result;
};

const doingOf = (repo: ShipRepoInfo, mode: ShipMode, title: string): string => {
  const remote = repo.remote ?? "the remote";

  if (mode === "pr") {
    return `push it to ${remote} and open a pull request “${oneLine(title, LINE_MAX)}”`;
  }

  if (mode === "push") {
    return `push it to ${remote}`;
  }

  return "keep it local (no push)";
};

const publishCard = async (
  target: ShipTarget,
  query: PublishQuery
): Promise<ApprovalCard> => {
  const plan = await readPrepare(target, query);
  const request = fromPlan(plan, query);
  const repo = plan.repo as ShipRepoInfo;
  const from = repo.branch ?? repo.head.slice(0, SHA_SHORT);
  const hooks = plan.format?.note ?? "Git hooks do not run.";
  const files = request.files.length;

  return {
    action: "Commit studio changes to a new branch in your repo",
    detail: `Commit on a new branch from ${from} and ${doingOf(repo, request.mode, request.title)}. Your checked-out branch and files do not change. ${hooks} Files: ${oneLine(request.files.join(", "), FILES_LINE_MAX)}`,
    title: `Ship ${files} file${plural(files)} as branch ${oneLine(request.branch, LINE_MAX)}`,
  };
};

export { inspectPlan, publishCard, publishPlan, readPrepare };

export type { PlanQuery, PublishQuery };
