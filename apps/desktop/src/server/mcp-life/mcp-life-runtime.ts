import type { McpActivity, McpApprovalRecord } from "@design-studio/contracts";
import type { McpStatus } from "@design-studio/contracts/export";
import type { Effect } from "effect";

import { makeRuntimeSlot } from "../platform/runtime-slot/index.js";

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

const slot = makeRuntimeSlot<McpLifeRuntime>("MCP");

const bindMcpLifeRuntime = (runtime: McpLifeRuntime): void => {
  slot.bind(runtime);
};

const lifeRuntime = (): Effect.Effect<McpLifeRuntime> => slot.read;

export { bindMcpLifeRuntime, lifeRuntime };

export type {
  McpLifeActivity,
  McpLifeApprovals,
  McpLifeRuntime,
  McpLifeService,
};
