import { routes } from "@design-studio/actions/canvas/routes";
import { useCallback, useState, useTransition } from "react";

import { call } from "../../platform/http.js";
import { copy } from "./copy.js";
import {
  isHtmlKind,
  toGhostBox,
  toLinkedLabel,
  toPromptOrNull,
} from "./linked-frame-model.js";
import type { LinkedDragEnd, LinkedDrop } from "./linked-frame-model.js";
import type { PrototypeOptions } from "./prototype-options-model.js";

interface LinkedFrameControl {
  readonly drop: LinkedDrop | null;
  readonly isPending: boolean;
  readonly onCancel: () => void;
  readonly onDrop: (end: LinkedDragEnd) => void;
  readonly onSubmit: (prompt: string) => void;
}

type LinkedFrameOptions = Pick<
  PrototypeOptions,
  "active" | "directionId" | "frames" | "kind" | "notify" | "projectId"
>;

const useLinkedFrame = (options: LinkedFrameOptions): LinkedFrameControl => {
  const [drop, setDrop] = useState<LinkedDrop | null>(null);
  const [isPending, startTransition] = useTransition();
  const { active, frames, kind, notify } = options;

  const onDrop = useCallback(
    (end: LinkedDragEnd): void => {
      if (!isHtmlKind(kind)) {
        notify(copy.linkedFrameAppNote);

        return;
      }

      setDrop({ ...end, ghost: toGhostBox(end.host, frames, active) });
    },
    [active, frames, kind, notify]
  );

  const onCancel = useCallback((): void => setDrop(null), []);

  const onSubmit = useCallback(
    (prompt: string): void => {
      if (drop === null) {
        return;
      }

      const { selection } = drop;

      const create = async (): Promise<void> => {
        try {
          await call(routes.createLinkedFrameCanvas, {
            directionId: options.directionId,
            fromFrame: active.id,
            label: toLinkedLabel(selection),
            path: null,
            projectId: options.projectId,
            prompt: toPromptOrNull(prompt),
            selector: selection.selector,
            shouldStartRun: true,
          });
          setDrop(null);
        } catch (error) {
          if (error instanceof Error) {
            notify(error.message);
          } else {
            notify(copy.linkedFrameFailed);
          }
        }
      };

      startTransition(create);
    },
    [active.id, drop, notify, options.directionId, options.projectId]
  );

  return { drop, isPending, onCancel, onDrop, onSubmit };
};

export { useLinkedFrame };

export type { LinkedFrameControl };
