import { useRef } from "react";
import type { ReactElement } from "react";

import { copy } from "./copy.js";
import { frameTitle } from "./frame-label-model.js";
import { HotspotFlash } from "./hotspot-flash.js";
import { PlayBar } from "./play-bar.js";
import { PlayCommentButton } from "./play-comment-button.js";
import { toCommentNode } from "./play-comment-nodes.js";
import { overlayOf, playHint, slotStyle, toShownFrame } from "./play-model.js";
import type { PlayModeProps, Slot } from "./play-model.js";
import type { BaseSlotsProps } from "./play-slot-types.js";
import { SlotView } from "./play-slot-view.js";
import { useFocusReturn } from "./use-focus-return.js";
import { usePlayCommentMode } from "./use-play-comment-mode.js";
import { usePlayDevice } from "./use-play-device.js";
import { usePlaySlotProps } from "./use-play-slot-props.js";
import { usePlayTheme } from "./use-play-theme.js";
import { usePlay } from "./use-play.js";
import type { PlayState } from "./use-play.js";
import { useStageSize } from "./use-stage-size.js";

const toLayerKey = (props: BaseSlotsProps): string => {
  if (props.isHeld) {
    return "held";
  }

  return `flash-${props.flashCount}`;
};

const toFlashNode = (
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

const toHotspotNode = (
  props: BaseSlotsProps,
  slot: Slot
): ReactElement | null => {
  const flash = toFlashNode(props, slot);
  const comment = props.comment && toCommentNode(props.comment, slot);

  if (!flash && !comment) {
    return null;
  }

  return (
    <>
      {flash}
      {comment}
    </>
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

const isBackdropLocked = (overlay: Slot): boolean =>
  overlay.popover !== null && !overlay.popover.isOutsideClose;

const toOverlayClass = (overlay: Slot): string => {
  if (overlay.overlay === "popover") {
    return `play-overlay is-popover ${overlay.phase}`;
  }

  return `play-overlay ${overlay.phase}`;
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
    <div className={toOverlayClass(overlay)} style={slotStyle(overlay)}>
      <button
        type="button"
        className="play-backdrop"
        aria-label={copy.closeOverlay}
        data-testid="play-backdrop"
        disabled={isBackdropLocked(overlay)}
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
  const stageRef = useRef<HTMLDivElement>(null);
  const mode = usePlayCommentMode(props.playComment !== null);
  const play = usePlay(props, stageRef);

  const { device, onDevice, onRotate, orientation } = usePlayDevice(
    props.projectId
  );

  const stage = useStageSize();
  const root = useRef<HTMLDialogElement>(null);

  useFocusReturn(root, props.onRestoreFocus);
  const overlay = overlayOf(play.slots);
  const shown = toShownFrame(play.slots);
  const { back: onBack, closeOverlay: onCloseOverlay } = play;
  const { restart: onRestart } = play;
  const { onClose: onExit } = props;
  const { toggle: onToggleComment } = mode;

  const { isHints, onHints, slotProps } = usePlaySlotProps({
    device,
    mode,
    orientation,
    play,
    props,
    stage,
  });

  const { elements, slots } = play;
  const theme = usePlayTheme({ elements, props, slots });

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
        isHints={isHints}
        theme={theme}
        onHints={onHints}
        onDevice={onDevice}
        onRotate={onRotate}
        onBack={onBack}
        onRestart={onRestart}
        onExit={onExit}
      />
      {toErrorNode(play.error)}
      <div ref={stageRef} className="play-stage">
        {toBaseNodes(slotProps)}
        {toOverlayNode(overlay, slotProps, onCloseOverlay)}
        {props.playComment && (
          <PlayCommentButton isOn={mode.isOn} onToggle={onToggleComment} />
        )}
      </div>
    </dialog>
  );
};

export { PlayMode };
