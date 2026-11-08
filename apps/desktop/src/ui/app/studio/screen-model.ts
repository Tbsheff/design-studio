import type { ScreenDuplicateDetail } from "../../domain/screen-events";
import {
  activeFrame,
  canvasStore,
  defaultLayout,
} from "../../features/canvas/index";
import { uiStore } from "../../platform/storage";

interface ScreenCreateRequest {
  readonly directionId: string | null;
  readonly kind: "create";
}

interface ScreenDuplicateRequest {
  readonly directionId: string | null;
  readonly from: string;
  readonly kind: "duplicate";
}

type ScreenRequest = ScreenCreateRequest | ScreenDuplicateRequest;

const isDuplicateDetail = (value: unknown): value is ScreenDuplicateDetail =>
  typeof value === "object" && value !== null && "frameId" in value;

const toDirectionId = (projectId: string): string | null =>
  uiStore.get().directionByProject[projectId] ?? null;

const toCreateRequest = (projectId: string): ScreenRequest => ({
  directionId: toDirectionId(projectId),
  kind: "create",
});

const toFramePath = (projectId: string, frameId: string | null): string => {
  const layout =
    canvasStore.get(projectId) ?? defaultLayout(uiStore.get().viewport);

  const frame =
    layout.frames.find((item) => item.id === frameId) ?? activeFrame(layout);

  return frame.path ?? "";
};

const toDuplicateRequest = (projectId: string, event: Event): ScreenRequest => {
  let frameId: string | null = null;

  if (event instanceof CustomEvent && isDuplicateDetail(event.detail)) {
    ({ frameId } = event.detail);
  }

  return {
    directionId: toDirectionId(projectId),
    from: toFramePath(projectId, frameId),
    kind: "duplicate",
  };
};

export { toCreateRequest, toDuplicateRequest };

export type { ScreenRequest };
