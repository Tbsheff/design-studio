import type { PrototypeLink } from "@design-studio/contracts/links";

import type { CanvasFrame } from "./canvas-frames-model.js";
import type { PlayContext } from "./play-controller.js";
import { toPopoverPosition, toPopoverScale } from "./play-model.js";
import type { PopoverBox, PopoverSlot } from "./play-model.js";

const toSourceBox = (
  ctx: PlayContext,
  link: PrototypeLink
): PopoverBox | null => {
  const source = ctx.slots.current.at(-1);
  const element = source && ctx.elements.current[source.token];
  const stage = ctx.stage.current;
  const rect = source && ctx.rects.current.get(source.token)?.get(link.id);

  if (!element || !stage || !rect || element.offsetWidth === 0) {
    return null;
  }

  const frame = element.getBoundingClientRect();
  const area = stage.getBoundingClientRect();
  const scale = frame.width / element.offsetWidth;

  return {
    height: rect.height * scale,
    left: frame.left - area.left + rect.x * scale,
    top: frame.top - area.top + rect.y * scale,
    width: rect.width * scale,
  };
};

const toSourceScale = (ctx: PlayContext): number => {
  const source = ctx.slots.current.at(-1);
  const element = source && ctx.elements.current[source.token];

  if (!element || element.offsetWidth === 0) {
    return 1;
  }

  return element.getBoundingClientRect().width / element.offsetWidth;
};

const toPopoverSlot = (
  ctx: PlayContext,
  link: PrototypeLink,
  frame: CanvasFrame
): PopoverSlot => {
  const area = ctx.stage.current?.getBoundingClientRect();
  const stage = { height: area?.height ?? 0, width: area?.width ?? 0 };
  const scale = toPopoverScale(frame, toSourceScale(ctx), stage);

  const anchor = toSourceBox(ctx, link) ?? {
    height: 0,
    left: stage.width / 2,
    top: stage.height / 2,
    width: 0,
  };

  const placement = link.placement ?? "bottom-start";
  const size = { height: frame.height * scale, width: frame.width * scale };
  const { left, top } = toPopoverPosition({ anchor, placement, size, stage });

  return { isOutsideClose: link.isOutsideClose !== false, left, scale, top };
};

export { toPopoverSlot };
