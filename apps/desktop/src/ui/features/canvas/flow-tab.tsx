import { useCallback, useMemo, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { dynamicNames } from "../../../shared/route-flow.js";
import { copy } from "./copy.js";
import { FlowBuildButton } from "./flow-build-button.js";
import { FlowDepthRow } from "./flow-depth-row.js";
import { FlowParamField } from "./flow-param-field.js";
import { FlowResultView } from "./flow-result-view.js";
import { FlowRouteList } from "./flow-route-list.js";
import { toFlowInput, useFlowBuild } from "./use-flow-build.js";
import { useFlowRoutes } from "./use-flow-routes.js";
import { useFlowSelection } from "./use-flow-selection.js";

const toPlaceholder = (count: number | null): string => {
  if (count === null) {
    return copy.loadingRoutes;
  }

  return `Filter ${count} routes`;
};

const FlowTab = ({ projectId }: { projectId: string }): ReactElement => {
  const { routes, params, setParams, error, setError } =
    useFlowRoutes(projectId);

  const { chosen, filter, setFilter, shown, toggle } = useFlowSelection(routes);

  const [depth, setDepth] = useState<number>(1);

  const input = useMemo(
    () => toFlowInput(chosen, depth, params),
    [chosen, depth, params]
  );

  const { build, isPending, result } = useFlowBuild(projectId, input, setError);

  const names = [...new Set(chosen.flatMap((route) => dynamicNames(route)))];

  const changeFilter = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setFilter(event.target.value),
    [setFilter]
  );

  const changeParam = useCallback(
    (name: string, value: string) =>
      setParams((prev) => ({ ...prev, [name]: value })),
    [setParams]
  );

  let count: number | null = null;

  if (routes) {
    count = routes.length;
  }

  return (
    <div className="app-routes flow-tab">
      <input
        className="app-routes-filter"
        value={filter}
        placeholder={toPlaceholder(count)}
        aria-label={copy.filterRoutes}
        onChange={changeFilter}
      />
      <FlowRouteList chosen={chosen} onToggle={toggle} shown={shown} />
      <div className="flow-controls">
        <FlowDepthRow depth={depth} onPick={setDepth} />
        {names.map((name) => (
          <FlowParamField
            key={name}
            name={name}
            onChange={changeParam}
            value={params[name] ?? ""}
          />
        ))}
        {error && <div className="alert error small">{error}</div>}
        {result && <FlowResultView result={result} />}
        <FlowBuildButton
          count={chosen.length}
          isPending={isPending}
          onBuild={build}
        />
      </div>
    </div>
  );
};

export { FlowTab };
