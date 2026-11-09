import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";
import { useRef } from "react";
import type { ReactElement } from "react";

import { tagFrame } from "../../platform/bridge.js";
import { copy } from "./copy.js";
import { frameTitle } from "./frame-label-model.js";
import { HotspotFlash } from "./hotspot-flash.js";
import type { Rect } from "./hotspot-model.js";
import { PlayBar } from "./play-bar.js";
import {
  baseOf,
  overlayOf,
  playHint,
  slotStyle,
  toShownFrame,
} from "./play-model.js";
import type { PlayModeProps, Slot, StageSize } from "./play-model.js";
import { SlotView } from "./play-slot-view.js";
import { useFocusReturn } from "./use-focus-return.js";
import { useHotspotHints } from "./use-hotspot-hints.js";
import { usePlayDevice } from "./use-play-device.js";
import { usePlay } from "./use-play.js";
import type { PlayState } from "./use-play.js";
import { useStageSize } from "./use-stage-size.js";

type BindFrame = (token: string) => (el: HTMLIFrameElement | null) => void;

interface BaseSlotsProps {
  readonly base: Slot[];
  readonly stage: StageSize;
  readonly device: DeviceFrameId | null;
  readonly orientation: DeviceOrientation;
  readonly sandbox?: string;
  readonly bind: BindFrame;
  readonly spots: Readonly<Record<string, readonly Rect[]>>;
  readonly isHeld: boolean;
  readonly flashCount: number;
}

const toLayerKey = (props: BaseSlotsProps): string => {
  if (props.isHeld) {
    return "held";
  }

  return `flash-${props.flashCount}`;
};

const toHotspotNode = (
  props: BaseSlotsProps,
  slot: Slot
): ReactElement | null => {
  const rects = props.spots[slot.token];

  if (!rects || rects.length === 0) {
    return null;
  }

  return (
    <HotspotFlash key={toLayerKey(props)} isHeld={props.isHeld} rects={rects} />
  );
};

const isLeavingSlot = (slot: Slot, current: Slot | undefined): boolean =>
  slot !== current && current?.phase === "run";

const toBaseNodes = (props: BaseSlotsProps): ReactElement[] => {
  const { base, stage, device, orientation, sandbox, bind } = props;
  const current = base.at(-1);

  return base.map((slot) => {
    const isLeaving = isLeavingSlot(slot, current);
    const timing = (isLeaving && current) || slot;

    return (
      <SlotView
        key={slot.key}
        hotspots={toHotspotNode(props, slot)}
        slot={slot}
        isLeaving={isLeaving}
        timing={timing}
        stage={stage}
        device={device}
        orientation={orientation}
        sandbox={sandbox}
        bind={bind(slot.token)}
      />
    );
  });
};

const toErrorNode = (message: string | null): ReactElement | null => {
  if (!message) {
    return null;
  }

  return <output className="play-error">{message}</output>;
};

const toOverlayNode = (
  overlay: Slot | null,
  props: BaseSlotsProps,
  onClose: () => void
): ReactElement | null => {
  if (!overlay) {
    return null;
  }

  const { bind, sandbox, stage } = props;

  return (
    <div className={`play-overlay ${overlay.phase}`} style={slotStyle(overlay)}>
      <button
        type="button"
        className="play-backdrop"
        aria-label={copy.closeOverlay}
        data-testid="play-backdrop"
        onClick={onClose}
      />
      <SlotView
        hotspots={toHotspotNode(props, overlay)}
        slot={overlay}
        isLeaving={false}
        timing={overlay}
        stage={stage}
        device={null}
        orientation="portrait"
        sandbox={sandbox}
        bind={bind(overlay.token)}
      />
    </div>
  );
};

const toBackDisabled = (play: PlayState, hasOverlay: boolean): boolean =>
  play.history.length < 2 && !hasOverlay;

const toTitle = (
  shown: ReturnType<typeof toShownFrame>,
  props: PlayModeProps
): string => {
  if (shown) {
    return frameTitle(shown, props.frames);
  }

  return copy.loading;
};

const PlayMode = (props: PlayModeProps): ReactElement => {
  const play = usePlay(props);
  const { device, onDevice, onRotate, orientation } = usePlayDevice(
    props.projectId
  );

  const stage = useStageSize();
  const root = useRef<HTMLDialogElement>(null);

  useFocusReturn(root, props.onRestoreFocus);
  const base = baseOf(play.slots);
  const overlay = overlayOf(play.slots);
  const shown = toShownFrame(play.slots);

  const {
    back: onBack,
    closeOverlay: onCloseOverlay,
    restart: onRestart,
  } = play;

  const { elements } = play;
  const { onClose: onExit, sandbox } = props;

  const bind: BindFrame = (token) => (el) => {
    elements.current[token] = tagFrame(el, token);
  };

  const hints = useHotspotHints({
    elements,
    props,
    slots: play.slots,
  });

  const { flashCount, isEnabled, isHeld, setEnabled: onHints, spots } = hints;

  const slotProps = {
    base,
    bind,
    device,
    flashCount,
    isHeld,
    orientation,
    sandbox,
    spots,
    stage,
  };

  return (
    <dialog
      ref={root}
      open
      className="present-layer play-layer"
      aria-modal="true"
      aria-label={copy.playPrototype}
      tabIndex={-1}
      data-testid="play-layer"
    >
      <PlayBar
        title={toTitle(shown, props)}
        hint={playHint(props, overlay !== null, shown)}
        isBackDisabled={toBackDisabled(play, overlay !== null)}
        device={device}
        orientation={orientation}
        isHints={isEnabled}
        onHints={onHints}
        onDevice={onDevice}
        onRotate={onRotate}
        onBack={onBack}
        onRestart={onRestart}
        onExit={onExit}
      />
      {toErrorNode(play.error)}
      <div className="play-stage">
        {toBaseNodes(slotProps)}
        {toOverlayNode(overlay, slotProps, onCloseOverlay)}
      </div>
    </dialog>
  );
};

export { PlayMode };
