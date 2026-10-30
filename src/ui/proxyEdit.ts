import type { DirectStyleProperty } from '../shared/contracts';
import type { ShiftPart, StyleValues } from './cssValues';
import type { DirectEdit } from './useDirectEdit';

export interface ProxyOptions {
  part?: ShiftPart;
  mixed?: boolean;
}

export function proxyEdit(
  edit: DirectEdit,
  slot: DirectStyleProperty,
  value: string,
  write: (next: string) => Partial<StyleValues>,
  real: DirectStyleProperty[],
  options: ProxyOptions = {},
): DirectEdit {
  const realMixed = real.some((prop) => edit.mixed.has(prop));
  const part = realMixed ? options.part : undefined;
  const mixed = options.mixed ?? realMixed;
  return {
    ...edit,
    values: { ...edit.values, [slot]: value },
    mixed: mixed ? new Set([slot]) : new Set<DirectStyleProperty>(),
    preview: (patch) => {
      const next = patch[slot];
      if (next === undefined) return;
      if (part) edit.shift(real, 0, {}, { ...part, set: next });
      else edit.preview(write(next));
    },
    shift: (_props, delta, bounds) => {
      if (part) edit.shift(real, delta, bounds, part);
    },
    revert: () => edit.revert(real),
  };
}
