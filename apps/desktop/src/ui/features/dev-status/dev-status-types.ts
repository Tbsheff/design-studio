import type { RouteOutput, devStatusRoutes } from "./deps.js";

type DevStatusEntry = RouteOutput<
  typeof devStatusRoutes.listDevStatus
>["items"][number];

export type { DevStatusEntry };
