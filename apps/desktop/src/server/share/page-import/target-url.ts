import { checkUrl, PAGE_IMPORT_URL_MAX } from "./deps.js";
import { PageImportError } from "./errors.js";

const URL_TEXT_MAX = 200;

const LOOPBACK_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

interface TargetUrl {
  readonly url: string;
  readonly allowLoopback: boolean;
}

const isLoopbackHost = (host: string): boolean =>
  LOOPBACK_HOSTS.has(host) ||
  host.endsWith(".localhost") ||
  /^127\.\d+\.\d+\.\d+$/u.test(host);

const toParseUrl = (raw: string): URL => {
  try {
    return new URL(raw.trim());
  } catch {
    throw new PageImportError(`Not a valid URL: ${raw.slice(0, URL_TEXT_MAX)}`);
  }
};

const toTargetUrl = (raw: string): TargetUrl => {
  if (raw.length > PAGE_IMPORT_URL_MAX) {
    throw new PageImportError("The URL is too long.");
  }

  const parsed = toParseUrl(raw);
  const allowLoopback = isLoopbackHost(parsed.hostname.toLowerCase());

  if (parsed.protocol !== "https:" && !allowLoopback) {
    throw new PageImportError(
      "Use an https URL, or a localhost URL for the dev server of an attached app."
    );
  }

  try {
    return { allowLoopback, url: checkUrl(parsed.href, allowLoopback).href };
  } catch (error) {
    throw new PageImportError(
      `The studio does not import this URL: ${String(error)}`
    );
  }
};

export { toTargetUrl };

export type { TargetUrl };
