import { useCallback, useState, useTransition } from "react";

import { copy } from "./copy.js";
import { call, markupRoutes, useAction, workspaceRoutes } from "./deps.js";
import type { CommentPrefill } from "./deps.js";
import { toMarkupBoxes } from "./markup-model.js";
import type { MarkupStroke } from "./markup-model.js";
import { toMarkupImage } from "./markup-paint.js";
import { toMarkupPrefill } from "./markup-prefill-model.js";

interface MarkupTarget {
  readonly directionId: string;
  readonly frameId: string;
  readonly height: number;
  readonly projectId: string;
  readonly width: number;
}

interface MarkupSend {
  readonly failure: string | null;
  readonly handleSend: (strokes: readonly MarkupStroke[]) => void;
  readonly isPending: boolean;
}

const useMarkupSend = (
  target: MarkupTarget,
  onDone: (prefill: CommentPrefill) => void
): MarkupSend => {
  const [failure, setFailure] = useState<string | null>(null);
  const [isPending, startSend] = useTransition();
  const { error, run } = useAction(markupRoutes.createMarkup);

  const handleSend = useCallback(
    (strokes: readonly MarkupStroke[]): void => {
      startSend(async () => {
        try {
          const shot = await call(workspaceRoutes.getScreenshotWorkspace, {
            directionId: target.directionId,
            frameId: target.frameId,
            projectId: target.projectId,
          });

          const picture = await toMarkupImage(shot, target, strokes);

          const result = await run({
            boxes: toMarkupBoxes(strokes),
            directionId: target.directionId,
            frameId: target.frameId,
            image: picture.image,
            projectId: target.projectId,
          });

          if (result) {
            setFailure(null);
            onDone(toMarkupPrefill(result, picture.dataUrl));
          }
        } catch {
          setFailure(copy.sendFailed);
        }
      });
    },
    [onDone, run, target]
  );

  let message = failure;

  if (message === null && error) {
    message = copy.sendFailed;
  }

  return { failure: message, handleSend, isPending };
};

export { useMarkupSend };

export type { MarkupSend, MarkupTarget };
