import type { DirectStyleProperty } from "../../../shared/actions/_core/contracts.js";
import type { ShiftPart, StyleValues } from "./css-values.js";
import type { DirectEdit } from "./use-direct-edit.js";

export interface ProxyOptions {
  part?: ShiftPart;
  mixed?: boolean;
}

export const proxyEdit = (
  edit: DirectEdit,
  slot: DirectStyleProperty,
  value: string,
  write: (next: string) => Partial<StyleValues>,
  real: DirectStyleProperty[],
  options: ProxyOptions = {}
): DirectEdit => {
  const realMixed = real.some((prop) => edit.mixed.has(prop));
  const part = realMixed ? options.part : undefined;
  const mixed = options.mixed ?? realMixed;

  return {
    ...edit,
    mixed: mixed ? new Set([slot]) : new Set<DirectStyleProperty>(),
    preview: (patch) => {
      const next = patch[slot];

      if (next === undefined) {
        return;
      }

      if (part) {
        edit.shift(real, 0, {}, { ...part, set: next });
      } else {
        edit.preview(write(next));
      }
    },
    revert: () => edit.revert(real),
    shift: (_props, delta, bounds) => {
      if (part) {
        edit.shift(real, delta, bounds, part);
      }
    },
    values: { ...edit.values, [slot]: value },
  };
};
