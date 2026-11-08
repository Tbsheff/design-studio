import type {
  BridgeToParent,
  ReorderMove,
  SelectionContext,
  StructureKey,
} from "@design-studio/contracts";

import { STRUCTURE_KEY_IDS } from "../../../shared/structure-keys.js";
import type { BridgeFrame } from "../../platform/bridge.js";
import type { LayerEditsOptions } from "./layer-edits-types.js";

interface LayerBridgeContext {
  readonly getOptions: () => LayerEditsOptions;
  readonly moveSelected: (move: ReorderMove) => void;
  readonly onBridge: (message: BridgeToParent) => void;
  readonly resolveReselect: (
    token: string,
    selection: SelectionContext
  ) => void;
  readonly sendReselect: () => void;
  readonly setTreeToken: (token: string) => void;
  readonly structureKey: (key: StructureKey) => void;
}

type MoveMessage = Extract<BridgeToParent, { type: "reorder-key" }>;

type StructureMessage = Extract<BridgeToParent, { type: "structure-key" }>;

const isMoveMessage = (message: BridgeToParent): message is MoveMessage =>
  message.type === "reorder-key" &&
  (message.move === "up" || message.move === "down");

const isStructureMessage = (
  message: BridgeToParent
): message is StructureMessage =>
  message.type === "structure-key" &&
  Object.hasOwn(STRUCTURE_KEY_IDS, message.key);

const runBridgeKeys = (
  context: LayerBridgeContext,
  message: BridgeToParent
): void => {
  const last = context.getOptions().selection.at(-1);

  if (isStructureMessage(message) && last?.selector === message.selector) {
    context.structureKey(message.key);
  }

  if (isMoveMessage(message) && last?.selector === message.selector) {
    context.moveSelected(message.move);
  }
};

const handleLayerBridge = (
  context: LayerBridgeContext,
  frame: BridgeFrame,
  message: BridgeToParent
): void => {
  if (frame.token !== context.getOptions().frames.frontToken) {
    return;
  }

  context.onBridge(message);

  if (message.type === "tree") {
    context.setTreeToken(frame.token);
  }

  if (message.type === "painted") {
    context.sendReselect();
  }

  if (
    message.type === "select" &&
    Boolean(message.selection) &&
    Object(message.selection) === message.selection
  ) {
    context.resolveReselect(frame.token, message.selection);
  }

  runBridgeKeys(context, message);
};

export { handleLayerBridge };

export type { LayerBridgeContext };
