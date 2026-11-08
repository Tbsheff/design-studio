import type { AppRoute } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy";
import { RouteLabel } from "./route-label";
import { toRouteTip } from "./routes-model";

interface RouteRowProps {
  readonly onPick: (route: AppRoute) => void;
  readonly route: AppRoute;
}

const RouteRow = ({ onPick, route }: RouteRowProps): ReactElement => {
  const pickRoute = useCallback((): void => onPick(route), [onPick, route]);

  return (
    <li>
      <button
        type="button"
        className="app-route"
        data-tip={toRouteTip(route)}
        data-tip-align="start"
        onClick={pickRoute}
      >
        <RouteLabel file={route.file} route={route.route} />
        {route.dynamic && <span className="tag">{copy.dynamic}</span>}
        {!route.dynamic && <Icon name="plus" size={12} />}
      </button>
    </li>
  );
};

export { RouteRow };
