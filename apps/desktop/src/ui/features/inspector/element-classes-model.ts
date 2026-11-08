import type {
  ElementSourceInfo,
  SourceLoc,
  TailwindOutcome,
} from "@design-studio/contracts";

import type { VariantSupport } from "../../../shared/variants.js";

interface ElementClasses {
  readonly tailwind: TailwindOutcome | null;
  readonly element: ElementSourceInfo | null;
  readonly variants: VariantSupport | null;
}

interface ClassesOptions {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly source: SourceLoc | null;
  readonly savedAt: number;
  readonly variant: string;
}

interface ClassRequest {
  readonly projectId: string;
  readonly directionId: string;
  readonly loc: {
    readonly col: number;
    readonly file: string;
    readonly line: number;
  };
  readonly variant: string;
  readonly savedAt: number;
}

const NO_CLASSES: ElementClasses = {
  element: null,
  tailwind: null,
  variants: null,
};

const OUTER_HTML_LIMIT = 4000;

const toClassRequest = (
  options: Omit<ClassesOptions, "source">,
  file: string | null,
  line: number | null,
  col: number | null
): ClassRequest | null => {
  if (!options.directionId || file === null || line === null || col === null) {
    return null;
  }

  return {
    directionId: options.directionId,
    loc: { col, file, line },
    projectId: options.projectId,
    savedAt: options.savedAt,
    variant: options.variant,
  };
};

const toDomClasses = (outerHTML: string): string[] => {
  const raw =
    /^<[^>]*\bclass="(?<classes>[^"]*)"/u.exec(
      outerHTML.slice(0, OUTER_HTML_LIMIT)
    )?.groups?.classes ?? "";

  return raw.split(/\s+/u).filter(Boolean);
};

export { NO_CLASSES, toClassRequest, toDomClasses };

export type { ClassRequest, ClassesOptions, ElementClasses };
