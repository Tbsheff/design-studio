import { routes as connectionRoutes } from "@design-studio/actions/connection/routes";
import { routes as studioRoutes } from "@design-studio/actions/studio/routes";

import { call } from "../../platform/http.js";
import type { RouteOutput } from "../../platform/http.js";

type ConnectSetup = RouteOutput<typeof connectionRoutes.getSetupConnection>;

const CLIENT_LIMIT = 1;

const readClients = async (): Promise<readonly string[]> => {
  const activity = await call(studioRoutes.getActivityStudio, {
    limit: CLIENT_LIMIT,
  });

  return activity.mcp.clients;
};

const connectAiApi = {
  readClients,
  readSetup: (): Promise<ConnectSetup> =>
    call(connectionRoutes.getSetupConnection, {}),
};

export { connectAiApi };

export type { ConnectSetup };
