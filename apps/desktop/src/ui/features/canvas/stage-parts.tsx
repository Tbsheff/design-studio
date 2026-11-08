import type { SelectionContext } from "@design-studio/contracts";
import { useRef } from "react";
import type {
  ComponentProps,
  MutableRefObject,
  ReactNode,
  ReactElement,
} from "react";

import { tagFrame } from "../../platform/bridge.js";
import { createLiveStore, useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { PageWait } from "../chat/use-first-build.js";
import { RenderCheckPanel } from "../review/render-check-panel.js";
import { ArtboardOverlay } from "./artboard-overlay.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import { overlayHover } from "./canvas-helpers.js";
import type { StageNote } from "./canvas-helpers.js";
import { copy } from "./copy.js";
import { FirstBuildCover } from "./frame-skeleton.js";
import { FreeMoveLayer } from "./free-move-layer.js";
import { StablePassiveFrame } from "./passive-frame.js";
import type { PassiveEntry } from "./passive-frame.js";
import type { DirectionFrames } from "./use-direction-frames.js";
import type { useFrameLabels } from "./use-frame-labels.js";
import type { FreeMoveView } from "./use-free-move.js";
import type { HoverBox } from "./use-preview-frames.js";
import type { useRenderCheck } from "./use-preview-url.js";
import { useResizeLive } from "./use-resize-handles.js";
import type { ResizeHandles } from "./use-resize-handles.js";

function StageMessage({
  note: given,
  covered,
  urlError,
  app,
}: {
  note: StageNote;
  covered: boolean;
  urlError: string | null;
  app: ReactNode;
}): ReactNode {
  const note = covered ? null : given;

  if (urlError) {
    return <div className="stage-message">{urlError}</div>;
  }

  if (note === "building") {
    return (
      <div className="stage-message" role="status">
        <span className="spinner" aria-hidden="true" />
        Building the first version…
      </div>
    );
  }

  if (note === "empty") {
    return (
      <div className="stage-message" role="status">
        No design yet. Send a prompt, or start the variations.
      </div>
    );
  }

  return app;
}

interface SlotFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  onFrameLoad: (token: string) => void;
}

function PreviewSlots({
  frames,
  sandbox,
  viewport,
}: {
  frames: SlotFrames;
  sandbox?: string;
  viewport: { width: number; height: number };
}): ReactElement[] {
  return frames.slots.map((slot) => (
    <iframe
      key={slot.token}
      ref={(el) => {
        frames.elements.current[slot.token] = tagFrame(el, slot.token);
      }}
      title={copy.designPreview}
      className={`frame ${slot.token === frames.frontToken ? "front" : "back"}`}
      src={slot.src}
      onLoad={() => frames.onFrameLoad(slot.token)}
      sandbox={sandbox}
      width={viewport.width}
      height={viewport.height}
    />
  ));
}

function OtherFrames({
  frames,
  active,
  passive,
  sandbox,
  labelProps,
  register,
  waiting,
  steps,
}: {
  frames: CanvasFrame[];
  active: CanvasFrame;
  passive: DirectionFrames;
  sandbox?: string;
  labelProps: ReturnType<typeof useFrameLabels>;
  register: (id: string, el: HTMLDivElement | null) => void;
  waiting: (path: string | undefined, directionId: string | null) => PageWait;
  steps: LiveStore<string | null>;
}): ReactElement[] {
  const step = useLive(steps);
  const entries = useRef(new Map<string, PassiveEntry>());
  const live = entries.current;
  live.clear();

  return frames
    .filter((f) => f.id !== active.id)
    .map((f) => {
      const slot = passive.slots.find((item) => item.id === f.id);
      const did = slot?.directionId ?? null;
      const wait = waiting(f.path, did);
      live.set(f.id, {
        frame: f,
        frameRef: (el) => {
          if (slot) {
            passive.elements.current[slot.token] = tagFrame(el, slot.token);
          }
        },
        label: labelProps(f, did),
        nextSrc: wait ? null : (slot?.nextSrc ?? null),
        offset: active,
        onNextLoad: passive.onSwapDone,
        pending: wait
          ? { step: step ?? null, missing: wait === "missing" }
          : undefined,
        register,
        sandbox,
        src: wait ? null : (slot?.src ?? null),
      });

      const sig = JSON.stringify([
        f,
        wait,
        wait ? step : null,
        slot?.src ?? null,
        slot?.nextSrc ?? null,
        slot?.token ?? null,
        sandbox ?? null,
        active.x,
        active.y,
        labelProps.sig(f, did),
      ]);

      return (
        <StablePassiveFrame key={f.id} id={f.id} sig={sig} entries={entries} />
      );
    });
}

interface LiveOverlayProps extends Omit<
  ComponentProps<typeof ArtboardOverlay>,
  "hover" | "resize"
> {
  hover: LiveStore<HoverBox | null>;
  picked: LiveStore<SelectionContext[] | null>;
  commenting: boolean;
  picking: boolean;
  resize: ResizeHandles;
}

const NO_PICK = createLiveStore<SelectionContext[] | null>(null);

function LiveOverlay({
  hover,
  picked,
  commenting,
  picking,
  resize,
  selection,
  ...rest
}: LiveOverlayProps): ReactElement {
  const box = useLive(hover);
  const early = useLive(commenting ? NO_PICK : picked);

  return (
    <ArtboardOverlay
      {...rest}
      selection={early ?? selection}
      hover={overlayHover(box, picking)}
      resize={useResizeLive(resize)}
    />
  );
}

function StepCover({
  steps,
  ...rest
}: Omit<ComponentProps<typeof FirstBuildCover>, "step"> & {
  steps: LiveStore<string | null>;
}): ReactElement {
  return <FirstBuildCover {...rest} step={useLive(steps)} />;
}

function FreeMoveSlot({
  view,
}: {
  view: LiveStore<FreeMoveView | null>;
}): ReactElement {
  return <FreeMoveLayer view={useLive(view)} />;
}

function CheckResults({
  projectId,
  check,
}: {
  projectId: string;
  check: ReturnType<typeof useRenderCheck>;
}): ReactElement | null {
  if (!check.results && !check.error) {
    return null;
  }

  return (
    <RenderCheckPanel
      projectId={projectId}
      results={check.results}
      error={check.error}
      onClose={check.close}
    />
  );
}

export {
  CheckResults,
  FreeMoveSlot,
  LiveOverlay,
  OtherFrames,
  PreviewSlots,
  StageMessage,
  StepCover,
};
