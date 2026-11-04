import type { CanvasFileFrame } from "@design-studio/contracts/canvas-file";

interface PointResult {
  badge: boolean;
  frame: string;
  label: string | null;
  note: string;
  page: string;
  selector?: string;
  shown: false;
}

interface PointEvent {
  at: number;
  client: string;
  frameId: string;
  label: string | null;
  selector?: string;
}

interface PointMessage {
  directionId: string;
  point: PointEvent;
  projectId: string;
  type: "mcp.point";
}

interface PointTarget {
  directionId: string;
  projectId: string;
}

interface PointSeen {
  badge: boolean;
  note: string;
  sel: string;
}

interface SelectorField {
  selector?: string;
}

interface RemovedResult {
  note: string;
  removed: string;
}

const selectorField = (sel: string): SelectorField => {
  if (sel) {
    return { selector: sel };
  }

  return {};
};

const pointEvent = (
  frame: CanvasFileFrame | null,
  client: string,
  sel: string
): PointEvent => ({
  client,
  frameId: frame?.id ?? "f1",
  label: frame?.label ?? frame?.path ?? null,
  ...selectorField(sel),
  at: Date.now(),
});

const pointMessage = (
  target: PointTarget,
  point: PointEvent
): PointMessage => ({
  type: "mcp.point",
  projectId: target.projectId,
  directionId: target.directionId,
  point,
});

const pointResult = (
  frame: CanvasFileFrame | null,
  seen: PointSeen
): PointResult => ({
  frame: frame?.id ?? "f1",
  label: frame?.label ?? null,
  page: frame?.path ?? "(entry page)",
  ...selectorField(seen.sel),
  shown: false,
  badge: seen.badge,
  note: seen.note,
});

const removedResult = (removed: string): RemovedResult => ({
  removed,
  note: "The page file stays in the project.",
});

export { pointEvent, pointMessage, pointResult, removedResult };
