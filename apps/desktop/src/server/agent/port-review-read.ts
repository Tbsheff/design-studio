import { readFile } from "node:fs/promises";
import { setTimeout } from "node:timers/promises";

import {
  BAD_GATEWAY,
  BAD_REQUEST,
  UNAVAILABLE,
} from "@design-studio/actions/_core/errors/http-status-codes";
import { PortMatchSchema } from "@design-studio/actions/port/schema";
import type {
  PortArea,
  PortFirstShift,
  PortMasked,
} from "@design-studio/actions/port/schema";
import { Result, Schema } from "effect";

import type { PreviewService, RenderPage } from "../../shared/server-ports.js";
import type { runAgentTool } from "../mcp/index.js";
import { toDecoder } from "../platform/decode/index.js";
import type { ImagePart } from "./user-message.js";

const INSPECT_TOOL = "inspect_port";

const RENDER_TIMEOUT_MS = 30_000;

const WARMING_STATUSES: ReadonlySet<number> = new Set([
  BAD_GATEWAY,
  UNAVAILABLE,
]);

const WARMING_WAIT_MS = 2000;

const WARMING_TRIES = 5;

const PROBE_VIEWPORT = { height: 900, width: 1280 };

const ERROR_TEXT_MAX = 300;

const FILE_TAIL_PARTS = 2;

const OVERLAY_PROBE = [
  "(() => {",
  '  const portal = document.querySelector("nextjs-portal");',
  "  const root = portal && portal.shadowRoot;",
  "  const dialog = root && root.querySelector('[data-nextjs-dialog-overlay][data-rendered=\"true\"]');",
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
  readonly firstShift: PortFirstShift | null;
  readonly images: readonly ImagePart[];
  readonly masked: readonly PortMasked[];
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
  firstShift: null,
  images: [],
  masked: [],
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
    firstShift: match.firstShift,
    images: await toSheetImage(match.diffPath),
    masked: match.masked,
    score: match.score,
  };
};

const getRouteStatus = async (url: string): Promise<number | null> => {
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

const isWarmingStatus = (status: number | null): boolean =>
  status !== null && WARMING_STATUSES.has(status);

const inspectStatus = async (
  url: string,
  triesLeft: number
): Promise<number | null> => {
  const status = await getRouteStatus(url);

  if (!isWarmingStatus(status) || triesLeft <= 0) {
    return status;
  }

  await setTimeout(WARMING_WAIT_MS);

  return inspectStatus(url, triesLeft - 1);
};

const toFileTail = (file: string): string =>
  file.split("/").slice(-FILE_TAIL_PARTS).join("/");

const isFileError = (text: string, files: readonly string[]): boolean =>
  files.some((file) => text.includes(toFileTail(file)));

const inspectPage = async (
  page: RenderPage,
  url: string,
  files: readonly string[]
): Promise<PageProblems> => {
  await page.goto(url);

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
      inspectPage(page, url, files)
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

  if (status >= BAD_REQUEST) {
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
    inspectStatus(url, WARMING_TRIES),
    inspectProblems(preview, url, files),
  ]);

  const problem = toProblem(status, problems);

  return { isRendered: problem === null, problem };
};

export { inspectPortMatch, inspectRouteRender };

export type { InspectArgs, InspectCall, PortMatchRead, RouteRender };
