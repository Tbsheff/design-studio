import type { SelectionContext } from "@design-studio/contracts";

import type { DropHint } from "./component-insert-api.js";

interface DropAt {
  requestId: string;
  selection: SelectionContext | null;
  inside: boolean;
  label: string;
}

const toDropHint = (drop: DropAt | null): DropHint | null => {
  if (!drop?.selection) {
    return null;
  }

  if (!drop.selection.source && !drop.selection.owners?.length) {
    return { ok: false, text: "This element has no source location" };
  }

  if (drop.inside) {
    return { ok: true, text: `Insert into ${drop.label}` };
  }

  return { ok: true, text: `Insert after ${drop.label}` };
};

export { toDropHint };

export type { DropAt };
