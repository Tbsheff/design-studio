import type { SourceLoc } from "@design-studio/contracts";
import type { CanvasFile } from "@design-studio/contracts/canvas-file";
import type {
  BlendMode,
  BlendProperty,
  FillType,
  RadialForm,
} from "@design-studio/contracts/fill";
import type {
  EntrancePreset,
  MotionKind,
  MotionState,
} from "@design-studio/contracts/motion";
import type {
  SpacingInfo,
  SpacingProperty,
  SpacingSide,
} from "@design-studio/contracts/spacing";

interface CanvasSnapshot {
  directionId: string;
  canvas: CanvasFile | null;
  hash: string | null;
}

interface TextStyleTargetBody {
  selector?: string;
  source: SourceLoc;
  tag?: string;
}

interface MotionSpecBody {
  kind: MotionKind;
  delayMs?: number;
  durationMs?: number;
  easing?: string;
  end?: Record<string, string>;
  preset?: EntrancePreset;
  properties?: string[];
  staggerMs?: number;
  state?: MotionState;
}

interface FillStopBody {
  color?: string;
  position?: number;
  token?: string;
}

interface FillInputBody {
  type: FillType;
  angle?: number;
  at?: string;
  blendMode?: BlendMode;
  blendProperty?: BlendProperty;
  color?: string;
  form?: RadialForm;
  stops?: FillStopBody[];
  token?: string;
}

interface FillSetBody {
  fill: FillInputBody;
  target: TextStyleTargetBody;
}

interface SpacingStep {
  px: number;
  token: string;
}

interface SpacingBox extends SpacingInfo {
  scale: SpacingStep[];
}

interface SpacingComputed {
  gap: string;
  margin: string;
  padding: string;
}

interface SpacingSetBody {
  spacing: {
    property: SpacingProperty;
    side: SpacingSide;
    snap?: boolean;
    token?: string;
    value?: number;
  };
  target: TextStyleTargetBody;
}

interface MotionSetBody {
  spec: MotionSpecBody;
  target: TextStyleTargetBody;
}

interface TextStyleApplyBody {
  style: string;
  target: TextStyleTargetBody;
}

interface TextStyleCreateBody {
  name: string;
  styles: Record<string, string>;
}

interface TextStyleDetachBody {
  styles: Record<string, string>;
  target: TextStyleTargetBody;
}

export type {
  CanvasSnapshot,
  FillInputBody,
  FillSetBody,
  FillStopBody,
  MotionSetBody,
  MotionSpecBody,
  SpacingBox,
  SpacingComputed,
  SpacingSetBody,
  SpacingStep,
  TextStyleApplyBody,
  TextStyleCreateBody,
  TextStyleDetachBody,
  TextStyleTargetBody,
};
