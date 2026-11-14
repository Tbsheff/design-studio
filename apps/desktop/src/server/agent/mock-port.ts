import { writeFile } from "node:fs/promises";
import path from "node:path";

import { applyPort } from "@design-studio/actions/port/apply";
import { PORT_TASK } from "@design-studio/contracts/port";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import type { AgentResult } from "../agent-tools/registry.js";
import type { StudioRuntime } from "../platform/studio-runtime/index.js";
import type { DriverInput, DriverOutcome } from "./lifecycle.js";
import { toAssetMap, toAssetNotes } from "./port-assets.js";
import type { AssetLine } from "./port-assets.js";
import { runPortReview } from "./port-review-pass.js";
import {
  toPortCheckRef,
  toPortChecked,
  toPortGaps,
  toRouteFiles,
} from "./port-review.js";
import type {
  PortContinue,
  PortReview,
  PortReviewGaps,
} from "./port-review.js";
import { toRouteUpdateNotes } from "./port-route-notes.js";
import { toRouteFileNow } from "./port-route-update.js";
import type { RouteFileText } from "./port-route-update.js";
import { toPortRunCaller } from "./tool-groups/port-apply-call.js";

const PORT_THROW_TAG = "[port-throw]";

const PORT_LOW_TAG = "[port-low]";

const PORT_KEEP_TAG = "[port-keep]";

const PORT_WORSE_TAG = "[port-worse]";

const PORT_BASH_TAG = "[port-bash]";

const PORT_APPLY_TAG = "[port-apply]";

const APPLY_TOOL_NAME = "mcp__studio__apply_port";

const APPLY_TOOL_ID = "mock_port_apply";

const RESULT_TEXT_MAX = 600;

const SUMMARY_TEXT_MAX = 120;

const MAIN_CLASS = 'main className="';

const PAGE_START = "export default function Page() {";

const STYLE_OPEN = ["<", "style>"].join("");

const STYLE_CLOSE = ["<", "/style>"].join("");

const BODY_OPEN = ["<", "body>"].join("");

const BODY_CLOSE = ["<", "/body>"].join("");

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

const toBetween = (text: string, open: string, close: string): string => {
  const start = text.indexOf(open);
  const end = text.indexOf(close, start);

  if (start === -1 || end === -1) {
    return "";
  }

  return text.slice(start + open.length, end);
};

const REFERENCE_EDGE = String.raw`["'(\s,]`;

const toEscaped = (text: string): string =>
  text.replaceAll(/[.*+?^${}()|[\]\\]/gu, String.raw`\$&`);

const toMappedHtml = (html: string, lines: readonly AssetLine[]): string => {
  let text = html;

  for (const line of lines) {
    const pattern = new RegExp(
      `(?<=${REFERENCE_EDGE})${toEscaped(line.reference)}(?=${REFERENCE_EDGE})`,
      "gu"
    );

    text = text.replaceAll(pattern, line.url);
  }

  return text;
};

const toStyleLinks = (lines: readonly AssetLine[]): string =>
  lines
    .flatMap((line) => {
      if (!line.url.endsWith(".css")) {
        return [];
      }

      return [toTagText(["<", 'link rel="stylesheet" href="', line.url, '">'])];
    })
    .join("");

const toPrototypeHtml = (prompt: string): string => {
  const lines = toAssetMap(prompt);

  return [
    toStyleLinks(lines),
    STYLE_OPEN,
    toMappedHtml(toBetween(prompt, STYLE_OPEN, STYLE_CLOSE), lines),
    STYLE_CLOSE,
    toMappedHtml(toBetween(prompt, BODY_OPEN, BODY_CLOSE), lines),
  ].join("");
};

const toFaithfulRoute = (prompt: string): string =>
  [
    `const PAGE_HTML = ${JSON.stringify(toPrototypeHtml(prompt))};`,
    "",
    PAGE_START,
    toTagText([
      "  return ",
      "<",
      'iframe srcDoc={PAGE_HTML} style={{ border: 0, display: "block", height: "100vh", width: "100%" }} />;',
    ]),
    "}",
    "",
  ].join("\n");

const toHeadingRoute = (heading: string): string =>
  [
    PAGE_START,
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
  PAGE_START,
  '  throw new Error("Mock port route failed to render");',
  "}",
  "",
].join("\n");

const toRouteFile = (prompt: string): string | null =>
  toRouteFiles(prompt)[0] ?? null;

const toUpdatedRoute = (prompt: string, now: RouteFileText): string => {
  const start = now.text.indexOf("export default");
  const end = now.text.indexOf("\n  return", start);

  if (start === -1 || end === -1) {
    return toHeadingRoute(toHeading(prompt));
  }

  return [
    now.text.slice(0, end),
    "  return (",
    toTagText([
      "    ",
      "<",
      'main style={{ fontFamily: "system-ui", padding: 48 }}>',
    ]),
    toTagText(["      ", "<", "h1>", toHeading(prompt), HEADING_CLOSE]),
    toTagText(["    ", "<", "/main>"]),
    "  );",
    "}",
    "",
  ].join("\n");
};

