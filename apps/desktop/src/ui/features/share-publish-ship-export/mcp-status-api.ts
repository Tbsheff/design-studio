import { routes } from "@design-studio/actions/connection/routes";

import { call } from "../../platform/http.js";
import type { RouteInput, RouteOutput } from "../../platform/http.js";

type McpStatusOutput = RouteOutput<typeof routes.setStatusConnection>;

type McpStatusInput = RouteInput<typeof routes.setStatusConnection>;

const mcpStatusApi = {
  read: (): Promise<McpStatusOutput> => call(routes.getStatusConnection, {}),
  write: (input: McpStatusInput): Promise<McpStatusOutput> =>
    call(routes.setStatusConnection, input),
};

export { mcpStatusApi };

export type { McpStatusInput, McpStatusOutput };
