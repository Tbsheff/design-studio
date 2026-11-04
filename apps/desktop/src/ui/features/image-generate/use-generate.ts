import { useCallback, useMemo, useState } from "react";

import { copy } from "./copy.js";
import { imageRoutes, imageTargetOf, useAction } from "./deps.js";
import type { SelectionContext } from "./deps.js";
import type { Aspect, Style, Variant } from "./generate-model.js";
import { useVariants } from "./use-variants.js";

interface GenerateSetup {
  readonly directionId: string;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

interface Generate {
  readonly aspect: Aspect;
  readonly error: Error | null;
  readonly handleAspect: (value: Aspect) => void;
  readonly handleGenerate: () => void;
  readonly handlePrompt: (value: string) => void;
  readonly handleStyle: (value: Style) => void;
  readonly handleUse: (variant: Variant) => void;
  readonly isMock: boolean;
  readonly isPending: boolean;
  readonly prompt: string;
  readonly style: Style;
  readonly variants: readonly Variant[];
}

const useGenerate = (setup: GenerateSetup): Generate => {
  const { directionId, onDone, projectId, target } = setup;
  const create = useAction(imageRoutes.createImage);
  const status = useAction(imageRoutes.inspectImage, { projectId });
  const [prompt, setPrompt] = useState("");
  const [aspect, setAspect] = useState<Aspect>("square");
  const [style, setStyle] = useState<Style>("photo");
  const { run } = create;

  const { handleGenerate, variants } = useVariants(run, {
    aspect,
    directionId,
    projectId,
    prompt,
    style,
  });

  const handleUse = useCallback(
    (variant: Variant): void => {
      const layer = imageTargetOf(target);
      const reuse = variant.asset;

      const place = async (): Promise<void> => {
        const done = await run({
          aspect,
          directionId,
          layer,
          projectId,
          prompt,
          reuse,
          style,
        });

        if (done !== null) {
          onDone(copy.placed);
        }
      };

      place();
    },
    [aspect, directionId, onDone, projectId, prompt, run, style, target]
  );

  const isMock = status.data?.isMock ?? false;
  const handleAspect = setAspect;
  const handlePrompt = setPrompt;
  const handleStyle = setStyle;
  const { error, pending: isPending } = create;

  return useMemo(
    () => ({
      aspect,
      error,
      handleAspect,
      handleGenerate,
      handlePrompt,
      handleStyle,
      handleUse,
      isMock,
      isPending,
      prompt,
      style,
      variants,
    }),
    [
      aspect,
      error,
      handleAspect,
      handleGenerate,
      handlePrompt,
      handleStyle,
      handleUse,
      isMock,
      isPending,
      prompt,
      style,
      variants,
    ]
  );
};

export { useGenerate };

export type { Generate, GenerateSetup };
