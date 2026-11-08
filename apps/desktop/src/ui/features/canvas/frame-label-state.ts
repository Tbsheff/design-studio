import type { ProjectKind, SelectionContext } from "@design-studio/contracts";

import { canHideFrame, setFrameHidden } from "./canvas-frame-ops.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasDirections, Props } from "./canvas-types.js";
import type { FrameMenuItem } from "./frame-more-menu.js";
import type { useCanvasFrames, useFrameActions } from "./use-canvas-frames.js";
import type { FrameVariation } from "./variation-model.js";

interface LabelInput {
  projectId: string;
  kind: ProjectKind;
  directionId: string | null;
  activeId: string;
  directions: CanvasDirections | undefined;
  selection: SelectionContext[];
  setSelection: Props["setSelection"];
  frames: ReturnType<typeof useCanvasFrames>;
  baseLabel: ReturnType<typeof useFrameActions>["labelProps"];
  directionName: string | null;
  frameActions?: (
    frame: CanvasFrame,
    directionId: string | null
  ) => FrameMenuItem[];
  appPages?: (() => Promise<string[]>) | null;
}

type LabelState = LabelInput & {
  readonly loadHtmlPages: (projectId: string, did: string) => Promise<string[]>;
};

type GetLive = () => LabelState;

const toVariation = (
  input: LabelState,
  did: string | null
): FrameVariation | undefined => {
  if (did) {
    return input.directions?.variationOf(did);
  }
};

const toDirectionName = (
  input: LabelState,
  did: string | null
): string | undefined => {
  if (did) {
    return input.directions?.list.find((direction) => direction.id === did)
      ?.name;
  }
};

const frameMenuItems = (
  input: LabelState,
  frame: CanvasFrame,
  did: string | null
): FrameMenuItem[] => {
  const extra = input.frameActions?.(frame, did) ?? [];

  const hide: FrameMenuItem = {
    icon: "eyeOff",
    id: "hide",
    label: "Hide frame",
    run: () =>
      input.frames.update((canvasLayout) =>
        setFrameHidden(canvasLayout, frame.id, true)
      ),
  };

  if (!canHideFrame(input.frames.layout, frame.id)) {
    hide.disabled = "The last shown frame stays.";
  }

  return [...extra, hide];
};

const toVariationSig = (variation: FrameVariation | undefined): string => {
  if (!variation) {
    return "";
  }

  return JSON.stringify([
    variation.label,
    variation.title,
    variation.status,
    variation.costText,
    variation.scoped,
    variation.error,
    variation.keepBlocked,
    variation.siblings,
  ]);
};

const toItemsSig = (items: FrameMenuItem[]): string =>
  JSON.stringify(
    items.map((item) => [item.id, item.label, item.icon, item.disabled ?? ""])
  );

const frameLabelSig = (
  input: LabelState,
  frame: CanvasFrame,
  did: string | null
): string => {
  const { frames } = input.frames.layout;
  const index = frames.findIndex((canvasFrame) => canvasFrame.id === frame.id);

  return JSON.stringify([
    index,
    frame.id === input.activeId,
    frames.length > 1,
    did,
    did === input.directionId,
    toDirectionName(input, did),
    input.directionName,
    input.kind,
    Boolean(input.appPages),
    toVariationSig(toVariation(input, did)),
    toItemsSig(frameMenuItems(input, frame, did)),
  ]);
};

const toPagesLoader = (
  input: LabelState,
  getLive: GetLive,
  did: string | null
): (() => Promise<string[]>) | null => {
  if (!input.appPages && !(input.kind === "html" && did)) {
    return null;
  }

  return () => {
    const pages = getLive().appPages;

    if (pages) {
      return pages();
    }

    return getLive().loadHtmlPages(input.projectId, did as string);
  };
};

const toLiveItem = (item: FrameMenuItem, run: () => void): FrameMenuItem => ({
  ...item,
  run,
});

const toLiveMenuItems = (
  input: LabelState,
  getLive: GetLive,
  frame: CanvasFrame,
  did: string | null
): FrameMenuItem[] =>
  frameMenuItems(input, frame, did).map((item) =>
    toLiveItem(item, () => {
      frameMenuItems(getLive(), frame, did)
        .find((cur) => cur.id === item.id)
        ?.run();
    })
  );

const toLiveVariation = (
  variation: FrameVariation,
  did: string,
  getLive: GetLive
): FrameVariation => {
  const now = (): FrameVariation =>
    getLive().directions?.variationOf(did) ?? variation;

  return {
    ...variation,
    onKeep: () => now().onKeep(),
    onMix: (to, element) => now().onMix(to, element),
  };
};

const toTitle = (
  input: LabelState,
  frame: CanvasFrame,
  did: string | null
): string | null => {
  if (toVariation(input, did)) {
    return null;
  }

  return frame.label ?? toDirectionName(input, did) ?? input.directionName;
};

export {
  frameLabelSig,
  toDirectionName,
  toLiveMenuItems,
  toLiveVariation,
  toPagesLoader,
  toTitle,
  toVariation,
};

export type { GetLive, LabelInput, LabelState };
