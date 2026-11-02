import type { ReactElement } from "react";

import { TabBadge } from "./tab-badge.js";
import { useTabOrder } from "./use-tab-order.js";
import type { TabOrderOptions } from "./use-tab-order.js";

import styles from "./accessibility.module.css";

interface TabOrderLayerProps extends TabOrderOptions {
  readonly zoom: number;
}

const TabOrderLayer = (props: TabOrderLayerProps): ReactElement => {
  const order = useTabOrder(props);

  return (
    <div className={styles.layer}>
      {order.badges.map((badge) => (
        <TabBadge key={badge.order} badge={badge} zoom={props.zoom} />
      ))}
    </div>
  );
};

export { TabOrderLayer };

export type { TabOrderLayerProps };
