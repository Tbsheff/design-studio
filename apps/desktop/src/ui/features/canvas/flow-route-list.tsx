import type { AppRoute } from "@design-studio/contracts";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { FlowRouteItem } from "./flow-route-item.js";

const FlowRouteList = ({
  chosen,
  onToggle,
  shown,
}: {
  chosen: string[];
  onToggle: (route: string) => void;
  shown: AppRoute[];
}): ReactElement => (
  <ul className="flow-routes" aria-label={copy.routesInThe}>
    {shown.map((route) => (
      <FlowRouteItem
        key={`${route.route}|${route.file}`}
        at={chosen.indexOf(route.route)}
        onToggle={onToggle}
        route={route}
      />
    ))}
  </ul>
);

export { FlowRouteList };
