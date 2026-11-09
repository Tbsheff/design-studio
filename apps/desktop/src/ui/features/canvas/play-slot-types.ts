import type {
  DeviceFrameId,
  DeviceOrientation,
} from "@design-studio/contracts/device-frame";

import type { Rect } from "./hotspot-model.js";
import type { CommentNodeInput } from "./play-comment-model.js";
import type { Slot, StageSize } from "./play-model.js";

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
  readonly comment: CommentNodeInput | null;
}

export type { BaseSlotsProps, BindFrame };
