import { Suspense } from "react";
import type { ReactElement } from "react";

import { toSlotLayout } from "./device-frame-model.js";
import type { CommentNodeInput } from "./play-comment-model.js";
import type { Slot } from "./play-model.js";

const toCommentNode = (
  input: CommentNodeInput,
  slot: Slot
): ReactElement | null => {
  const { options } = input;
  const { Layer } = options;
  const { frame } = slot;
  const { onExit } = input;
  const isActive = slot.token === input.frontToken;

  const layout = toSlotLayout(
    slot,
    input.stage,
    input.device,
    input.orientation
  );

  return (
    <Suspense fallback={null}>
      <Layer
        control={options.control}
        elements={input.elements}
        frame={frame}
        frames={input.frames}
        height={layout.viewHeight}
        isActive={isActive}
        isOn={isActive && input.isOn}
        kind={input.kind}
        onExit={onExit}
        scale={layout.scale}
        src={slot.src}
        token={slot.token}
        tools={options.toTools(frame.path ?? "")}
        width={layout.viewWidth}
      />
    </Suspense>
  );
};

export { toCommentNode };
