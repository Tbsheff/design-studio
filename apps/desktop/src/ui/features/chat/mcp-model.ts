import { routes } from "@design-studio/actions/connection/routes";
import { call } from "../../platform/http.js";
import type { RouteOutput } from "../../platform/http.js";

type ActivityOutput = RouteOutput<typeof routes.listActivityConnection>;

type ApprovalOutput = RouteOutput<typeof routes.setApprovalConnection>;

type StatusOutput = RouteOutput<typeof routes.setStatusConnection>;

export const mcpApi = {
  activity: (pid: string): Promise<ActivityOutput> =>
    call(routes.listActivityConnection, { projectId: pid }),
  answer: (approvalId: string, allow: boolean): Promise<ApprovalOutput> =>
    call(routes.setApprovalConnection, { allow, approvalId }),
  disconnect: (): Promise<StatusOutput> =>
    call(routes.setStatusConnection, { edits: false }),
  set: (input: {
    edits?: boolean;
    enabled?: boolean;
    rotate?: boolean;
  }): Promise<StatusOutput> => call(routes.setStatusConnection, input),
  status: (): Promise<StatusOutput> => call(routes.getStatusConnection, {}),
};
