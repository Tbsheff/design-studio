import type {
  AppServerStatus,
  PackSummary,
  Project,
} from "@design-studio/contracts";

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
  message: status.message,
  state: status.state,
  upstream: status.upstream,
});

const createdResult = (
  project: Project,
  main: Direction | null,
  pack: PackSummary | null
): CreatedResult => ({
  designSystem: pack?.id ?? null,
  directionId: main?.id ?? null,
  folder: main?.workTree ?? null,
  name: project.name,
  projectId: project.id,
});

const attachedResult = (view: AttachView): AttachedResult => ({
  app: view.project.app,
  directionId: view.main?.id ?? null,
  folder: view.main?.workTree ?? null,
  name: view.project.name,
  projectId: view.project.id,
  ...view.workspace,
  server: view.server,
  ...view.readiness,
  next: view.next,
});

export { attachedResult, createdResult, serverViewOf };

export type { ServerView };
