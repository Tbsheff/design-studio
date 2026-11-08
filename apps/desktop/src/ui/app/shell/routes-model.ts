import type { AppRoute } from "@design-studio/contracts";

import { pick } from "../../platform/pick.js";

const ROUTES_SHOWN_MAX = 200;
const UNSAFE_ROUTE = /[[\]]/u;

const filterRoutes = (
  routes: AppRoute[] | null,
  filter: string
): AppRoute[] => {
  const needle = filter.trim().toLowerCase();

  return (routes ?? []).filter(
    (route) =>
      needle === "" ||
      route.route.toLowerCase().includes(needle) ||
      route.file.toLowerCase().includes(needle)
  );
};

const isRouteUnsafe = (route: string): boolean => UNSAFE_ROUTE.test(route);

const isCustomBlocked = (custom: string): boolean =>
  !custom.trim() || isRouteUnsafe(custom);

const toFilterPlaceholder = (routes: AppRoute[] | null): string =>
  pick(
    routes !== null,
    `Filter ${routes?.length ?? 0} routes · Enter adds the first`,
    "Loading routes…"
  );

const toRouteTip = (route: AppRoute): string =>
  pick(
    route.dynamic,
    "Fill in the dynamic segments, then add the frame",
    `Add a frame for ${route.route}`
  );

export {
  ROUTES_SHOWN_MAX,
  filterRoutes,
  isCustomBlocked,
  isRouteUnsafe,
  toFilterPlaceholder,
  toRouteTip,
};
