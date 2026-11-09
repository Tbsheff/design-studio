import { lookup } from "node:dns/promises";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { isIP } from "node:net";
import os from "node:os";
import path from "node:path";
import { setTimeout as sleep } from "node:timers/promises";

import type { Direction, Project } from "@design-studio/contracts";

import type { PreviewService } from "../../../shared/server-ports.js";
import {
  checkUrl,
  isBlockedAddress,
} from "../../design-system/extract/safe-fetch.js";
import { BadRequestError } from "../../platform/errors/index.js";
import {
  META_EXPRESSION,
  READY_EXPRESSION,
  STYLE_EXPRESSION,
  TEXT_EXPRESSION,
} from "./url-expressions.js";

type UrlPreview = Pick<PreviewService, "directionUrl" | "withPage">;

interface UrlCaptureCommand {
  readonly direction: Direction;
  readonly isLoopbackAllowed: boolean;
  readonly preview: UrlPreview;
  readonly project: Project;
  readonly url: string;
}

interface UrlCaptured {
  readonly directory: string;
  readonly host: string;
}

interface PageMeta {
  readonly height: number;
  readonly href: string;
  readonly status: number;
  readonly title: string;
}

interface PageStyle {
  readonly baseFontSize: number;
  readonly colors: readonly { readonly area: number; readonly hex: string }[];
  readonly fontFamilies: readonly string[];
  readonly radii: readonly string[];
}

interface UrlGate {
  readonly allowedOrigin: string | null;
  readonly isLoopbackAllowed: boolean;
}

const VIEWPORT_WIDTH = 1440;

const VIEWPORT_HEIGHT = 900;

const MAX_PAGE_HEIGHT = 8000;

const LOAD_LIMIT_MS = 20_000;

const MAX_URL_LENGTH = 2000;

const FIRST_OK_STATUS = 200;

const LAST_OK_STATUS = 299;

const JSON_INDENT = 2;

const LOOPBACK_HOST = /^(?:localhost|127\.\d+\.\d+\.\d+|\[::1\]|::1)$/u;

const toParsedUrl = (raw: string): URL => {
  if (raw.length > MAX_URL_LENGTH) {
    throw new BadRequestError("The URL is too long.");
  }

  try {
    return new URL(raw.trim());
  } catch {
    throw new BadRequestError("The URL is not valid.");
  }
};

const toBareHost = (hostname: string): string => {
  if (hostname.startsWith("[") && hostname.endsWith("]")) {
    return hostname.slice(1, -1);
  }

  return hostname;
};

const toResolved = async (
  host: string
): Promise<readonly { readonly address: string }[]> => {
  try {
    return await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new BadRequestError(`The host ${host} cannot be found.`);
  }
};

const runAddressCheck = async (
  host: string,
  isLoopbackAllowed: boolean
): Promise<void> => {
  if (isIP(host) !== 0) {
    return;
  }

  const addresses = await toResolved(host);

  const isBlocked = addresses.some((entry) =>
    isBlockedAddress(entry.address, isLoopbackAllowed)
  );

  if (isBlocked) {
    throw new BadRequestError(
      `The host ${host} points to a private or local address.`
    );
  }
};

const toCheckedUrl = async (raw: string, gate: UrlGate): Promise<URL> => {
  const parsed = toParsedUrl(raw);

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new BadRequestError("Use an http or https URL.");
  }

  const isDevServer =
    gate.allowedOrigin !== null && parsed.origin === gate.allowedOrigin;

  const isLoopbackAllowed = gate.isLoopbackAllowed || isDevServer;

  try {
    checkUrl(parsed.href, isLoopbackAllowed);
  } catch (error) {
    throw new BadRequestError(
      `The studio does not load this address: ${String(error)}`
    );
  }

  await runAddressCheck(toBareHost(parsed.hostname), isLoopbackAllowed);

  return parsed;
};

const toDevOrigin = async (
  command: UrlCaptureCommand
): Promise<string | null> => {
  const host = toParsedUrl(command.url).hostname.toLowerCase();

  if (!(LOOPBACK_HOST.test(host) || host.endsWith(".localhost"))) {
    return null;
  }

  try {
    const base = await command.preview.directionUrl(
      command.project,
      command.direction
    );

    return new URL(base).origin;
  } catch {
    return null;
  }
};

const runLoadLimit = async (signal: AbortSignal): Promise<never> => {
  await sleep(LOAD_LIMIT_MS, null, { signal });

  throw new BadRequestError("The page took more than 20 s to load.");
};

const toStatusProblem = (status: number): string | null => {
  if (status === 0) {
    return null;
  }

  if (status < FIRST_OK_STATUS || status > LAST_OK_STATUS) {
    return `The page answered with status ${status}.`;
  }

  return null;
};

const createCaptureFiles = async (
  directory: string,
  text: string,
  style: PageStyle
): Promise<void> => {
  await writeFile(path.join(directory, "page.md"), text);

  await writeFile(
    path.join(directory, "style.json"),
    `${JSON.stringify(style, null, JSON_INDENT)}\n`
  );
};

const runCaptureInto = (
  command: UrlCaptureCommand,
  gate: UrlGate,
  target: URL,
  directory: string
): Promise<void> => {
  const { withPage } = command.preview;

  if (!withPage) {
    throw new BadRequestError("This preview cannot load web pages.");
  }

  return withPage(
    target.href,
    { height: VIEWPORT_HEIGHT, width: VIEWPORT_WIDTH },
    async (page) => {
      await page.evaluate<boolean>(READY_EXPRESSION);
      const meta = await page.evaluate<PageMeta>(META_EXPRESSION);
      const problem = toStatusProblem(meta.status);

      if (problem !== null) {
        throw new BadRequestError(problem);
      }

      await toCheckedUrl(meta.href, gate);

      const [text, style] = await Promise.all([
        page.evaluate<string>(TEXT_EXPRESSION),
        page.evaluate<PageStyle>(STYLE_EXPRESSION),
      ]);

      await page.screenshot(path.join(directory, "page.png"), {
        height: Math.max(1, Math.min(meta.height, MAX_PAGE_HEIGHT)),
        width: VIEWPORT_WIDTH,
        x: 0,
        y: 0,
      });

      await createCaptureFiles(directory, text, style);
    }
  );
};

const runReferenceUrlCapture = async (
  command: UrlCaptureCommand
): Promise<UrlCaptured> => {
  const directory = await mkdtemp(path.join(os.tmpdir(), "studio-reference-"));
  const limit = new AbortController();

  try {
    const gate = {
      allowedOrigin: await toDevOrigin(command),
      isLoopbackAllowed: command.isLoopbackAllowed,
    };

    const target = await toCheckedUrl(command.url, gate);

    await Promise.race([
      runCaptureInto(command, gate, target, directory),
      runLoadLimit(limit.signal),
    ]);

    return { directory, host: target.hostname };
  } catch (error) {
    await rm(directory, { force: true, recursive: true });

    throw error;
  } finally {
    limit.abort();
  }
};

export { runReferenceUrlCapture };

export type { UrlCaptureCommand, UrlCaptured, UrlPreview };
