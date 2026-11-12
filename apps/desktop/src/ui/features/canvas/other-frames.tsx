import type { ReactElement } from "react";

import { tagFrame } from "../../platform/bridge.js";
import { useLive } from "../../platform/live-store.js";
import type { LiveStore } from "../../platform/live-store.js";
import type { CanvasFrame } from "./canvas-frames-model.js";
import type { FrameLiveSources } from "./frame-still-model.js";
import { StablePassiveFrame } from "./stable-passive-frame.js";
import type { StageWait as PageWait } from "./stage-wait-model.js";
import type { DirectionFrames, PassiveSlot } from "./use-direction-frames.js";
import type { useFrameLabels } from "./use-frame-labels.js";
import { useFrameLiveSources } from "./use-frame-live.js";
import { usePassiveEntries } from "./use-passive-entries.js";
import type { PassiveEntry } from "./use-passive-entries.js";

type FrameLabels = ReturnType<typeof useFrameLabels>;

interface OtherFramesProps {
  readonly frames: CanvasFrame[];
  readonly active: CanvasFrame;
  readonly passive: DirectionFrames;
  readonly sandbox?: string;
  readonly labelProps: FrameLabels;
  readonly register: (id: string, el: HTMLDivElement | null) => void;
  readonly waiting: (
    path: string | undefined,
    directionId: string | null
  ) => PageWait;
  readonly steps: LiveStore<string | null>;
  readonly projectId: string;
  readonly zoomPercent: LiveStore<number>;
}

interface PassiveContext {
  readonly active: CanvasFrame;
  readonly passive: DirectionFrames;
  readonly sandbox?: string;
  readonly labelProps: FrameLabels;
  readonly register: OtherFramesProps["register"];
  readonly step: string | null | undefined;
  readonly projectId: string;
  readonly sources: FrameLiveSources;
}

const toPending = (
  wait: PageWait,
  step: string | null | undefined
): PassiveEntry["pending"] => {
  if (wait) {
    return { missing: wait === "missing", step: step ?? null };
  }
};

const toWaitedValue = (wait: PageWait, value: string | null): string | null => {
  if (wait) {
    return null;
  }

  return value;
};

const toWaitStep = (
  wait: PageWait,
  step: string | null | undefined
): string | null => {
  if (wait) {
    return step ?? null;
  }

  return null;
};

const toEntry = (
  context: PassiveContext,
  frame: CanvasFrame,
  slot: PassiveSlot | undefined,
  wait: PageWait
): PassiveEntry => {
  const { active, passive, sandbox, labelProps, register, step } = context;
  const { projectId, sources } = context;
  const did = slot?.directionId ?? null;

  const frameRef = (el: HTMLIFrameElement | null): void => {
    if (slot) {
      passive.elements.current[slot.token] = tagFrame(el, slot.token);
    }
  };

  const label = labelProps(frame, did);
  const nextSrc = toWaitedValue(wait, slot?.nextSrc ?? null);
  const offset = active;
  const { onSwapDone: onNextLoad } = passive;
  const pending = toPending(wait, step);
  const src = toWaitedValue(wait, slot?.src ?? null);

  return {
    frame,
    frameRef,
    label,
    nextSrc,
    offset,
    onNextLoad,
    pending,
    projectId,
    register,
    sandbox,
    sources,
    src,
  };
};

const toSignature = (
  context: PassiveContext,
  frame: CanvasFrame,
  slot: PassiveSlot | undefined,
  wait: PageWait
): string => {
  const { active, sandbox, labelProps, step, projectId } = context;
  const did = slot?.directionId ?? null;

  return JSON.stringify([
    frame,
    wait,
    toWaitStep(wait, step),
    slot?.src ?? null,
    slot?.nextSrc ?? null,
    slot?.token ?? null,
    sandbox ?? null,
    active.x,
    active.y,
    labelProps.sig(frame, did),
    projectId,
  ]);
};

const OtherFrames = ({
  frames,
  active,
  passive,
  sandbox,
  labelProps,
  register,
  waiting,
  steps,
  projectId,
  zoomPercent,
}: OtherFramesProps): ReactElement => {
  const step = useLive(steps);
  const sources = useFrameLiveSources(zoomPercent);
  const { entries, reset } = usePassiveEntries();
  const live = reset();

  const context: PassiveContext = {
    active,
    labelProps,
    passive,
    projectId,
    register,
    sandbox,
    sources,
    step,
  };

  const slotById = new Map(passive.slots.map((item) => [item.id, item]));
  const nodes: ReactElement[] = [];

  for (const frame of frames) {
    if (frame.id !== active.id) {
      const slot = slotById.get(frame.id);
      const wait = waiting(frame.path, slot?.directionId ?? null);
      live.set(frame.id, toEntry(context, frame, slot, wait));

      nodes.push(
        <StablePassiveFrame
          key={frame.id}
          id={frame.id}
          sig={toSignature(context, frame, slot, wait)}
          entries={entries}
        />
      );
    }
  }

  return <div className="passive-frames">{nodes}</div>;
};

export { OtherFrames };
