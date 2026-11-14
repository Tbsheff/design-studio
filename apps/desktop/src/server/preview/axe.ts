import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";

import type {
  CheckViewport,
  QualityFinding,
  QualitySeverity,
} from "@design-studio/contracts";

import type { RenderClip } from "../../shared/render-rpc.js";
import type { AxeNode, AxeViolation } from "../../shared/server-ports.js";
import { packagedResource } from "../platform/resources/index.js";
import type { PhotoTextHit } from "./text-on-photo.js";
import { runPhotoTextPass } from "./text-on-photo.js";

const AXE_RULES = [
  "color-contrast",
  "image-alt",
  "input-image-alt",
  "label",
  "select-name",
  "button-name",
  "link-name",
  "heading-order",
  "page-has-heading-one",
  "landmark-one-main",
  "region",
  "document-title",
  "html-has-lang",
  "list",
  "listitem",
  "aria-allowed-attr",
  "aria-required-attr",
];

const NODES_PER_RULE = 3;

const REVIEW_EXTRA_RULES = [
  "svg-img-alt",
  "role-img-alt",
  "area-alt",
  "object-alt",
];

export const SHARED_AXE_RULES: readonly string[] = [
  ...new Set([...AXE_RULES, ...REVIEW_EXTRA_RULES]),
];

let axeSource: Promise<string> | null = null;

export function loadAxeSource(): Promise<string> {
  if (!axeSource) {
    const file =
      packagedResource("axe.min.js") ??
      createRequire(import.meta.url).resolve("axe-core/axe.min.js");

    axeSource = readFile(file, "utf-8");
  }

  return axeSource;
}

function severityForImpact(impact: string | null | undefined): QualitySeverity {
  if (impact === "critical" || impact === "serious") {
    return "high";
  }

  if (impact === "moderate") {
    return "medium";
  }

  return "low";
}

const LOC_IN_HTML = /data-studio-loc="([^"]+)"/;

function firstLine(text: string | undefined): string {
  return (
    (text ?? "")
      .split("\n")
      .map((line) => line.trim())
      .filter(
        (line) => line && !/^fix (any|all) of the following:?$/i.test(line)
      )[0] ?? ""
  );
}

function nodeFinding(
  violation: AxeViolation,
  node: AxeNode,
  viewport: CheckViewport
): QualityFinding {
  const detail = firstLine(node.failureSummary);

  return {
    check: "a11y",
    message: `${violation.id}: ${violation.help}${detail ? ` (${detail})` : ""}`,
    selector: node.target.map(String).join(" "),
    severity: severityForImpact(violation.impact),
    source: LOC_IN_HTML.exec(node.html)?.[1] ?? null,
    viewport,
  };
}

function axeFindings(
  violations: AxeViolation[],
  viewport: CheckViewport
): QualityFinding[] {
  return violations.flatMap((violation) =>
    violation.nodes
      .slice(0, NODES_PER_RULE)
      .map((node) => nodeFinding(violation, node, viewport))
  );
}

interface AxePage {
  evaluate<T>(expression: string): Promise<T>;
  screenshot?: (outPath: string, clip: RenderClip) => Promise<void>;
}

const PART_WORD: Record<PhotoTextHit["part"], string> = {
  darkest: "dark",
  lightest: "light",
};

const toPhotoTextFinding = (hit: PhotoTextHit): QualityFinding => {
  const ratio = hit.ratio.toFixed(1);
  const word = PART_WORD[hit.part];

  return {
    check: "a11y",
    message: `Text on a photo or gradient is ${ratio}:1 at its ${hit.part} part (AA needs ${hit.need}:1). Add a scrim behind the text, a text shadow, or move the text off the ${word} part.`,
    selector: hit.selector,
    severity: severityForImpact(hit.impact ?? "serious"),
    source: LOC_IN_HTML.exec(hit.html)?.[1] ?? null,
    viewport: "desktop",
  };
};

const toPhotoTextFindings = async (
  page: AxePage
): Promise<QualityFinding[]> => {
  const { screenshot } = page;

  if (!screenshot) {
    return [];
  }

  const hits = await runPhotoTextPass(
    {
      evaluate: (expression) => page.evaluate(expression),
      screenshot: (outPath, clip) => screenshot.call(page, outPath, clip),
    },
    loadAxeSource
  );

  return hits.map((hit) => toPhotoTextFinding(hit));
};

function axeRunExpression(rules: readonly string[]): string {
  return `window.axe.run(document, { runOnly: { type: 'rule', values: ${JSON.stringify(rules)} }, resultTypes: ['violations'] }).then((result) => result.violations)`;
}

export async function runSharedAxe(page: AxePage): Promise<AxeViolation[]> {
  await page.evaluate(`${await loadAxeSource()}\n;0`);

  return page.evaluate<AxeViolation[]>(axeRunExpression(SHARED_AXE_RULES));
}

export function pickRules<T extends { id: string }>(
  violations: readonly T[],
  rules: readonly string[]
): T[] {
  const wanted = new Set(rules);

  return violations.filter((violation) => wanted.has(violation.id));
}

export async function runAxe(
  page: AxePage,
  viewport: CheckViewport,
  shared?: () => Promise<AxeViolation[]>
): Promise<QualityFinding[]> {
  const violations = await (shared ? shared() : runSharedAxe(page));
  const found = axeFindings(pickRules(violations, AXE_RULES), viewport);

  if (viewport !== "desktop") {
    return found;
  }

  return [...found, ...(await toPhotoTextFindings(page))];
}
