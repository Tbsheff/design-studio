import type {
  LayerNode,
  SelectionContext,
  StructureEditRequest,
  SourceLoc,
  StructureTarget,
} from "@design-studio/contracts";

import type { LayerDropTarget } from "./layers-drop.js";

interface PasteIds {
  readonly directionId: string;
  readonly projectId: string;
}

interface StructureDeps {
  readonly dropRequest: (
    nodes: LayerNode[],
    id: number,
    drop: LayerDropTarget["drop"],
    selection: SelectionContext[]
  ) => StructureEditRequest | null;
  readonly isMac: boolean;
  readonly noSource: string;
  readonly pasteJsx: (
    ids: PasteIds,
    selection: SelectionContext,
    notify: (message: string) => void
  ) => Promise<void>;
  readonly readSource: (
    ids: PasteIds,
    loc: SourceLoc
  ) => Promise<string | null>;
  readonly selectionTargets: (
    selection: SelectionContext[]
  ) => StructureTarget[] | null;
}

export type { PasteIds, StructureDeps };
