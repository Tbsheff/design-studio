import { Effect } from "effect";

import { BadRequest } from "../../shared/actions/_core/errors/bad-request.js";
import type { McpActivity, McpApprovalRecord } from "../../shared/contracts.js";
import type { McpStatus } from "../../shared/export.js";
import { loadConfig } from "../platform/config/index.js";

interface McpLifeService {
  readonly editsOn: () => Promise<boolean>;
  readonly rotate: () => Promise<McpStatus>;
  readonly setEdits: (edits: boolean) => Promise<McpStatus>;
  readonly setEnabled: (enabled: boolean) => Promise<McpStatus>;
  readonly status: () => Promise<McpStatus>;
}

interface McpLifeApprovals {
  readonly answer: (id: string, allow: boolean) => boolean;
  readonly list: () => McpApprovalRecord[];
  readonly poll: (
    seen: string,
    waitMs: number,
    signal?: AbortSignal
  ) => Promise<McpApprovalRecord[]>;
}

interface McpLifeActivity {
  readonly list: (projectId: string) => Promise<McpActivity[]>;
}

interface McpLifeRuntime {
  readonly activity: McpLifeActivity;
  readonly approvals: McpLifeApprovals;
  readonly mcp: McpLifeService;
  readonly onSettingsChanged: () => void;
}

const NOT_READY =
  "The MCP server is not ready in this Design Studio process. Restart Design Studio.";

const runtimes = new Map<string, McpLifeRuntime>();

const bindMcpLifeRuntime = (runtime: McpLifeRuntime): void => {
  runtimes.set(loadConfig().dataDir, runtime);
};

const lifeRuntime = (): Effect.Effect<McpLifeRuntime, BadRequest> =>
  Effect.gen(function* find() {
    const runtime = runtimes.get(loadConfig().dataDir) ?? null;

    if (runtime === null) {
      return yield* new BadRequest({ message: NOT_READY });
    }

    return runtime;
  });

export { bindMcpLifeRuntime, lifeRuntime };

export type {
  McpLifeActivity,
  McpLifeApprovals,
  McpLifeRuntime,
  McpLifeService,
};
