import type { ChildProcess } from "node:child_process";
import path from "node:path";

import type { Project } from "../src/shared/actions/_core/contracts.js";
import {
  isDesktopLinkMessage,
  isProjectId,
  type DesktopLinkMessage,
  type DesktopRunInfo,
} from "../src/shared/desktop-link.js";

export interface McpApprovalNotice {
  projectId: string;
  approvalId: string;
  title: string;
}

export interface FinishedRun {
  run: DesktopRunInfo;
  status: string;
  costUsd: number;
  error: string | null;
}

export class ServerLink {
  private token: string | null = null;
  private dataDir: string | null = null;
  private origin: string | null = null;
  private cloudJwt: string | null = null;
  private pushedJwt: string | null = null;
  private readonly active = new Map<string, DesktopRunInfo>();

  constructor(
    private readonly onFinished: (finished: FinishedRun) => void,
    private readonly onApproval: (notice: McpApprovalNotice) => void = () =>
      undefined
  ) {}

  attach(child: ChildProcess, origin: string): void {
    this.token = null;
    this.dataDir = null;
    this.origin = origin;
    this.pushedJwt = null;
    this.active.clear();
    child.on("message", (raw: unknown) => {
      if (isDesktopLinkMessage(raw)) {
        this.handle(raw);
      }
    });
    child.once("exit", () => this.active.clear());
  }

  private handle(message: DesktopLinkMessage): void {
    if (message.kind === "hello") {
      this.token = message.token;
      this.dataDir = message.dataDir;
      void this.syncCloudSession();
    } else if (message.kind === "run-started") {
      this.active.set(message.run.runId, message.run);
    } else if (message.kind === "mcp-approval") {
      if (isProjectId(message.projectId) && typeof message.title === "string") {
        this.onApproval({
          projectId: message.projectId,
          approvalId: message.approvalId,
          title: message.title.slice(0, 200),
        });
      }
    } else {
      this.active.delete(message.run.runId);
      this.onFinished({
        run: message.run,
        status: message.status,
        costUsd: message.costUsd,
        error: message.error,
      });
    }
  }

  pushCloudSession(jwt: string | null): Promise<void> {
    this.cloudJwt = jwt;
    return this.syncCloudSession();
  }

  private async syncCloudSession(): Promise<void> {
    const { cloudJwt: jwt, token, origin } = this;
    if (!token || !origin || jwt === this.pushedJwt) {
      return;
    }

    const headers = {
      "content-type": "application/json",
      "x-studio-token": token,
    };
    const request = { method: "DELETE", headers } as RequestInit;
    if (jwt) {
      request.method = "PUT";
      request.body = JSON.stringify({ jwt, expiresAt: jwtExpiryMs(jwt) });
    }

    const res = await fetch(`${origin}/api/cloud/session`, request).catch(
      () => null
    );
    if (res?.ok && this.cloudJwt === jwt) {
      this.pushedJwt = jwt;
    }
  }

  activeRuns(): DesktopRunInfo[] {
    return [...this.active.values()];
  }

  async project(projectId: string): Promise<Project | null> {
    if (!this.token || !this.origin || !isProjectId(projectId)) {
      return null;
    }

    const res = await fetch(`${this.origin}/api/projects/${projectId}`, {
      headers: { "x-studio-token": this.token },
    }).catch(() => null);

    if (!res?.ok) {
      return null;
    }

    return (await res.json()) as Project;
  }

  async workTree(
    projectId: string,
    directionId: string | null
  ): Promise<string | null> {
    const project = await this.project(projectId);

    if (!project || !this.dataDir) {
      return null;
    }

    const direction =
      project.directions.find((item) => item.id === directionId) ??
      project.directions[0];

    if (!direction) {
      return null;
    }

    return allowedRevealPath(
      direction.workTree,
      this.dataDir,
      project.imported?.sourcePath ?? null
    );
  }
}

const DEFAULT_JWT_LIFETIME_MS = 15 * 60 * 1000;

function jwtExpiryMs(jwt: string): number {
  const fallback = Date.now() + DEFAULT_JWT_LIFETIME_MS;
  try {
    const [, part = ""] = jwt.split(".");
    const claims = JSON.parse(
      Buffer.from(part, "base64url").toString("utf-8")
    ) as { exp?: unknown };
    const { exp } = claims;
    if (typeof exp === "number" && Number.isFinite(exp)) {
      return exp * 1000;
    }
  } catch {
    return fallback;
  }

  return fallback;
}

function inside(child: string, parent: string): boolean {
  const relative = path.relative(parent, child);

  return (
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative))
  );
}

export function allowedRevealPath(
  target: string,
  dataDir: string,
  importedFrom: string | null
): string | null {
  const resolved = path.resolve(target);

  if (inside(resolved, path.resolve(dataDir))) {
    return resolved;
  }

  if (importedFrom && inside(resolved, path.resolve(importedFrom))) {
    return resolved;
  }

  return null;
}
