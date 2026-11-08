import type { DirectStyleProperty } from "@design-studio/contracts";

import type { DirectEdit } from "./deps.js";
import { isSameEditValues } from "./edit-request-model.js";

interface FieldProps {
  readonly prop: DirectStyleProperty;
  readonly label: string;
  readonly short: string;
  readonly edit: DirectEdit;
}

const isSameField = (first: FieldProps, second: FieldProps): boolean =>
  first.prop === second.prop &&
  first.label === second.label &&
  first.short === second.short &&
  isSameEditValues(first.edit, second.edit, [first.prop]);

export { isSameField };

export type { FieldProps };
