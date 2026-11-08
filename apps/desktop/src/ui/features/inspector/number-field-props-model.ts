import type { ReactNode } from "react";

import { sameSpec } from "./number-field-model.js";
import type { NumberSpec } from "./number-field-model.js";

interface NumberFieldProps {
  readonly spec: NumberSpec;
  readonly short: string;
  readonly icon?: ReactNode;
  readonly id?: string;
  readonly toControl: ((spec: NumberSpec) => ReactNode) | null;
}

const isMissing = (node: ReactNode): boolean => (node ?? null) === null;

const hasSameSlots = (
  first: NumberFieldProps,
  second: NumberFieldProps
): boolean => {
  if (isMissing(first.icon) !== isMissing(second.icon)) {
    return false;
  }

  return first.toControl === second.toControl;
};

const isSameField = (
  first: NumberFieldProps,
  second: NumberFieldProps
): boolean => {
  if (!hasSameSlots(first, second)) {
    return false;
  }

  const isSameText = first.short === second.short && first.id === second.id;

  return isSameText && sameSpec(first.spec, second.spec);
};

export { isSameField };

export type { NumberFieldProps };
