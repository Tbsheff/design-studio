import type {
  ElementSourceInfo,
  TailwindOutcome,
} from "@design-studio/contracts";

import type { VariantSupport } from "../../../shared/variants.js";

interface ElementClasses {
  readonly tailwind: TailwindOutcome | null;
  readonly element: ElementSourceInfo | null;
  readonly variants: VariantSupport | null;
}

export type { ElementClasses };
