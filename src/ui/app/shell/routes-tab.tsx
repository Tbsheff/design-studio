import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";

import { cleanRoute } from "../../../shared/app";
import type { AppRoute } from "../../../shared/contracts";
import { api, errorText } from "../../api";
import { Icon } from "../../kit/Icon";

function RoutesTab({
  projectId,
  onAddRoute,
}: {
  projectId: string;
  onAddRoute: (route: string) => void;
}) {
  const [routes, setRoutes] = useState<AppRoute[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [custom, setCustom] = useState("");
  useEffect(() => {
    let isLive = true;
    void (async () => {
      try {
        const result = await api.appRoutes(projectId);
        if (isLive) {
          setRoutes(result.routes);
        }
      } catch (caught: unknown) {
        if (isLive) {
          setError(errorText(caught));
        }
      }
    })();
    return () => {
      isLive = false;
    };
  }, [projectId]);

  const matches = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    return (routes ?? []).filter(
      (route) =>
        needle === "" ||
        route.route.toLowerCase().includes(needle) ||
        route.file.toLowerCase().includes(needle)
    );
  }, [routes, filter]);

  const shown = matches.slice(0, 200);

  const addCustom = (event: FormEvent) => {
    event.preventDefault();
    const route = cleanRoute(custom);

    if (!route || /[[\]]/.test(route)) {
      return;
    }

    onAddRoute(route);
    setCustom("");
  };

  return (
    <div className="app-routes">
      <input
        className="app-routes-filter"
        autoFocus
        value={filter}
        placeholder={
          routes
            ? `Filter ${routes.length} routes · Enter adds the first`
            : "Loading routes…"
        }
        aria-label="Filter routes"
        onChange={(e) => setFilter(e.target.value)}
        onKeyDown={(e) => {
          const first = shown[0];

          if (e.key !== "Enter" || !first || e.nativeEvent.isComposing) {
            return;
          }

          e.preventDefault();

          if (first.dynamic) {
            setCustom(first.route);
          } else {
            onAddRoute(first.route);
          }
        }}
      />
      {error && <div className="alert error small">{error}</div>}
      <div role="list" aria-label="App routes">
        {shown.map((route) => (
          <button
            key={`${route.route}|${route.file}`}
            type="button"
            role="listitem"
            className="app-route"
            data-tip={
              route.dynamic
                ? "Fill in the dynamic segments, then add the frame"
                : `Add a frame for ${route.route}`
            }
            data-tip-align="start"
            onClick={() =>
              route.dynamic ? setCustom(route.route) : onAddRoute(route.route)
            }
          >
            <span>
              <span className="mono">{route.route}</span>
              <span className="file"> {route.file}</span>
            </span>
            {route.dynamic ? (
              <span className="tag">dynamic</span>
            ) : (
              <Icon name="plus" size={12} />
            )}
          </button>
        ))}
        {matches.length > shown.length && (
          <div className="app-routes-more">
            Showing {shown.length} of {matches.length}. Type in the filter to
            find the rest.
          </div>
        )}
      </div>
      <form className="app-route-custom" onSubmit={addCustom}>
        <input
          className="mono"
          value={custom}
          placeholder="/patients/123"
          aria-label="Route to add"
          onChange={(e) => setCustom(e.target.value)}
        />
        <button
          type="submit"
          className="btn small"
          disabled={!custom.trim() || /[[\]]/.test(custom)}
        >
          Add frame
        </button>
      </form>
    </div>
  );
}

export { RoutesTab };
