import { readFile } from "node:fs/promises";

import { PortMatchSchema } from "@design-studio/actions/port/schema";
import type { PortArea } from "@design-studio/actions/port/schema";
import { Result, Schema } from "effect";

import type { PreviewService, RenderPage } from "../../shared/server-ports.js";
import type { runAgentTool } from "../mcp/index.js";
import { toDecoder } from "../platform/decode/index.js";
import type { ImagePart } from "./user-message.js";

const INSPECT_TOOL = "inspect_port";

const RENDER_TIMEOUT_MS = 30_000;

const HTTP_ERROR_MIN = 400;

const PROBE_VIEWPORT = { height: 900, width: 1280 };

const ERROR_TEXT_MAX = 300;

const FILE_TAIL_PARTS = 2;

const OVERLAY_PROBE = [
  "(() => {",
  '  const portal = document.querySelector("nextjs-portal");',
  "  const root = portal && portal.shadowRoot;",
  '  const dialog = root && root.querySelector("[data-nextjs-dialog], [data-nextjs-dialog-overlay]");',
  '  const text = (document.body && document.body.innerText) || "";',
  '  return Boolean(dialog) || text.includes("Application error: a client-side exception") || text.includes("Application error: a server-side exception");',
  "})()",
].join("\n");

const decodeMatch = toDecoder(Schema.fromJsonString(PortMatchSchema), "ignore");

type InspectCall = (
  name: string,
  body: Parameters<typeof runAgentTool>[2]
) => ReturnType<typeof runAgentTool>;

type InspectResult = Awaited<ReturnType<InspectCall>>;

interface PortMatchRead {
  readonly areas: readonly PortArea[];
  readonly error: string | null;
  readonly images: readonly ImagePart[];
  readonly score: number | null;
}

interface RouteRender {
  readonly isRendered: boolean;
  readonly problem: string | null;
}

interface PageProblems {
  readonly consoleErrors: readonly string[];
  readonly hasOverlay: boolean;
  readonly pageErrors: readonly string[];
}

interface InspectArgs {
  readonly directionId: string;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
}

const toShortText = (text: string): string =>
  text.replaceAll(/\s+/gu, " ").trim().slice(0, ERROR_TEXT_MAX);

const toResultText = (result: InspectResult): string =>
  result.content
    .flatMap((block) => {
      if (block.type === "text") {
        return [block.text];
      }

      return [];
    })
    .join("\n");

const toMissedMatch = (error: string): PortMatchRead => ({
  areas: [],
  error: toShortText(error),
  images: [],
  score: null,
});

const toSheetImage = async (diffPath: string): Promise<ImagePart[]> => {
  try {
    const data = await readFile(diffPath);

    return [
      {
        data: data.toString("base64"),
        mime: "image/png",
        name: "port-diff.png",
      },
    ];
  } catch {
    return [];
  }
};

const toInspectResult = async (
  inspect: InspectCall,
  args: InspectArgs
): Promise<InspectResult> => {
  try {
    return await inspect(INSPECT_TOOL, { args: { ...args } });
  } catch {
    return {
      content: [{ text: "inspect_port did not answer", type: "text" }],
      isError: true,
    };
  }
};

const inspectPortMatch = async (
  inspect: InspectCall,
  args: InspectArgs
): Promise<PortMatchRead> => {
  const result = await toInspectResult(inspect, args);
  const text = toResultText(result);

  if (result.isError) {
    return toMissedMatch(text);
  }

  const decoded = decodeMatch(text);

  if (Result.isFailure(decoded)) {
    return toMissedMatch("inspect_port sent a result the studio cannot read");
  }

  const match = decoded.success;

  return {
    areas: match.areas,
    error: null,
    images: await toSheetImage(match.diffPath),
    score: match.score,
  };
};

const inspectStatus = async (url: string): Promise<number | null> => {
  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(RENDER_TIMEOUT_MS),
    });

    await response.body?.cancel();

    return response.status;
  } catch {
    return null;
  }
};

const toFileTail = (file: string): string =>
  file.split("/").slice(-FILE_TAIL_PARTS).join("/");

const isFileError = (text: string, files: readonly string[]): boolean =>
  files.some((file) => text.includes(toFileTail(file)));

const inspectPage = async (
  page: RenderPage,
  files: readonly string[]
): Promise<PageProblems> => {
  const [overlay, errors] = await Promise.all([
    page.evaluate<boolean>(OVERLAY_PROBE),
    page.errors(),
  ]);

  return {
    consoleErrors: errors.consoleErrors.filter((text) =>
      isFileError(text, files)
    ),
    hasOverlay: overlay,
    pageErrors: errors.pageErrors,
  };
};

const inspectProblems = async (
  preview: PreviewService,
  url: string,
  files: readonly string[]
): Promise<PageProblems | null> => {
  if (!preview.withPage) {
    return null;
  }

  try {
    return await preview.withPage(url, PROBE_VIEWPORT, (page) =>
      inspectPage(page, files)
    );
  } catch {
    return null;
  }
};

const toPageProblem = (problems: PageProblems | null): string | null => {
  const pageError = problems?.pageErrors[0] ?? null;
  const consoleError = problems?.consoleErrors[0] ?? null;

  if (problems?.hasOverlay) {
    return "the Next error overlay shows";
  }

  if (pageError !== null) {
    return `page error: ${toShortText(pageError)}`;
  }

  if (consoleError !== null) {
    return `console error: ${toShortText(consoleError)}`;
  }

  return null;
};

const toProblem = (
  status: number | null,
  problems: PageProblems | null
): string | null => {
  if (status === null) {
    return "the dev server did not answer";
  }

  if (status >= HTTP_ERROR_MIN) {
    return `HTTP ${status}`;
  }

  return toPageProblem(problems);
};

const inspectRouteRender = async (
  preview: PreviewService,
  url: string,
  files: readonly string[]
): Promise<RouteRender> => {
  const [status, problems] = await Promise.all([
    inspectStatus(url),
    inspectProblems(preview, url, files),
  ]);

  const problem = toProblem(status, problems);

  return { isRendered: problem === null, problem };
};

export { inspectPortMatch, inspectRouteRender };

export type { InspectArgs, InspectCall, PortMatchRead, RouteRender };
