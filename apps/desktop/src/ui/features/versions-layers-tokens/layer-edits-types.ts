import type {
  ProjectKind,
  ReorderMove,
  SelectionContext,
  StructureEditRequest,
  StructureKey,
  StructureTarget,
} from "@design-studio/contracts";
import type { MutableRefObject } from "react";

import type { ParentMessageBody } from "../../platform/bridge.js";
import type { LayerDropTarget } from "./layers-drop.js";
import type { LayerTree } from "./layers-tree.js";

interface LayerFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  tree: LayerTree | null;
  selectedNode: number | null;
  post: (body: ParentMessageBody) => void;
  selectNode: (id: number, additive: boolean) => void;
}

interface LayerEditsOptions {
  projectId: string;
  directionId: string | null;
  kind: ProjectKind;
  enabled: boolean;
  selectMode: boolean;
  treeWanted: boolean;
  headVersionId: string | null;
  frames: LayerFrames;
  selection: SelectionContext[];
  setSelection: (
    updater: (prev: SelectionContext[]) => SelectionContext[]
  ) => void;
}

type LayerChange =
  | { name: string | null }
  | { hidden: boolean }
  | { move: ReorderMove };

interface Reselect {
  loc: string;
  others: readonly { readonly sourceLoc: string; readonly tag: string }[];
  tag: string;
  text: string;
  token: string | null;
  newFrame: boolean;
  move: boolean;
  until: number;
  fromSelector: string;
}

interface NodeTask {
  id: number;
  run: (target: SelectionContext) => void;
  until: number;
}

interface LayerEdits {
  enabled: boolean;
  busy: boolean;
  settled: boolean;
  tree: LayerTree | null;
  notice: string | null;
  clearNotice: () => void;
  notify: (message: string) => void;
  renameNode: (id: number, name: string | null) => void;
  setNodeHidden: (id: number, hidden: boolean) => void;
  setNodeLocked: (id: number, locked: boolean) => void;
  moveNode: (id: number, move: ReorderMove) => void;
  moveSelected: (move: ReorderMove) => void;
  structureKey: (key: StructureKey) => void;
  dropNode: (id: number, drop: LayerDropTarget["drop"]) => void;
  applyStructure: (request: StructureEditRequest) => Promise<void>;
  canPaste: boolean;
}

interface CutState {
  targets: StructureTarget[];
  head: string | null;
}

export type {
  CutState,
  LayerChange,
  LayerEdits,
  LayerEditsOptions,
  LayerFrames,
  NodeTask,
  Reselect,
};
