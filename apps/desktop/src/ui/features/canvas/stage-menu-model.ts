import type { MouseEvent } from "react";

import { createLiveStore } from "../../platform/live-store.js";
import { isEmptyStageAt } from "./linked-frame-model.js";
import type { MenuPoint } from "./preview-menu-model.js";

interface StagePasteDetail {
  readonly x: number;
  readonly y: number;
}

const STAGE_PASTE_EVENT = "studio:stage-paste";

const stageMenuStore = createLiveStore<MenuPoint | null>(null);

const openStageMenu = (event: MouseEvent<HTMLElement>): void => {
  if (!isEmptyStageAt(event.clientX, event.clientY)) {
    return;
  }

  event.preventDefault();
  stageMenuStore.set({ x: event.clientX, y: event.clientY });
};

const closeStageMenu = (): void => stageMenuStore.set(null);

const requestStagePaste = (at: MenuPoint): void => {
  const detail: StagePasteDetail = { x: at.x, y: at.y };

  globalThis.dispatchEvent(new CustomEvent(STAGE_PASTE_EVENT, { detail }));
};

const toStagePastePoint = (event: Event): StagePasteDetail | null => {
  if (!(event instanceof CustomEvent)) {
    return null;
  }

  const detail: StagePasteDetail | null = event.detail ?? null;

  return detail;
};

export {
  STAGE_PASTE_EVENT,
  closeStageMenu,
  openStageMenu,
  requestStagePaste,
  stageMenuStore,
  toStagePastePoint,
};

export type { StagePasteDetail };
