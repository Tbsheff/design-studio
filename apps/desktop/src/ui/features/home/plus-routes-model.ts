import type { WireOutput } from "@design-studio/actions/_core/action";
import type { listRoutesDevServer } from "@design-studio/actions/dev-server/list-routes";

type AppRouteRow = WireOutput<typeof listRoutesDevServer>["routes"][number];

const ROUTE_LIMIT = 8;

const toStaticRoutes = (rows: readonly AppRouteRow[] | null): string[] => {
  const routes: string[] = [];

  for (const row of rows ?? []) {
    if (!row.dynamic && routes.length < ROUTE_LIMIT) {
      routes.push(row.route);
    }
  }

  return routes;
};

export { toStaticRoutes };

export type { AppRouteRow };
