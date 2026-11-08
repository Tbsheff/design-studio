import type {
  FigmaImportPreview,
  FigmaImportRequest,
  FigmaImportResult,
  FigmaImportSource,
} from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";
import { useCallback, useTransition } from "react";
import type { FormEvent } from "react";

import { json } from "../../api.js";
import { toFailureMessage } from "./figma-failure-message.js";
import { toImportMessage, toRoute } from "./figma-import-model.js";
import type { FigmaPreviewIds } from "./use-figma-preview.js";

interface FigmaSubmitInput {
  readonly base: FigmaImportSource;
  readonly ids: FigmaPreviewIds;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly position: JsxInsertPosition;
  readonly preview: FigmaImportPreview | null;
  readonly setFailure: (failure: string | null) => void;
  readonly target: InsertTarget;
}

interface FigmaSubmit {
  readonly handleSubmit: (event: FormEvent) => void;
  readonly isPending: boolean;
}

const toAddedCount = (result: FigmaImportResult): number =>
  result.imports.filter((entry) => entry.added).length;

const useFigmaSubmit = (input: FigmaSubmitInput): FigmaSubmit => {
  const { base, ids, onClose, onDone, position, preview, setFailure, target } =
    input;

  const [isPending, startTransition] = useTransition();

  const handleSubmit = useCallback(
    (event: FormEvent): void => {
      event.preventDefault();

      if (isPending || !preview) {
        return;
      }

      const body: FigmaImportRequest = {
        ...base,
        nodeId: preview.frame.id,
        position,
        target,
      };

      startTransition(async () => {
        try {
          const result = await json<FigmaImportResult>(
            "POST",
            toRoute(ids),
            body
          );

          const components = result.stats.kit.map((use) => use.component);

          onDone(
            toImportMessage(result.frame.name, components, toAddedCount(result))
          );
          onClose();
        } catch (error) {
          setFailure(toFailureMessage(error as Error));
        }
      });
    },
    [
      base,
      ids,
      isPending,
      onClose,
      onDone,
      position,
      preview,
      setFailure,
      target,
    ]
  );

  return { handleSubmit, isPending };
};

export { useFigmaSubmit };

export type { FigmaSubmitInput };
