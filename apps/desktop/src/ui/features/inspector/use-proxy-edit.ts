import type { DirectStyleProperty } from "@design-studio/contracts";

import type { ShiftPart, StyleValues } from "./css-value-model.js";
import type { DirectEdit } from "./use-direct-edit.js";

interface ProxyOptions {
  readonly part: ShiftPart | null;
  readonly isMixed: boolean | null;
  readonly real: DirectStyleProperty[];
  readonly write: (next: string) => Partial<StyleValues>;
}

const toProxyPart = (
  edit: DirectEdit,
  options: ProxyOptions
): ShiftPart | null => {
  if (options.real.some((prop) => edit.mixed.has(prop))) {
    return options.part;
  }

  return null;
};

const createProxyEdit = (
  edit: DirectEdit,
  slot: DirectStyleProperty,
  value: string,
  options: ProxyOptions
): DirectEdit => {
  const { real, write } = options;
  const realMixed = real.some((prop) => edit.mixed.has(prop));
  const part = toProxyPart(edit, options);
  const mixed = options.isMixed ?? realMixed;
  let slots = new Set<DirectStyleProperty>();

  if (mixed) {
    slots = new Set([slot]);
  }

  return {
    ...edit,
    mixed: slots,
    preview: (patch) => {
      const next = patch[slot] ?? null;

      if (next === null) {
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

export { createProxyEdit };

export type { ProxyOptions };
