import { routes } from "../shared/actions/mcp-life/routes.js";
import type { McpActivityList, McpStatus } from "../shared/export";
import { call } from "./platform/http";

export const mcpApi = {
  activity: async (pid: string): Promise<McpActivityList> =>
    (await call(routes.listActivityMcpLife, {
      projectId: pid,
    })) as McpActivityList,
  answer: async (id: string, allow: boolean): Promise<{ ok: true }> =>
    (await call(routes.answerApprovalMcpLife, { allow, id })) as { ok: true },
  disconnect: async (): Promise<McpStatus> =>
    (await call(routes.setStatusMcpLife, { edits: false })) as McpStatus,
};
