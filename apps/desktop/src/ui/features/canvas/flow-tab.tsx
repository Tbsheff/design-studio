import type { AppRoute } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import type { Dispatch, ReactElement, ReactNode, SetStateAction } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

import { dynamicNames } from "../../../shared/route-flow.js";
import type { FlowResult } from "../../../shared/route-flow.js";
import { api, errorText } from "../../api.js";

import "../../styles/route-flow.css";
import { copy } from "./copy.js";
import { toValueOr } from "./settle-model.js";

const SLICE_4 = 4;

const SLICE_200 = 200;

const DEPTHS = [0, 1, 2] as const;

export const flowSummary = (result: FlowResult): string => {
  const added = result.frames.filter((frame) => frame.added).length;

  let part: "link" | "links" = "links";

  if (result.links.length === 1) {
    part = "link";
  }

  const parts = [
    `${result.frames.length} frames (${added} new)`,
    `${result.links.length} ${part}`,
  ];

  if (result.skipped.length > 0) {
    parts.push(`${result.skipped.length} not linked`);
  }

  return parts.join(", ");
};

const useRoutesAndParams = (
  projectId: string
): {
  error: string | null;
  params: Record<string, string>;
  routes: AppRoute[] | null;
  setError: Dispatch<SetStateAction<string | null>>;
  setParams: Dispatch<SetStateAction<Record<string, string>>>;
} => {
  const [routes, setRoutes] = useState<AppRoute[] | null>(null);
  const [params, setParams] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);

  const loadRoutes = useCallback(async (): Promise<void> => {
    try {
      const result = await api.appRoutes(projectId);
      setRoutes(result.routes);
    } catch (error: unknown) {
      setError(errorText(error));
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
    {result.skipped.slice(0, SLICE_4).map((item) => (
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

    const picked = (route: AppRoute): number => {
      if (chosen.includes(route.route)) {
        return chosen.indexOf(route.route);
      }

      return chosen.length;
    };

    return [...found]
      .toSorted(
        (appRoute, appRouteValue) => picked(appRoute) - picked(appRouteValue)
      )
      .slice(0, SLICE_200);
  }, [routes, filter, chosen]);

  const names = [...new Set(chosen.flatMap((route) => dynamicNames(route)))];

  const toggle = (route: string): void =>
    setChosen((list) => {
      if (list.includes(route)) {
        return list.filter((item) => item !== route);
      }

      return [...list, route];
    });

  const build = async (): Promise<void> => {
    setBusy(true);
    setError(null);
    const single = chosen.length === 1 && depth > 0;

    let result2: { from: string } | { routes: string[] } = { routes: chosen };

    if (single) {
      result2 = { from: chosen[0] as string };
    }

    const input = {
      ...result2,
      depth,
      params,
    };

    try {
      setResult(await api.buildFlow(projectId, input));
    } catch (error: unknown) {
      setError(errorText(error));
    } finally {
      setBusy(false);
    }
  };

  let placeholder2 = "Loading routes…";

  if (routes) {
    placeholder2 = `Filter ${routes.length} routes`;
  }

  const content3: string = ((): string => {
    if (busy) {
      return "Reading the source…";
    }
    if (chosen.length === 0) {
      return "Pick routes for the flow";
    }

    let part3: "routes" | "route" = "routes";

    if (chosen.length === 1) {
      part3 = "route";
    }

    return `Build flow from ${chosen.length} ${part3}`;
  })();

  return (
    <div className="app-routes flow-tab">
      <input
        className="app-routes-filter"
        value={filter}
        placeholder={placeholder2}
        aria-label={copy.filterRoutes}
        onChange={(event) => setFilter(event.target.value)}
      />
      <div className="flow-routes" role="list" aria-label={copy.routesInThe}>
        {shown.map((route) => {
          const at = chosen.indexOf(route.route);

          let datatip: "Add to the flow" | "Remove from the flow" =
            "Remove from the flow";

          if (at === -1) {
            datatip = "Add to the flow";
          }

          let content: ReactNode = <span className="flow-order">{at + 1}</span>;

          if (at === -1) {
            content = <Icon name="plus" size={12} />;
          }

          return (
            <button
              key={`${route.route}|${route.file}`}
              type="button"
              role="listitem"
              className="app-route"
              aria-pressed={at !== -1}
              data-tip={datatip}
              data-tip-align="start"
              onClick={() => toggle(route.route)}
            >
              <span className="mono">{route.route}</span>
              {content}
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
            {DEPTHS.map((value) => {
              let className2: "" | "on" = "";

              if (depth === value) {
                className2 = "on";
              }

              let datatip2 = "Only the chosen routes";

              if (value !== 0) {
                const part2: "click" | "clicks" = ((): "click" | "clicks" => {
                  if (value === 1) {
                    return "click";
                  }

                  return "clicks";
                })();

                datatip2 = `Add routes up to ${value} ${part2} away`;
              }

              const content2: 1 | 2 | "None" = ((): 1 | 2 | "None" => {
                if (value === 0) {
                  return "None";
                }

                return value;
              })();

              return (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={depth === value}
                  className={className2}
                  data-tip={datatip2}
                  onClick={() => setDepth(value)}
                >
                  {content2}
                </button>
              );
            })}
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
              onChange={(eventValue) =>
                setParams((prev) => ({
                  ...prev,
                  [name]: eventValue.target.value,
                }))
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
          {content3}
        </button>
      </div>
    </div>
  );
}
