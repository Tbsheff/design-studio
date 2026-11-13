import type { SelectionContext } from "@design-studio/contracts";

import type { CanvasFrame } from "./canvas-frames-model.js";
import { FrameLabelExtras } from "./frame-label-extras.js";
import {
  toLiveMenuItems,
  toPagesLoader,
  toTitle,
  toVariation,
  toDirectionName,
} from "./frame-label-state.js";
import type { GetLive, LabelState } from "./frame-label-state.js";
import type { LabelProps } from "./frame-label.js";
import { SameAsDefaultNote } from "./same-as-default-note.js";
import type { FrameVariation } from "./variation-model.js";

const toBadge = (
  input: LabelState,
  variation: FrameVariation,
  did: string | null
): LabelProps["badge"] => ({
  current: did === input.directionId,
  label: variation.label,
  title: variation.title,
});

const toNumber = (
  input: LabelState,
  frame: CanvasFrame,
  variation: FrameVariation | undefined
): string => {
  if (variation) {
    return `1${variation.label.toLowerCase()}`;
  }

  const index = input.frames.layout.frames.findIndex(
    (canvasFrame) => canvasFrame.id === frame.id
  );

  return String(index + 1);
};

const toActiveElement = (
  isActive: boolean,
  element: SelectionContext | null
): SelectionContext | null => {
  if (isActive) {
    return element;
  }

  return null;
};

const toFrameLabel = (
  input: LabelState,
  getLive: GetLive,
  frame: CanvasFrame,
  did: string | null
): LabelProps => {
  const variation = toVariation(input, did);
  const isActive = frame.id === input.activeId;
  const title = toTitle(input, frame, did);
  const element = input.selection[0] ?? null;
  const number = toNumber(input, frame, variation);

  const extras = (
    <FrameLabelExtras
      frame={frame}
      did={did}
      variation={variation}
      isActive={isActive}
      element={toActiveElement(isActive, element)}
      hasRoutes={Boolean(input.appPages)}
      listPages={toPagesLoader(input, getLive, did)}
      items={toLiveMenuItems(input, getLive, frame, did)}
      getLive={getLive}
      projectId={input.projectId}
    />
  );

  const label: LabelProps = {
    ...input.baseLabel(frame),
    directionId: did,
    extras,
    note: <SameAsDefaultNote projectId={input.projectId} frameId={frame.id} />,
    number,
  };

  if (variation) {
    label.badge = toBadge(input, variation, did);
  }

  if (title !== null) {
    label.title = title;
  }

  return label;
};

export { toDirectionName, toFrameLabel };
