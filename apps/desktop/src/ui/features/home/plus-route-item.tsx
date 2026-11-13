import { useCallback } from "react";
import type { ReactElement } from "react";

import { openRoutePrototype } from "./deps.js";
import { PlusItem } from "./plus-item.js";

interface PlusRouteItemProps {
  readonly appProjectId: string;
  readonly route: string;
  readonly onClose: (shouldRefocus: boolean) => void;
}

const PlusRouteItem = ({
  appProjectId,
  route,
  onClose,
}: PlusRouteItemProps): ReactElement => {
  const action = useCallback((): void => {
    openRoutePrototype(appProjectId, route);
  }, [appProjectId, route]);

  return (
    <PlusItem
      icon="sparkle"
      label={route}
      meta={null}
      hasChevron={false}
      action={action}
      onClose={onClose}
    />
  );
};

export { PlusRouteItem };

export type { PlusRouteItemProps };
