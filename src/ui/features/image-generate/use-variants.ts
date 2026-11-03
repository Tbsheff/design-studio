import { useCallback, useState } from "react";

import type { imageRoutes, useAction } from "./deps.js";
import { SEEDS } from "./generate-model.js";
import type { Aspect, Style, Variant } from "./generate-model.js";

interface VariantSetup {
  readonly aspect: Aspect;
  readonly directionId: string;
  readonly projectId: string;
  readonly prompt: string;
  readonly style: Style;
}

type Run = ReturnType<typeof useAction<typeof imageRoutes.createImage>>["run"];

const makeVariant = async (
  run: Run,
  setup: VariantSetup,
  variantSeed: number
): Promise<Variant | null> => {
  const done = await run({
    aspect: setup.aspect,
    directionId: setup.directionId,
    projectId: setup.projectId,
    prompt: setup.prompt.trim(),
    seed: variantSeed,
    style: setup.style,
  });

  if (done === null) {
    return null;
  }

  return {
    alt: done.alt,
    asset: done.asset,
    preview: done.preview,
    seed: variantSeed,
  };
};

const isVariant = (entry: Variant | null): entry is Variant => entry !== null;

interface Variants {
  readonly handleGenerate: () => void;
  readonly variants: readonly Variant[];
}

const useVariants = (run: Run, setup: VariantSetup): Variants => {
  const [variants, setVariants] = useState<readonly Variant[]>([]);
  const { aspect, directionId, projectId, prompt, style } = setup;

  const handleGenerate = useCallback((): void => {
    if (prompt.trim() === "") {
      return;
    }

    const collect = async (): Promise<void> => {
      const made = await Promise.all(
        SEEDS.map((seed) =>
          makeVariant(
            run,
            { aspect, directionId, projectId, prompt, style },
            seed
          )
        )
      );

      setVariants(made.filter((entry) => isVariant(entry)));
    };

    collect();
  }, [aspect, directionId, projectId, prompt, run, style]);

  return { handleGenerate, variants };
};

export { useVariants };

export type { Run, VariantSetup };
