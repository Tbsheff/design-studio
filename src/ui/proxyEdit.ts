import type { DirectStyleProperty } from '../shared/contracts';
import type { StyleValues } from './cssValues';
import type { DirectEdit } from './useDirectEdit';

export function proxyEdit(
  edit: DirectEdit,
  slot: DirectStyleProperty,
  value: string,
  write: (next: string) => Partial<StyleValues>,
  real: DirectStyleProperty[],
): DirectEdit {
  return {
    ...edit,
    values: { ...edit.values, [slot]: value },
    preview: (patch) => {
      const next = patch[slot];
      if (next !== undefined) edit.preview(write(next));
    },
    revert: () => edit.revert(real),
  };
}
