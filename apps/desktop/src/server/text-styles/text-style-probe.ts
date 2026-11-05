import type { DirectionRun } from "../direct-edit/index.js";
import { describeElement, withPagePath } from "./deps.js";
import type { SourceLoc } from "./deps.js";
import { TextStyleError } from "./list.js";

interface TextStyleProbe {
  readonly path: string | null;
  readonly selector: string | null;
}

interface ProbedElement {
  readonly source: SourceLoc | null;
  readonly styles: Readonly<Record<string, string>>;
}

const NEEDS_ELEMENT =
  "Pass styles, or pass selector to read the styles from the element on the page.";

const toProbedElement = async (
  { direction, project, runtime }: DirectionRun,
  probe: TextStyleProbe
): Promise<ProbedElement> => {
  if (probe.selector === null) {
    throw new TextStyleError(NEEDS_ELEMENT);
  }

  const base = await runtime.preview.directionUrl(project, direction);
  const url = withPagePath(base, probe.path ?? "");
  const element = await describeElement(runtime.preview, url, probe.selector);

  if (!element) {
    throw new TextStyleError(
      `No element matches ${probe.selector} on the page.`
    );
  }

  return { source: element.source, styles: element.styles };
};

export { toProbedElement };

export type { ProbedElement, TextStyleProbe };
