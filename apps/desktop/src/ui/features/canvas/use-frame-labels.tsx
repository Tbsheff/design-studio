import type { ProjectKind, SelectionContext } from "@design-studio/contracts";
import { useCallback, useRef } from "react";
import type { MutableRefObject } from "react";

import { api } from "../../api.js";
import {
  canHideFrame,
  frameName,
  setFrameHidden,
  setFramePath,
} from "./canvas-frames-model.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { CanvasDirections, Props } from "./canvas-types.js";
import { FramePageMenu } from "./frame-controls.js";
import { FrameMoreMenu } from "./frame-more-menu.js";
import type { FrameMenuItem } from "./frame-more-menu.js";
import type { useCanvasFrames, useFrameActions } from "./use-canvas-frames.js";
import { VariationControls } from "./variation-controls.js";
import type { FrameVariation } from "./variation-controls.js";

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

const frameMenuItems = (
  labelInput: LabelInput,
  frame: CanvasFrame,
  did: string | null
): FrameMenuItem[] => {
  const extra = labelInput.frameActions?.(frame, did) ?? [];

  const hide: FrameMenuItem = {
    icon: "eyeOff",
    id: "hide",
    label: "Hide frame",
    run: () =>
      labelInput.frames.update((canvasLayout) =>
        setFrameHidden(canvasLayout, frame.id, true)
      ),
    ...(canHideFrame(labelInput.frames.layout, frame.id)
      ? {}
      : { disabled: "The last shown frame stays." }),
  };

  return [...extra, hide];
};

const frameLabelSig = (
  labelInputValue: LabelInput,
  frame: CanvasFrame,
  did: string | null
): string => {
  const variation = did
    ? labelInputValue.directions?.variationOf(did)
    : undefined;

  const items = frameMenuItems(labelInputValue, frame, did).map((item) => [
    item.id,
    item.label,
    item.icon,
    item.disabled ?? "",
  ]);

  const value = variation
    ? [
        variation.label,
        variation.title,
        variation.status,
        variation.costText,
        variation.scoped,
        variation.error,
        variation.keepBlocked,
        variation.siblings,
      ]
    : null;

  const named = did
    ? labelInputValue.directions?.list.find((direction) => direction.id === did)
        ?.name
    : undefined;

  const index = labelInputValue.frames.layout.frames.findIndex(
    (canvasFrame) => canvasFrame.id === frame.id
  );

  return JSON.stringify([
    index,
    frame.id === labelInputValue.activeId,
    labelInputValue.frames.layout.frames.length > 1,
    did,
    did === labelInputValue.directionId,
    named,
    labelInputValue.directionName,
    labelInputValue.kind,
    Boolean(labelInputValue.appPages),
    value,
    items,
  ]);
};

const liveVariation = (
  variation: FrameVariation,
  did: string,
  live: MutableRefObject<LabelInput>
): FrameVariation => {
  const now = (): FrameVariation =>
    live.current.directions?.variationOf(did) ?? variation;

  return {
    ...variation,
    onKeep: () => now().onKeep(),
    onMix: (to, element) => now().onMix(to, element),
  };
};

const liveMenuItems = (
  labelInput3: LabelInput,
  frame: CanvasFrame,
  did: string | null,
  live: MutableRefObject<LabelInput>
): FrameMenuItem[] =>
  frameMenuItems(labelInput3, frame, did).map((item) => ({
    ...item,
    run: () =>
      frameMenuItems(live.current, frame, did)
        .find((cur) => cur.id === item.id)
        ?.run(),
  }));

const useFrameLabels = (labelInput4: LabelInput) => {
  const { projectId } = labelInput4;
  const live = useRef(labelInput4);
  live.current = labelInput4;

  const listPages = useCallback(
    (did: string) => async (): Promise<string[]> => {
      const { files } = await api.workTreeFiles(projectId, did);

      return files.filter((frameValue) => frameValue.endsWith(".html")).sort();
    },
    [projectId]
  );

  const pagesFor = (did: string | null): (() => Promise<string[]>) | null => {
    if (!labelInput4.appPages && !(labelInput4.kind === "html" && did)) {
      return null;
    }

    return () => (live.current.appPages ?? listPages(did as string))();
  };

  const label = (frame: CanvasFrame, did: string | null) => {
    const variation = did
      ? labelInput4.directions?.variationOf(did)
      : undefined;
    const isActive = frame.id === labelInput4.activeId;
    const index = labelInput4.frames.layout.frames.findIndex(
      (canvasFrameValue) => canvasFrameValue.id === frame.id
    );

    const named = did
      ? labelInput4.directions?.list.find(
          (directionValue) => directionValue.id === did
        )?.name
      : undefined;

    return {
      ...labelInput4.baseLabel(frame),
      badge: variation
        ? {
            current: did === labelInput4.directionId,
            label: variation.label,
            title: variation.title,
          }
        : undefined,
      directionId: did,
      extras: (
        <>
          {variation && did && (
            <VariationControls
              variation={liveVariation(variation, did, live)}
              active={isActive}
              element={isActive ? (labelInput4.selection[0] ?? null) : null}
              onMixed={() => live.current.setSelection(() => [])}
            />
          )}
          <FramePageMenu
            path={frame.path ?? ""}
            routes={Boolean(labelInput4.appPages)}
            listPages={pagesFor(did)}
            onPath={(path) =>
              live.current.frames.update((canvasLayoutValue) =>
                setFramePath(canvasLayoutValue, frame.id, path)
              )
            }
          />
          <FrameMoreMenu
            name={frame.label ?? frameName(frame)}
            items={liveMenuItems(labelInput4, frame, did, live)}
          />
        </>
      ),
      number: variation
        ? `1${variation.label.toLowerCase()}`
        : String(index + 1),
      title: variation
        ? undefined
        : (frame.label ?? named ?? labelInput4.directionName ?? undefined),
    };
  };

  return Object.assign(label, {
    sig: (frame: CanvasFrame, did: string | null) =>
      frameLabelSig(labelInput4, frame, did),
  });
};

export { useFrameLabels };
