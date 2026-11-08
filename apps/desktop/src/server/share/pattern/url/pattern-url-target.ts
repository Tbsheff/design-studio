import { PageImportError, toTargetUrl } from "../../page-import/index.js";

type UrlTargetResult =
  | {
      readonly allowLoopback: boolean;
      readonly ok: true;
      readonly url: string;
    }
  | { readonly message: string; readonly ok: false };

interface UrlFailure {
  readonly code: "bad_url" | "unavailable";
  readonly message: string;
  readonly ok: false;
}

const toUrlTarget = (raw: string): UrlTargetResult => {
  try {
    const target = toTargetUrl(raw);

    return { allowLoopback: target.allowLoopback, ok: true, url: target.url };
  } catch (error) {
    if (error instanceof PageImportError) {
      return { message: error.message, ok: false };
    }

    return { message: "The URL cannot be read.", ok: false };
  }
};

const NOT_LOADED = "The page did not load.";

const toUnavailable = (message: string | null): UrlFailure => ({
  code: "unavailable",
  message: message ?? NOT_LOADED,
  ok: false,
});

export { toUnavailable, toUrlTarget };

export type { UrlFailure, UrlTargetResult };
