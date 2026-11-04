import type {
  AppServerStatus,
  PackSummary,
  Project,
} from "../../../shared/actions/_core/contracts.js";
import type { attachReadiness } from "../../app/first-version.js";
import type { workspaceFields } from "../workspace-tools.js";

type Direction = Project["directions"][number];

interface ServerView {
  message: AppServerStatus["message"];
  state: AppServerStatus["state"];
  upstream: AppServerStatus["upstream"];
}

interface AttachView {
  main: Direction | undefined;
  next: string;
  project: Project;
  readiness: ReturnType<typeof attachReadiness>;
  server: ServerView | null;
  workspace: ReturnType<typeof workspaceFields>;
}

interface CreatedResult {
  designSystem: string | null;
  directionId: string | null;
  folder: string | null;
  name: string;
  projectId: string;
}

interface AttachedCore {
  app: Project["app"];
  directionId: string | null;
  folder: string | null;
  name: string;
  next: string;
  projectId: string;
  server: ServerView | null;
}

type AttachedResult = AttachedCore &
  AttachView["readiness"] &
  AttachView["workspace"];

const serverViewOf = (status: AppServerStatus): ServerView => ({
  state: status.state,
  upstream: status.upstream,
  message: status.message,
});

const createdResult = (
  project: Project,
  main: Direction | null,
  pack: PackSummary | null
): CreatedResult => ({
  projectId: project.id,
  directionId: main?.id ?? null,
  name: project.name,
  folder: main?.workTree ?? null,
  designSystem: pack?.id ?? null,
});

const attachedResult = (view: AttachView): AttachedResult => ({
  projectId: view.project.id,
  directionId: view.main?.id ?? null,
  name: view.project.name,
  folder: view.main?.workTree ?? null,
  app: view.project.app,
  ...view.workspace,
  server: view.server,
  ...view.readiness,
  next: view.next,
});

export { attachedResult, createdResult, serverViewOf };

export type { ServerView };
