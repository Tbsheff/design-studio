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

const StageMessage = ({
  note: given,
  covered,
  urlError,
  app,
}: {
  note: StageNote;
  covered: boolean;
  urlError: string | null;
  app: ReactNode;
}): ReactNode => {
  let note: "building" | "empty" | null = given;

  if (covered) {
    note = null;
  }

  if (urlError) {
    return <div className="stage-message">{urlError}</div>;
  }

  if (note === "building") {
    return (
      <div className="stage-message" role="status">
        <span className="spinner" aria-hidden="true" />
        {copy.buildingTheFirstVersion}
      </div>
    );
  }

  if (note === "empty") {
    return (
      <div className="stage-message" role="status">
        {copy.noDesignYetSend}
      </div>
    );
  }

  return app;
};

interface SlotFrames {
  slots: { token: string; src: string }[];
  frontToken: string | null;
  elements: MutableRefObject<Record<string, HTMLIFrameElement | null>>;
  onFrameLoad: (token: string) => void;
}

const PreviewSlots = ({
  frames,
  sandbox,
  viewport,
}: {
  frames: SlotFrames;
  sandbox?: string;
  viewport: { width: number; height: number };
}): ReactElement[] =>
  frames.slots.map((slot) => {
    let part: "front" | "back" = "back";

    if (slot.token === frames.frontToken) {
      part = "front";
    }

    return (
      <iframe
        key={slot.token}
        ref={(el) => {
          frames.elements.current[slot.token] = tagFrame(el, slot.token);
        }}
        title={copy.designPreview}
        className={`frame ${part}`}
        src={slot.src}
        onLoad={() => frames.onFrameLoad(slot.token)}
        sandbox={sandbox}
        width={viewport.width}
        height={viewport.height}
      />
    );
  });

const OtherFrames = ({
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
}): ReactElement[] => {
  const step = useLive(steps);
  const entries = useRef(new Map<string, PassiveEntry>());
  const live = entries.current;
  live.clear();

  return frames
    .filter((canvasFrame) => canvasFrame.id !== active.id)
    .map((canvasFrameValue) => {
      const slot = passive.slots.find(
        (item) => item.id === canvasFrameValue.id
      );

      const did = slot?.directionId ?? null;
      const wait = waiting(canvasFrameValue.path, did);

      let nextSrc2: string | null = slot?.nextSrc ?? null;

      if (wait) {
        nextSrc2 = null;
      }

      const pending2: { missing: boolean; step: string | null } | undefined =
        ((): { missing: boolean; step: string | null } | undefined => {
          if (!wait) {
            return undefined;
          }

          return {
            missing: wait === "missing",
            step: step ?? null,
          };
        })();

      let src2: string | null = slot?.src ?? null;

      if (wait) {
        src2 = null;
      }

      live.set(canvasFrameValue.id, {
        frame: canvasFrameValue,
        frameRef: (el) => {
          if (slot) {
            passive.elements.current[slot.token] = tagFrame(el, slot.token);
          }
        },
        label: labelProps(canvasFrameValue, did),
        nextSrc: nextSrc2,
        offset: active,
        onNextLoad: passive.onSwapDone,
        pending: pending2,
        register,
        sandbox,
        src: src2,
      });

      let result: string | null = null;

      if (wait) {
        result = step;
      }

      const sig = JSON.stringify([
        canvasFrameValue,
        wait,
        result,
        slot?.src ?? null,
        slot?.nextSrc ?? null,
        slot?.token ?? null,
        sandbox ?? null,
        active.x,
        active.y,
        labelProps.sig(canvasFrameValue, did),
      ]);

      return (
        <StablePassiveFrame
          key={canvasFrameValue.id}
          id={canvasFrameValue.id}
          sig={sig}
          entries={entries}
        />
      );
    });
};

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

const LiveOverlay = ({
  hover,
  picked,
  commenting,
  picking,
  resize,
  selection,
  ...rest
}: LiveOverlayProps): ReactElement => {
  const box = useLive(hover);

  let argument: LiveStore<SelectionContext[] | null> = picked;

  if (commenting) {
    argument = NO_PICK;
  }

  const early = useLive(argument);

  return (
    <ArtboardOverlay
      {...rest}
      selection={early ?? selection}
      hover={overlayHover(box, picking)}
      resize={useResizeLive(resize)}
    />
  );
};

const StepCover = ({
  steps,
  ...rest
}: Omit<ComponentProps<typeof FirstBuildCover>, "step"> & {
  steps: LiveStore<string | null>;
}): ReactElement => <FirstBuildCover {...rest} step={useLive(steps)} />;

const FreeMoveSlot = ({
  view,
}: {
  view: LiveStore<FreeMoveView | null>;
}): ReactElement => <FreeMoveLayer view={useLive(view)} />;

const CheckResults = ({
  projectId,
  check,
}: {
  projectId: string;
  check: ReturnType<typeof useRenderCheck>;
}): ReactElement | null => {
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
};

export {
  CheckResults,
  FreeMoveSlot,
  LiveOverlay,
  OtherFrames,
  PreviewSlots,
  StageMessage,
  StepCover,
};
