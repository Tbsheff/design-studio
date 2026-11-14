import { PORT_TASK } from "@design-studio/contracts/port";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import type { DriverInput, DriverOutcome } from "./lifecycle.js";
import {
  INSPECT_PORT_TOOL,
  runPortReview,
  toPortChecked,
  toPortReviewGaps,
  toRouteFiles,
} from "./port-review.js";
import type { PortContinue, PortReviewGaps } from "./port-review.js";

const PORT_THROW_TAG = "[port-throw]";

const PORT_CHECKED_TAG = "[port-checked]";

const HEADING_OPEN = ["<", "h1"].join("");

const HEADING_CLOSE = ["<", "/h1>"].join("");

const HEADING_FALLBACK = "Moved page";

const JSX_UNSAFE = /[{}<>]/gu;

interface MockPortSession {
  readonly fakeTool: (
    name: string,
    input: Readonly<Record<string, string>>,
    summary: string
  ) => Promise<void>;
  readonly say: (text: string) => Promise<void>;
  readonly writeFileAsTool: (
    toolName: "Write" | "Edit",
    relativePath: string,
    content: string
  ) => Promise<void>;
}

interface MockPortDeps {
  readonly preview: PreviewService | null;
  readonly runtime: StudioRuntime | null;
}

interface MockPortRun {
  readonly file: string;
  readonly gaps: PortReviewGaps;
  readonly preview: PreviewService;
  readonly runtime: StudioRuntime;
}

const isMockPort = (ctx: Pick<AgentRunContext, "request">): boolean =>
  ctx.request.task === PORT_TASK;

const toHeading = (prompt: string): string => {
  const open = prompt.indexOf(HEADING_OPEN);
  const start = prompt.indexOf(">", open) + 1;
  const end = prompt.indexOf(HEADING_CLOSE, start);

  if (open === -1 || end === -1) {
    return HEADING_FALLBACK;
  }

  return prompt.slice(start, end).replaceAll(JSX_UNSAFE, "").trim();
};

const toTagText = (parts: readonly string[]): string => parts.join("");

const toGoodRoute = (heading: string): string =>
  [
    "export default function Page() {",
    "  return (",
    toTagText([
      "    ",
      "<",
      "main",
      ' style={{ fontFamily: "system-ui", padding: 48 }}',
      ">",
    ]),
    toTagText(["      ", "<", "h1>", heading, HEADING_CLOSE]),
    toTagText(["    ", "<", "/main>"]),
    "  );",
    "}",
    "",
  ].join("\n");

const THROW_ROUTE = [
  "export default function Page() {",
  '  throw new Error("Mock port route failed to render");',
  "}",
  "",
].join("\n");

const toRouteFile = (prompt: string): string | null =>
  toRouteFiles(prompt)[0] ?? null;

const toMockToolOrder = (prompt: string): string[] => {
  if (prompt.includes(PORT_CHECKED_TAG)) {
    return ["Write", INSPECT_PORT_TOOL];
  }

  return ["Write"];
};

const toRouteText = (prompt: string): string => {
  if (prompt.includes(PORT_THROW_TAG)) {
    return THROW_ROUTE;
  }

  return toGoodRoute(toHeading(prompt));
};

const runMockPort = async (
  session: MockPortSession,
  input: DriverInput
): Promise<string> => {
  const { prompt } = input.ctx.request;
  const file = toRouteFile(prompt);

  if (file === null) {
    return "Mock port: the prompt names no route file.";
  }

  await session.say(`Writing the route \`${file}\`.`);
  await session.writeFileAsTool("Write", file, toRouteText(prompt));

  if (prompt.includes(PORT_CHECKED_TAG)) {
    await session.fakeTool(INSPECT_PORT_TOOL, {}, "Port score checked");
  }

  const finalText = `Moved the prototype into \`${file}\`.`;
  await session.say(finalText);

  return finalText;
};

const toFixContinue =
  (input: DriverInput, session: MockPortSession, file: string): PortContinue =>
  async (fixText) => {
    input.sink.sent({
      continuation: 1,
      imageCount: 0,
      promptHash: "mock",
      recommendedSkills: [],
      resume: input.ctx.direction.sessionId,
      text: fixText,
      updatedInstructions: false,
    });
    await session.writeFileAsTool(
      "Write",
      file,
      toGoodRoute(toHeading(input.ctx.request.prompt))
    );
    await session.say("Mock fix loop: rewrote the route so it renders.");

    return true;
  };

const toMockPortRun = (
  input: DriverInput,
  deps: MockPortDeps
): MockPortRun | null => {
  const { prompt } = input.ctx.request;
  const gaps = toPortReviewGaps(input.ctx, toMockToolOrder(prompt));
  const file = toRouteFile(prompt);

  if (gaps === null || file === null) {
    return null;
  }

  if (deps.preview === null || deps.runtime === null) {
    return null;
  }

  return { file, gaps, preview: deps.preview, runtime: deps.runtime };
};

const applyMockPort = async (
  input: DriverInput,
  session: MockPortSession,
  deps: MockPortDeps,
  outcome: DriverOutcome
): Promise<DriverOutcome> => {
  const run = toMockPortRun(input, deps);

  if (outcome.status !== "completed" || run === null) {
    return outcome;
  }

  const review = await runPortReview({
    continueWith: toFixContinue(input, session, run.file),
    gaps: run.gaps,
    preview: run.preview,
    runtime: run.runtime,
  });

  return {
    ...outcome,
    finalCheck: toPortChecked(outcome.finalCheck, review.record),
    finalText: `${outcome.finalText}\n\n${review.note}`,
  };
};

export { applyMockPort, isMockPort, runMockPort };

export type { MockPortDeps };
