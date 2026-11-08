import type { FigmaImportSource } from "@design-studio/contracts/figma-nodes";
import { looksLikeFigmaLink } from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";
import { useCallback, useState } from "react";
import type { FormEvent } from "react";

import { pick } from "./pick.js";
import { useFigmaPreview } from "./use-figma-preview.js";
import type { FigmaPreview, FigmaPreviewIds } from "./use-figma-preview.js";
import { useFigmaSubmit } from "./use-figma-submit.js";

interface FigmaImportInput {
  readonly canNest: boolean;
  readonly ids: FigmaPreviewIds;
  readonly onClose: () => void;
  readonly onDone: (message: string) => void;
  readonly target: InsertTarget;
  readonly text: string;
}

interface FigmaImportFlow extends FigmaPreview {
  readonly base: FigmaImportSource;
  readonly dismiss: () => boolean;
  readonly handleNodeChange: (nodeId: string) => void;
  readonly handlePositionChange: (position: JsxInsertPosition) => void;
  readonly handleSubmit: (event: FormEvent) => void;
  readonly handleUseNodes: (nodes: string) => void;
  readonly isPending: boolean;
  readonly nodeId: string;
  readonly position: JsxInsertPosition;
}

const toInitialSource = (text: string): FigmaImportSource => {
  if (looksLikeFigmaLink(text)) {
    return { link: text.trim() };
  }

  return { nodes: text };
};

const useFigmaImport = (input: FigmaImportInput): FigmaImportFlow => {
  const { canNest, ids, onClose, onDone, target, text } = input;

  const [base, setBase] = useState<FigmaImportSource>(() =>
    toInitialSource(text)
  );

  const [nodeId, setNodeId] = useState("");

  const [position, setPosition] = useState<JsxInsertPosition>(() =>
    pick(canNest, "inside", "after")
  );

  const previewState = useFigmaPreview({ base, ids, nodeId, position, target });
  const { preview, setFailure } = previewState;

  const { handleSubmit, isPending } = useFigmaSubmit({
    base,
    ids,
    onClose,
    onDone,
    position,
    preview,
    setFailure,
    target,
  });

  const dismiss = useCallback((): boolean => {
    if (isPending) {
      return false;
    }

    onClose();

    return true;
  }, [isPending, onClose]);

  const handleUseNodes = useCallback(
    (nodes: string): void => {
      setFailure(null);
      setBase({ nodes });
    },
    [setFailure]
  );

  return {
    ...previewState,
    base,
    dismiss,
    handleNodeChange: setNodeId,
    handlePositionChange: setPosition,
    handleSubmit,
    handleUseNodes,
    isPending,
    nodeId,
    position,
  };
};

export { useFigmaImport };

export type { FigmaImportFlow, FigmaImportInput };
