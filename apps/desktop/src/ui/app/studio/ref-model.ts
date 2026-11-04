import type { RefObject } from "react";

const assignRef = <Value>(ref: RefObject<Value>, value: Value): void => {
  ref.current = value;
};

export { assignRef };
