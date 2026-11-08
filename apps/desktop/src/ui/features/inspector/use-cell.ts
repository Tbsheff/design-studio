import { useRef } from "react";
import type { MutableRefObject } from "react";

const useCell = <Value>(initial: Value): MutableRefObject<Value> =>
  useRef(initial);

export { useCell };
