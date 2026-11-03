import { outsideAppExpression } from "./app-source-filter.probe.js";
import type { RenderPage } from "./render-backend.js";

export async function dropOutsideApp<T extends { selector: string | null }>(
  page: Pick<RenderPage, "evaluate">,
  findings: T[]
): Promise<T[]> {
  const selectors = [
    ...new Set(
      findings.flatMap((finding) =>
        finding.selector ? [finding.selector] : []
      )
    ),
  ];

  if (selectors.length === 0) {
    return findings;
  }

  const outside = await page
    .evaluate<boolean[]>(outsideAppExpression(selectors))
    .catch(() => selectors.map(() => false));

  const drop = new Set(selectors.filter((_, index) => outside[index] === true));

  return drop.size
    ? findings.filter(
        (finding) => !finding.selector || !drop.has(finding.selector)
      )
    : findings;
}
