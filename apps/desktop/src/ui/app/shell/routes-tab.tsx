import type { AppRoute } from "@design-studio/contracts";
import { cleanRoute } from "@design-studio/contracts/app";
import { useCallback, useState } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy";
import { RouteRow } from "./route-row";
import { RoutesCustomForm } from "./routes-custom-form";
import { RoutesFilter } from "./routes-filter";
import {
  ROUTES_SHOWN_MAX,
  filterRoutes,
  isRouteUnsafe,
  toFilterPlaceholder,
} from "./routes-model";
import { useRoutes } from "./use-routes";

interface RoutesTabProps {
  readonly onAddRoute: (route: string) => void;
  readonly projectId: string;
}

const RoutesTab = ({ onAddRoute, projectId }: RoutesTabProps): ReactElement => {
  const { error, routes } = useRoutes(projectId);
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");
  const matches = filterRoutes(routes, filter);
  const shown = matches.slice(0, ROUTES_SHOWN_MAX);

  const pickRoute = useCallback(
    (route: AppRoute): void => {
      if (route.dynamic) {
        setCustom(route.route);
      } else {
        onAddRoute(route.route);
      }
    },
    [onAddRoute]
  );

  const addFirst = useCallback((): void => {
    const [first] = filterRoutes(routes, filter);

    if (first) {
      pickRoute(first);
    }
  }, [filter, pickRoute, routes]);

  const addCustom = useCallback((): void => {
    const route = cleanRoute(custom);

    if (route && !isRouteUnsafe(route)) {
      setCustom("");
      onAddRoute(route);
    }
  }, [custom, onAddRoute]);

  return (
    <div className="app-routes">
      <RoutesFilter
        filter={filter}
        onChange={setFilter}
        onEnter={addFirst}
        placeholder={toFilterPlaceholder(routes)}
      />
      {error && <div className="alert error small">{error}</div>}
      <ul className="app-routes-list" aria-label="App routes">
        {shown.map((route) => (
          <RouteRow
            key={`${route.route}|${route.file}`}
            onPick={pickRoute}
            route={route}
          />
        ))}
      </ul>
      {matches.length > shown.length && (
        <div className="app-routes-more">
          {copy.showing}
          {shown.length}
          {copy.countSeparator}
          {matches.length}
          {copy.typeInTheFilterTo}
        </div>
      )}
      <RoutesCustomForm
        custom={custom}
        onChange={setCustom}
        onSubmit={addCustom}
      />
    </div>
  );
};

export { RoutesTab };
