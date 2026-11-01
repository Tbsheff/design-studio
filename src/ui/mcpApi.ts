import type { McpActivityList, McpStatus } from "../shared/export";
import { json } from "./api";

export const mcpApi = {
  activity: (pid: string) =>
    json<McpActivityList>(
      "GET",
      `/api/projects/${encodeURIComponent(pid)}/mcp/activity`
    ),
  answer: (id: string, allow: boolean) =>
    json<{ ok: true }>("POST", `/api/mcp/approvals/${encodeURIComponent(id)}`, {
      allow,
    }),
  disconnect: () => json<McpStatus>("POST", "/api/mcp", { edits: false }),
};
