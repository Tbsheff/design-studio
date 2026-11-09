import type { PreviewService } from "../../shared/server-ports.js";
import { listInsertable } from "../components/index.js";
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

export interface MockReplySession {
  readonly say: (text: string) => Promise<void>;
  readonly fakeTool: (
    name: string,
    input: { readonly query: string },
    summary: string
  ) => Promise<void>;
}

const CRITIQUE_REPLY =
  "Critique: tighten the hierarchy, check contrast on secondary text, and test the layout at 375px.";

const KIT_COUNT = 2;
const WORD_SPLIT = /\W+/u;

const toSourceLabel = (ctx: DriverInput["ctx"]): string => {
  const source = ctx.request.selection?.find((item) => item.source)?.source;

  if (source) {
    return `\`${source.file}:${source.line}\``;
  }

  return "the selected layer";
};

const toKitNames = async (ctx: DriverInput["ctx"]): Promise<string[]> => {
  const list = await listInsertable(ctx.project, ctx.direction.workTree);
  const words = ctx.request.prompt.toLowerCase().split(WORD_SPLIT);

  const toMatch = (name: string): number =>
    Number(
      words.some((word) => word !== "" && name.toLowerCase().includes(word))
    );

  const ranked = list.components.toSorted(
    (left, right) =>
      toMatch(right.name) - toMatch(left.name) || right.uses - left.uses
  );

  return ranked
    .slice(0, KIT_COUNT)
    .map((item) => `\`${item.name}\` (${item.file})`);
};

const startMockAsk = async (
  session: MockReplySession,
  ctx: DriverInput["ctx"]
): Promise<string> => {
  await session.fakeTool(
    "mcp__studio__list_components",
    { query: ctx.request.prompt },
    "Listed kit components"
  );
  const kit = await toKitNames(ctx);
  let kitText = "no kit component";

  if (kit.length > 0) {
    kitText = kit.join(" and ");
  }

  const finalText = `Answer: the selected layer is at ${toSourceLabel(ctx)}. These kit components fit: ${kitText}. I changed no file.`;
  await session.say(finalText);

  return finalText;
};

export async function startMockReadOnly(
  session: MockReplySession,
  input: DriverInput
): Promise<string> {
  if (input.ctx.request.mode === "ask") {
    return startMockAsk(session, input.ctx);
  }

  await session.say(CRITIQUE_REPLY);

  return CRITIQUE_REPLY;
}
