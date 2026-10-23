import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { packagedResource } from '../resources.js';
import type { CheckViewport, QualityFinding, QualitySeverity } from '../../shared/contracts.js';

const AXE_RULES = [
  'color-contrast',
  'image-alt',
  'input-image-alt',
  'label',
  'select-name',
  'button-name',
  'link-name',
  'heading-order',
  'page-has-heading-one',
  'landmark-one-main',
  'region',
  'document-title',
  'html-has-lang',
  'list',
  'listitem',
  'aria-allowed-attr',
  'aria-required-attr',
];

const NODES_PER_RULE = 3;

interface AxeNode {
  target: unknown[];
  html: string;
  failureSummary?: string;
}

interface AxeViolation {
  id: string;
  impact?: string | null;
  help: string;
  helpUrl?: string;
  nodes: AxeNode[];
}

let axeSource: Promise<string> | null = null;

function loadAxeSource(): Promise<string> {
  if (!axeSource) {
    const file = packagedResource('axe.min.js') ?? createRequire(import.meta.url).resolve('axe-core/axe.min.js');
    axeSource = readFile(file, 'utf8');
  }
  return axeSource;
}

function severityForImpact(impact: string | null | undefined): QualitySeverity {
  if (impact === 'critical' || impact === 'serious') return 'high';
  if (impact === 'moderate') return 'medium';
  return 'low';
}

const LOC_IN_HTML = /data-studio-loc="([^"]+)"/;

function firstLine(text: string | undefined): string {
  return (text ?? '').split('\n').map((line) => line.trim()).filter((line) => line && !/^fix (any|all) of the following:?$/i.test(line))[0] ?? '';
}

function nodeFinding(violation: AxeViolation, node: AxeNode, viewport: CheckViewport): QualityFinding {
  const detail = firstLine(node.failureSummary);
  return {
    check: 'a11y',
    severity: severityForImpact(violation.impact),
    viewport,
    selector: node.target.map(String).join(' '),
    source: LOC_IN_HTML.exec(node.html)?.[1] ?? null,
    message: `${violation.id}: ${violation.help}${detail ? ` (${detail})` : ''}`,
  };
}

function axeFindings(violations: AxeViolation[], viewport: CheckViewport): QualityFinding[] {
  return violations.flatMap((violation) => violation.nodes.slice(0, NODES_PER_RULE).map((node) => nodeFinding(violation, node, viewport)));
}

interface AxePage {
  evaluate<T>(expression: string): Promise<T>;
}

function axeRunExpression(rules: readonly string[]): string {
  return `window.axe.run(document, { runOnly: { type: 'rule', values: ${JSON.stringify(rules)} }, resultTypes: ['violations'] }).then((result) => result.violations)`;
}

export async function runAxe(page: AxePage, viewport: CheckViewport): Promise<QualityFinding[]> {
  await page.evaluate(`${await loadAxeSource()}\n;0`);
  const violations = await page.evaluate<AxeViolation[]>(axeRunExpression(AXE_RULES));
  return axeFindings(violations, viewport);
}
