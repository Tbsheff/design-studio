import type { AppRoute } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement, ReactNode } from "react";

import { copy } from "./copy.js";

const ICON_SIZE = 12;

const FlowRouteItem = ({
  at,
  onToggle,
  route,
}: {
  at: number;
  onToggle: (route: string) => void;
  route: AppRoute;
}): ReactElement => {
  const toggle = useCallback(() => onToggle(route.route), [onToggle, route]);

  let datatip: string = copy.removeFromTheFlow;
  let content: ReactNode = <span className="flow-order">{at + 1}</span>;

  if (at === -1) {
    datatip = copy.addToTheFlow;
    content = <Icon name="plus" size={ICON_SIZE} />;
  }

  return (
    <li>
      <button
        type="button"
        className="app-route"
        aria-pressed={at !== -1}
        data-tip={datatip}
        data-tip-align="start"
        onClick={toggle}
      >
        <span className="mono">{route.route}</span>
        {content}
      </button>
    </li>
  );
};

export { FlowRouteItem };
