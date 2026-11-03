import type { BridgeToParent, SelectionContext } from "../shared/contracts.js";

type Rect = SelectionContext["rect"];
type OutgoingBody = BridgeToParent extends infer Message
  ? Message extends BridgeToParent
    ? Omit<Message, "ns" | "token">
    : never
  : never;

export type { OutgoingBody, Rect };
