import type { ReactElement } from "react";

import type { SelectionContext } from "./deps.js";

interface GenerateTabProps {
  readonly directionId: string;
  readonly onDone: (message: string) => void;
  readonly projectId: string;
  readonly target: SelectionContext;
}

type RenderGenerate = (props: GenerateTabProps) => ReactElement;

export type { GenerateTabProps, RenderGenerate };
