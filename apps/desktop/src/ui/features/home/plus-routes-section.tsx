import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { PlusRouteItem } from "./plus-route-item.js";
import { usePlusRoutes } from "./use-plus-routes.js";

interface PlusRoutesSectionProps {
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusRoutesSection = ({
  onClose,
}: PlusRoutesSectionProps): ReactElement | null => {
  const { appProjectId, routes } = usePlusRoutes();

  if (appProjectId === null || routes.length === 0) {
    return null;
  }

  return (
    <div className="ui-menu-section" data-testid="plus-routes">
      <span className="ui-menu-label">{copy.startFromRoute}</span>
      {routes.map((route) => (
        <PlusRouteItem
          key={route}
          appProjectId={appProjectId}
          route={route}
          onClose={onClose}
        />
      ))}
    </div>
  );
};

export { PlusRoutesSection };

export type { PlusRoutesSectionProps };
