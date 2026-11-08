import type { FlowResult } from "../../../shared/route-flow.js";

const flowSummary = (result: FlowResult): string => {
  const added = result.frames.filter((frame) => frame.added).length;

  let part: "link" | "links" = "links";

  if (result.links.length === 1) {
    part = "link";
  }

  const parts = [
    `${result.frames.length} frames (${added} new)`,
    `${result.links.length} ${part}`,
  ];

  if (result.skipped.length > 0) {
    parts.push(`${result.skipped.length} not linked`);
  }

  return parts.join(", ");
};

export { flowSummary };
