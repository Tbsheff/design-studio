import type { LayoutFinding } from "@design-studio/contracts";

import { layoutProbeExpression } from "../../page-probe/index.js";

interface ReportPage {
  readonly errors: () => Promise<{
    consoleErrors: string[];
    pageErrors: string[];
  }>;
  readonly evaluate: <Result>(expression: string) => Promise<Result>;
  readonly screenshot: (outPath: string) => Promise<void>;
}

interface PageReport {
  readonly consoleErrors: readonly string[];
  readonly findings: readonly LayoutFinding[];
}

interface Probe {
  readonly findings: readonly LayoutFinding[];
  readonly total: number;
}

const MAX_FINDINGS = 50;

const MAX_CONSOLE_ERRORS = 5;

const MAX_ERROR_TEXT = 200;

const SETTLE_EXPRESSION =
  "new Promise((done) => setTimeout(() => done(true), 1500))";

const createPageReport = async (
  page: ReportPage,
  shotFile: string
): Promise<PageReport> => {
  await page.evaluate(SETTLE_EXPRESSION);

  const probe = await page.evaluate<Probe>(layoutProbeExpression(MAX_FINDINGS));

  await page.screenshot(shotFile);

  const errors = await page.errors();
  const lines = [...errors.consoleErrors, ...errors.pageErrors];

  return {
    consoleErrors: lines
      .slice(0, MAX_CONSOLE_ERRORS)
      .map((text) => text.slice(0, MAX_ERROR_TEXT)),
    findings: probe.findings,
  };
};

export { createPageReport };

export type { PageReport, ReportPage };
