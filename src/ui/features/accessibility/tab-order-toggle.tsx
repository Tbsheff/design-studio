import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { toggleTabOrder, useTabOrderOn } from "./tab-order-store.js";

const TabOrderToggle = (): ReactElement => {
  const isOn = useTabOrderOn();
  let label: string = copy.tabOrder;
  let className = "btn small ghost select-toggle tab-order-toggle";

  if (isOn) {
    label = copy.tabOrderOff;
    className = `${className} on`;
  }

  return (
    <button
      aria-label={label}
      aria-pressed={isOn}
      className={className}
      data-tip={copy.tabOrderTip}
      type="button"
      onClick={toggleTabOrder}
    >
      <span className="label">{copy.tabText}</span>
    </button>
  );
};

export { TabOrderToggle };