const toRouteText = (prompt: string): string => {
  const now = toRouteFileNow(prompt);

  if (now !== null && prompt.includes(PORT_KEEP_TAG)) {
    return now.text;
  }

  if (now !== null) {
    return toUpdatedRoute(prompt, now);
  }

  if (prompt.includes(PORT_THROW_TAG)) {
    return THROW_ROUTE;
  }

  if (prompt.includes(PORT_LOW_TAG)) {
    return toHeadingRoute(toHeading(prompt));
  }

  return toFaithfulRoute(prompt);
};

const setRoute = async (
  session: MockPortSession,
  input: DriverInput,
  file: string
): Promise<void> => {
  const { prompt } = input.ctx.request;

  if (!prompt.includes(PORT_BASH_TAG)) {
    await session.writeFileAsTool("Write", file, toRouteText(prompt));

    return;
  }

  const command = `cat > ${file} <<'EOF'`;
  await writeFile(
    path.join(input.ctx.direction.workTree, file),
    `${toRouteText(prompt)}\n`
  );
  await session.fakeTool("Bash", { command }, `Bash ${command}`);
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
  await setRoute(session, input, file);

  const finalText = `Moved the prototype into \`${file}\`.`;
  await session.say(finalText);

  return finalText;
};

const toFixedRoute = (prompt: string): string => {
  const now = toRouteFileNow(prompt);

  if (now !== null && prompt.includes(PORT_WORSE_TAG)) {
    return now.text.replace(MAIN_CLASS, `${MAIN_CLASS}mt-24 `);
  }

  if (now !== null) {
    return toRouteText(prompt);
  }

  return toFaithfulRoute(prompt);
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
      toFixedRoute(input.ctx.request.prompt)
    );
    await session.say("Mock fix loop: rewrote the route so it renders.");

    return true;
  };

const toToolOrder = (prompt: string): string[] => {
  if (prompt.includes(PORT_BASH_TAG)) {
    return ["Bash"];
  }

  return ["Write"];
};

const toMockPortRun = async (
  input: DriverInput,
  deps: MockPortDeps
): Promise<MockPortRun | null> => {
  const { prompt } = input.ctx.request;
  const gaps = await toPortGaps(input.ctx, toToolOrder(prompt));
  const file = toRouteFile(prompt);

  if (gaps === null || file === null) {
    return null;
  }

  if (deps.preview === null || deps.runtime === null) {
    return null;
  }

  return { file, gaps, preview: deps.preview, runtime: deps.runtime };
};

const toAssetNoted = async (
  input: DriverInput,
  outcome: DriverOutcome
): Promise<DriverOutcome> => {
  const { prompt } = input.ctx.request;

  const notes = [
    ...(await toRouteUpdateNotes(prompt, input.ctx.direction.workTree)),
    ...toAssetNotes(prompt),
  ];

  if (notes.length === 0) {
    return outcome;
  }

  return {
    ...outcome,
    finalText: [outcome.finalText, ...notes].join("\n\n"),
  };
};

const toResultText = (result: AgentResult): string =>
  result.content
    .flatMap((block) => {
      if (block.type === "text") {
        return [block.text];
      }

      return [];
    })
    .join("\n")
    .slice(0, RESULT_TEXT_MAX);

const applyAsAgent = async (
  input: DriverInput,
  deps: MockPortDeps
): Promise<string> => {
  const { prompt } = input.ctx.request;
  const routePath = toPortCheckRef(prompt)?.routePath ?? null;

  const call = toPortRunCaller({
    actionAsk: null,
    ctx: input.ctx,
    runtime: deps.runtime,
  });

  if (!prompt.includes(PORT_APPLY_TAG) || routePath === null || call === null) {
    return "";
  }

  const args = { routePath };
  input.sink.toolStarted(APPLY_TOOL_ID, APPLY_TOOL_NAME, args);
  const result = await call(applyPort, args);
  const text = toResultText(result);
  input.sink.toolFinished(
    APPLY_TOOL_ID,
    result.isError === true,
    `apply_port ${text.slice(0, SUMMARY_TEXT_MAX)}`
  );

  return `Mock agent apply_port({ routePath: "${routePath}" }): ${text}`;
};

const runAppliedReview = async (
  input: DriverInput,
  session: MockPortSession,
  deps: MockPortDeps,
  run: MockPortRun
): Promise<readonly [string, PortReview]> => {
  const applied = await applyAsAgent(input, deps);

  return [
    applied,
    await runPortReview({
      continueWith: toFixContinue(input, session, run.file),
      gaps: run.gaps,
      preview: run.preview,
      runtime: run.runtime,
    }),
  ];
};

const applyMockReview = async (
  input: DriverInput,
  session: MockPortSession,
  deps: MockPortDeps,
  outcome: DriverOutcome
): Promise<DriverOutcome> => {
  const run = await toMockPortRun(input, deps);

  if (outcome.status !== "completed" || run === null) {
    return outcome;
  }

  const [applied, review] = await runAppliedReview(input, session, deps, run);

  return {
    ...outcome,
    finalCheck: toPortChecked(outcome.finalCheck, review.record),
    finalText: [outcome.finalText, applied, review.note]
      .filter((part) => part !== "")
      .join("\n\n"),
  };
};

const applyMockPort = async (
  input: DriverInput,
  session: MockPortSession,
  deps: MockPortDeps,
  outcome: DriverOutcome
): Promise<DriverOutcome> =>
  toAssetNoted(input, await applyMockReview(input, session, deps, outcome));

export { applyMockPort, isMockPort, runMockPort };

export type { MockPortDeps };
