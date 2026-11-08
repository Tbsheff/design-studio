import type { AppRoute } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { dynamicNames } from "../../../shared/route-flow.js";
import type { FlowResult } from "../../../shared/route-flow.js";
import { api, errorText } from "../../api.js";

import "../../styles/route-flow.css";
import { copy } from "./copy.js";
import { toValueOr } from "./settle-model.js";

const DEPTHS = [0, 1, 2] as const;

export function flowSummary(result: FlowResult): string {
  const added = result.frames.filter((frame) => frame.added).length;

  const parts = [
    `${result.frames.length} frames (${added} new)`,
    `${result.links.length} ${result.links.length === 1 ? "link" : "links"}`,
  ];

  if (result.skipped.length > 0) {
    parts.push(`${result.skipped.length} not linked`);
  }

  return parts.join(", ");
}

const useRoutesAndParams = (projectId: string) => {
  const [routes, setRoutes] = useState<AppRoute[] | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadRoutes = useCallback(async (): Promise<void> => {
    try {
      const result = await api.appRoutes(projectId);
      setRoutes(result.routes);
    } catch (failure: unknown) {
      setError(errorText(failure));
    }
  }, [projectId]);

  const loadParams = useCallback(async (): Promise<void> => {
    const result = await toValueOr(api.flowParams(projectId), null);

    if (result) {
      setParams(result.params);
    }
  }, [projectId]);

  useEffect(() => {
    void loadRoutes();
    void loadParams();
  }, [loadRoutes, loadParams]);

  return { error, params, routes, setError, setParams };
};

const FlowResultView = ({ result }: { result: FlowResult }): ReactElement => (
  <div className="flow-result" role="status">
    <div>
      {flowSummary(result)}
      {copy.text}
    </div>
    {result.missingParams.length > 0 && (
      <div className="flow-warn">
        {copy.set}
        {result.missingParams.join(", ")}
        {copy.soTheFramesShow}
      </div>
    )}
    {result.skipped.slice(0, 4).map((item) => (
      <div
        key={`${item.fromRoute}|${item.href}|${item.source}`}
        className="flow-skip"
        data-tip={`${item.reason} ${item.source}`}
        data-tip-align="start"
      >
        {item.kind} {item.href}
      </div>
    ))}
  </div>
);

export default function FlowTab({
  projectId,
}: {
  projectId: string;
}): ReactElement {
  const { routes, params, setParams, error, setError } =
    useRoutesAndParams(projectId);

  const [filter, setFilter] = useState("");
  const [chosen, setChosen] = useState<string[]>([]);
  const [depth, setDepth] = useState<number>(1);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FlowResult | null>(null);

  const shown = useMemo(() => {
    const needle = filter.trim().toLowerCase();

    const found = (routes ?? []).filter(
      (route) =>
        needle === "" ||
        route.route.toLowerCase().includes(needle) ||
        route.file.toLowerCase().includes(needle)
    );

    const picked = (route: AppRoute): number =>
      chosen.includes(route.route)
        ? chosen.indexOf(route.route)
        : chosen.length;

    return [...found].sort((a, b) => picked(a) - picked(b)).slice(0, 200);
  }, [routes, filter, chosen]);

  const names = [...new Set(chosen.flatMap(dynamicNames))];

  const toggle = (route: string): void =>
    setChosen((list) =>
      list.includes(route)
        ? list.filter((item) => item !== route)
        : [...list, route]
    );

  const build = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const single = chosen.length === 1 && depth > 0;

    const input = {
      ...(single ? { from: chosen[0] as string } : { routes: chosen }),
      depth,
      params,
    };

    try {
      setResult(await api.buildFlow(projectId, input));
    } catch (failure: unknown) {
      setError(errorText(failure));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="app-routes flow-tab">
      <input
        className="app-routes-filter"
        value={filter}
        placeholder={
          routes ? `Filter ${routes.length} routes` : "Loading routes…"
        }
        aria-label={copy.filterRoutes}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="flow-routes" role="list" aria-label={copy.routesInThe}>
        {shown.map((route) => {
          const at = chosen.indexOf(route.route);

          return (
            <button
              key={`${route.route}|${route.file}`}
              type="button"
              role="listitem"
              className="app-route"
              aria-pressed={at > -1}
              data-tip={at === -1 ? "Add to the flow" : "Remove from the flow"}
              data-tip-align="start"
              onClick={() => toggle(route.route)}
            >
              <span className="mono">{route.route}</span>
              {at === -1 ? (
                <Icon name="plus" size={12} />
              ) : (
                <span className="flow-order">{at + 1}</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="flow-controls">
        <div className="flow-row">
          <span className="flow-label">{copy.followLinks}</span>
          <div
            className="segmented"
            role="radiogroup"
            aria-label={copy.linkStepsTo}
          >
            {DEPTHS.map((value) => (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={depth === value}
                className={depth === value ? "on" : ""}
                data-tip={
                  value === 0
                    ? "Only the chosen routes"
                    : `Add routes up to ${value} ${value === 1 ? "click" : "clicks"} away`
                }
                onClick={() => setDepth(value)}
              >
                {value === 0 ? "None" : value}
              </button>
            ))}
          </div>
        </div>
        {names.map((name) => (
          <label key={name} className="flow-row flow-param">
            <span className="flow-label mono">{name}</span>
            <input
              className="mono"
              value={params[name] ?? ""}
              placeholder={copy.sampleValue}
              spellCheck={false}
              onChange={(e) =>
                setParams((prev) => ({ ...prev, [name]: e.target.value }))
              }
            />
          </label>
        ))}
        {error && <div className="alert error small">{error}</div>}
        {result && <FlowResultView result={result} />}
        <button
          type="button"
          className="btn small primary"
          disabled={busy || chosen.length === 0}
          onClick={build}
          data-tip={copy.layOutThe}
        >
          {busy
            ? "Reading the source…"
            : chosen.length === 0
              ? "Pick routes for the flow"
              : `Build flow from ${chosen.length} ${chosen.length === 1 ? "route" : "routes"}`}
        </button>
      </div>
    </div>
  );
}
