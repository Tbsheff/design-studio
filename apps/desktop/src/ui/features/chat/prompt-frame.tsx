import { useCallback } from "react";
import type { DragEvent, ReactElement, ReactNode } from "react";

import { toDropClass } from "./prompt-send-model.js";
import type { PromptBase } from "./use-prompt-base.js";
import type { PromptInput } from "./use-prompt-input.js";

const PromptFrame = ({
  base,
  input,
  children,
}: {
  base: PromptBase;
  input: PromptInput;
  children: ReactNode;
}): ReactElement => {
  const { addFiles, isDragging, promptRef, setIsDragging } = base;
  const { onKeyCapture } = input;

  const onDragOver = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      setIsDragging(true);
    },
    [setIsDragging]
  );

  const onDragLeave = useCallback(
    (): void => setIsDragging(false),
    [setIsDragging]
  );

  const onDrop = useCallback(
    (event: DragEvent): void => {
      event.preventDefault();
      setIsDragging(false);
      addFiles([...event.dataTransfer.files]);
    },
    [addFiles, setIsDragging]
  );

  return (
    <div
      ref={promptRef}
      className={toDropClass(isDragging, "prompt")}
      data-ai-scope=""
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onKeyDownCapture={onKeyCapture}
    >
      {children}
    </div>
  );
};

export { PromptFrame };
