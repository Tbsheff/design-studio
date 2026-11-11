import type {
  ActivityApproval,
  ActivityBranch,
  ActivityDevServer,
  ActivityPresence,
  ActivityRun,
  StudioActivity,
} from "@design-studio/actions/studio/schema";
import type {
  AppServerStatus,
  McpActivity,
  McpApprovalRecord,
  Project,
  RunSummary,
} from "@design-studio/contracts";
import type { McpStatus } from "@design-studio/contracts/export";

const PROJECT_MAX = 24;
const TITLE_MAX = 80;
const CLIENT_WINDOW_MS = 86_400_000;
const PRESENCE_WINDOW_MS = 15_000;

interface ProjectRuns {
  readonly project: Project;
  readonly runs: readonly RunSummary[];
}

interface ProjectEdits {
  readonly edits: readonly McpActivity[];
  readonly project: Project;
}

interface ProjectServer {
  readonly project: Project;
  readonly status: AppServerStatus | null;
}

const toFolder = (project: Project): string | null =>
  project.imported?.sourcePath ?? null;

const toActiveProjects = (projects: readonly Project[]): Project[] =>
  projects
    .toSorted((left, right) => right.updatedAt - left.updatedAt)
    .slice(0, PROJECT_MAX);

const toAppProjects = (projects: readonly Project[]): Project[] =>
  projects.filter((project) => Boolean(project.app));

const toAppFolders = (projects: readonly Project[]): string[] => [
  ...new Set(
    toAppProjects(projects).flatMap((project) => {
      const folder = toFolder(project);

      if (folder === null) {
        return [];
      }

      return [folder];
    })
  ),
];

const toTitle = (run: RunSummary): string => {
  const text = (run.title ?? run.request.prompt)
    .replaceAll(/\s+/gu, " ")
    .trim();

  if (text === "") {
    return "Agent run";
  }

  return text.slice(0, TITLE_MAX);
};

const fromRun = (project: Project, run: RunSummary): ActivityRun => ({
  client: null,
  costUsd: run.costUsd,
  finishedAt: run.finishedAt,
  id: run.id,
  projectId: project.id,
  projectName: project.name,
  source: "chat",
  startedAt: run.startedAt,
  status: run.status,
  title: toTitle(run),
});

const fromEdit = (project: Project, edit: McpActivity): ActivityRun => ({
  client: edit.client,
  costUsd: null,
  finishedAt: edit.at,
  id: edit.id,
  projectId: project.id,
  projectName: project.name,
  source: "mcp",
  startedAt: edit.at,
  status: "completed",
  title: edit.tool,
});

const toAllRuns = (
  runs: readonly ProjectRuns[],
  edits: readonly ProjectEdits[]
): ActivityRun[] => [
  ...runs.flatMap((entry) =>
    entry.runs.map((run) => fromRun(entry.project, run))
  ),
  ...edits.flatMap((entry) =>
    entry.edits.map((edit) => fromEdit(entry.project, edit))
  ),
];

const toRunning = (all: readonly ActivityRun[], limit: number): ActivityRun[] =>
  all
    .filter((run) => run.status === "running")
    .toSorted((left, right) => right.startedAt - left.startedAt)
    .slice(0, limit);

const toRecent = (all: readonly ActivityRun[], limit: number): ActivityRun[] =>
  all
    .filter((run) => run.status !== "running")
    .toSorted(
      (left, right) =>
        (right.finishedAt ?? right.startedAt) -
        (left.finishedAt ?? left.startedAt)
    )
    .slice(0, limit);

const toProjectName = (
  projects: readonly Project[],
  projectId: string | null
): string | null =>
  projects.find((project) => project.id === projectId)?.name ?? null;

const fromApproval = (
  projects: readonly Project[],
  approval: McpApprovalRecord
): ActivityApproval => ({
  client: approval.client,
  createdAt: approval.createdAt,
  id: approval.id,
  projectId: approval.projectId,
  projectName: toProjectName(projects, approval.projectId),
  title: approval.title,
  tool: approval.tool,
});

const fromServer = (entry: ProjectServer): ActivityDevServer => ({
  folder: toFolder(entry.project) ?? "",
  projectId: entry.project.id,
  projectName: entry.project.name,
  state: entry.status?.state ?? "stopped",
  url: entry.status?.upstream ?? entry.project.app?.url ?? null,
});

const toClients = (
  edits: readonly ProjectEdits[],
  approvals: readonly McpApprovalRecord[],
  now: number
): string[] => [
  ...new Set([
    ...edits.flatMap((entry) =>
      entry.edits.flatMap((edit) => {
        if (now - edit.at < CLIENT_WINDOW_MS) {
          return [edit.client];
        }

        return [];
      })
    ),
    ...approvals.map((approval) => approval.client),
  ]),
];

const toPresence = (
  edits: readonly ProjectEdits[],
  now: number
): ActivityPresence[] =>
  edits
    .flatMap((entry) =>
      entry.edits.flatMap((edit) => {
        if (now - edit.at >= PRESENCE_WINDOW_MS) {
          return [];
        }

        return [
          {
            at: edit.at,
            client: edit.client,
            frameId: edit.frameId,
            projectId: edit.projectId,
            summary: edit.summary,
            tool: edit.tool,
          },
        ];
      })
    )
    .toSorted((left, right) => right.at - left.at);

interface ActivityParts {
  readonly approvals: readonly McpApprovalRecord[];
  readonly branches: readonly ActivityBranch[];
  readonly edits: readonly ProjectEdits[];
  readonly limit: number;
  readonly now: number;
  readonly projects: readonly Project[];
  readonly runs: readonly ProjectRuns[];
  readonly servers: readonly ProjectServer[];
  readonly status: McpStatus;
}

const toActivity = (parts: ActivityParts): StudioActivity => {
  const all = toAllRuns(parts.runs, parts.edits);

  return {
    approvals: parts.approvals
      .slice(0, parts.limit)
      .map((entry) => fromApproval(parts.projects, entry)),
    branches: parts.branches,
    devServers: parts.servers.map((entry) => fromServer(entry)),
    mcp: {
      clients: toClients(parts.edits, parts.approvals, parts.now),
      isEnabled: parts.status.enabled,
      isRunning: parts.status.running,
      url: parts.status.url,
    },
    presence: toPresence(parts.edits, parts.now),
    recent: toRecent(all, parts.limit),
    running: toRunning(all, parts.limit),
  };
};

export { toActiveProjects, toActivity, toAppFolders, toAppProjects };

export type { ProjectEdits, ProjectRuns, ProjectServer };
