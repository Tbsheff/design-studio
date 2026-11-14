import type { QualityFinding } from "@design-studio/contracts";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { regionFindings } from "./fit-check.js";
import { probeLayout } from "./layout-region.js";
import { defaultShotTarget } from "./run-target.js";

interface LayoutInput {
  readonly ctx: AgentRunContext;
  readonly preview: PreviewService;
}

const toOutsideLine = (finding: QualityFinding): string =>
  `- [${finding.severity}] ${finding.check}: ${finding.message} Fix: ${finding.fix ?? ""}`;

const listLayoutFindings = async (
  input: LayoutInput
): Promise<QualityFinding[]> => {
  const { target } = input.ctx;
  const url = defaultShotTarget(input.ctx)?.url ?? "";

  if (!target?.layout || url === "") {
    return [];
  }

  return regionFindings(
    target.layout,
    await probeLayout(input.preview, url),
    target.owner,
    input.ctx.request.prompt
  );
};

const listOutsideLines = async (input: LayoutInput): Promise<string[]> => {
  try {
    const findings = await listLayoutFindings(input);

    return findings.map((finding) => toOutsideLine(finding));
  } catch {
    return [];
  }
};

export { listOutsideLines };
