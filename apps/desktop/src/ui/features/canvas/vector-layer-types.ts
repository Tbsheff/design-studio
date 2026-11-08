import type {
  BridgeToParent,
  SelectionContext,
} from "@design-studio/contracts";

import type { VectorRequest } from "../../../shared/vector.js";
import type { ParentMessageBody } from "../../platform/bridge.js";

interface Point {
  x: number;
  y: number;
}

type Placed =
  | Omit<Extract<VectorRequest, { op: "shape" }>, "target" | "relativeParent">
  | Omit<Extract<VectorRequest, { op: "path" }>, "target" | "relativeParent">;

interface Drop {
  selection: SelectionContext | null;
  inside: boolean;
}

interface VectorLayerProps {
  projectId: string;
  directionId: string;
  zoom: number;
  frame: { width: number; height: number };
  post: (body: ParentMessageBody) => void;
  listen: (handler: (message: BridgeToParent) => void) => () => void;
  notify: (message: string) => void;
  page?: string;
}

type PointOf = (event: { clientX: number; clientY: number }) => Point | null;

type Commit = (at: Point, build: (origin: Point) => Placed) => Promise<void>;

export type { Commit, Drop, Placed, Point, PointOf, VectorLayerProps };
