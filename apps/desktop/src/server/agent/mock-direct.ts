import type { PreviewService } from "../../shared/server-ports.js";
import { runEditElement } from "./direct-tools.js";
import type { DriverInput } from "./lifecycle.js";
import { mockCanvasTool } from "./mock-canvas.js";
import type { MockToolSession } from "./mock-canvas.js";
import { EDIT_ELEMENT_TOOL } from "./permissions.js";

export const MOCK_DIRECT_TAG = "[direct]";
const HEADING_COLOR = "#0f766e";

export function wantsMockDirect(input: DriverInput): boolean {
  return input.ctx.request.prompt.includes(MOCK_DIRECT_TAG);
}

export async function runMockDirect(
  session: MockToolSession,
  input: DriverInput,
  preview: PreviewService | undefined
): Promise<string> {
  if (!preview) {
    return "Direct edits need the preview, which this run does not have.";
  }

  const deps = { ctx: input.ctx, preview };
  const heading = { selector: "h1", style: { color: HEADING_COLOR } };

  const edited = await mockCanvasTool(session, EDIT_ELEMENT_TOOL, heading, () =>
    runEditElement(deps, heading)
  );

  const classes = { classes: { add: ["mock-direct"] }, selector: "h1" };

  const tagged = await mockCanvasTool(session, EDIT_ELEMENT_TOOL, classes, () =>
    runEditElement(deps, classes)
  );

  const duplicate = { op: "duplicate" as const, selector: "section p" };

  const copied = await mockCanvasTool(
    session,
    EDIT_ELEMENT_TOOL,
    duplicate,
    () => runEditElement(deps, duplicate)
  );

  const line = (
    result: { isError?: boolean; content: { text: string }[] },
    done: string,
    what: string
  ) =>
    result.isError ? `${what} failed: ${result.content[0]?.text ?? ""}` : done;

  return [
    line(edited, `Made the heading ${HEADING_COLOR}.`, "The heading edit"),
    line(tagged, "Added the mock-direct class.", "The class edit"),
    line(copied, "Duplicated the section paragraph.", "The duplicate"),
  ].join(" ");
}
