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

function frameMenuItems(
  o: LabelInput,
  frame: CanvasFrame,
  did: string | null
): FrameMenuItem[] {
  const extra = o.frameActions?.(frame, did) ?? [];

  const hide: FrameMenuItem = {
    icon: "eyeOff",
    id: "hide",
    label: "Hide frame",
    run: () => o.frames.update((l) => setFrameHidden(l, frame.id, true)),
    ...(canHideFrame(o.frames.layout, frame.id)
      ? {}
      : { disabled: "The last shown frame stays." }),
  };

  return [...extra, hide];
}

function frameLabelSig(
  o: LabelInput,
  frame: CanvasFrame,
  did: string | null
): string {
  const variation = did ? o.directions?.variationOf(did) : undefined;

  const items = frameMenuItems(o, frame, did).map((item) => [
    item.id,
    item.label,
    item.icon,
    item.disabled ?? "",
  ]);

  const v = variation
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
    ? o.directions?.list.find((d) => d.id === did)?.name
    : undefined;

  const index = o.frames.layout.frames.findIndex((f) => f.id === frame.id);

  return JSON.stringify([
    index,
    frame.id === o.activeId,
    o.frames.layout.frames.length > 1,
    did,
    did === o.directionId,
    named,
    o.directionName,
    o.kind,
    Boolean(o.appPages),
    v,
    items,
  ]);
}

function liveVariation(
  variation: FrameVariation,
  did: string,
  live: MutableRefObject<LabelInput>
): FrameVariation {
  const now = () => live.current.directions?.variationOf(did) ?? variation;

  return {
    ...variation,
    onKeep: () => now().onKeep(),
    onMix: (to, element) => now().onMix(to, element),
  };
}

function liveMenuItems(
  o: LabelInput,
  frame: CanvasFrame,
  did: string | null,
  live: MutableRefObject<LabelInput>
): FrameMenuItem[] {
  return frameMenuItems(o, frame, did).map((item) => ({
    ...item,
    run: () =>
      frameMenuItems(live.current, frame, did)
        .find((cur) => cur.id === item.id)
        ?.run(),
  }));
}

function useFrameLabels(o: LabelInput) {
  const { projectId } = o;
  const live = useRef(o);
  live.current = o;

  const listPages = useCallback(
    (did: string) => () =>
      api
        .workTreeFiles(projectId, did)
        .then(({ files }) => files.filter((f) => f.endsWith(".html")).sort()),
    [projectId]
  );

  const pagesFor = (did: string | null): (() => Promise<string[]>) | null => {
    if (!o.appPages && !(o.kind === "html" && did)) {
      return null;
    }

    return () => (live.current.appPages ?? listPages(did as string))();
  };

  const label = (frame: CanvasFrame, did: string | null) => {
    const variation = did ? o.directions?.variationOf(did) : undefined;
    const isActive = frame.id === o.activeId;
    const index = o.frames.layout.frames.findIndex((f) => f.id === frame.id);

    const named = did
      ? o.directions?.list.find((d) => d.id === did)?.name
      : undefined;

    return {
      ...o.baseLabel(frame),
      badge: variation
        ? {
            label: variation.label,
            title: variation.title,
            current: did === o.directionId,
          }
        : undefined,
      directionId: did,
      extras: (
        <>
          {variation && did && (
            <VariationControls
              variation={liveVariation(variation, did, live)}
              active={isActive}
              element={isActive ? (o.selection[0] ?? null) : null}
              onMixed={() => live.current.setSelection(() => [])}
            />
          )}
          <FramePageMenu
            path={frame.path ?? ""}
            routes={Boolean(o.appPages)}
            listPages={pagesFor(did)}
            onPath={(path) =>
              live.current.frames.update((l) => setFramePath(l, frame.id, path))
            }
          />
          <FrameMoreMenu
            name={frame.label ?? frameName(frame)}
            items={liveMenuItems(o, frame, did, live)}
          />
        </>
      ),
      number: variation
        ? `1${variation.label.toLowerCase()}`
        : String(index + 1),
      title: variation
        ? undefined
        : (frame.label ?? named ?? o.directionName ?? undefined),
    };
  };

  return Object.assign(label, {
    sig: (frame: CanvasFrame, did: string | null) =>
      frameLabelSig(o, frame, did),
  });
}

export { useFrameLabels };
