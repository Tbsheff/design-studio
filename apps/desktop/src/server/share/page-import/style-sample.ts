import { samplePage } from "./capture.js";
import { PAGE_IMPORT_DEADLINE_MS, PAGE_IMPORT_WIDTH_MAX } from "./deps.js";
import { PageImportError } from "./errors.js";
import { sampleScript } from "./style-sample-script.js";
import { toTargetUrl } from "./target-url.js";
import type { TargetUrl } from "./target-url.js";

const SAMPLE_WIDTH = 1440;

const SAMPLE_HEIGHT = 900;

interface StyleSwatch {
  readonly hex: string;
  readonly share: number;
}

interface StyleSample {
  readonly bg: string | null;
  readonly body: string | null;
  readonly colors: readonly StyleSwatch[];
  readonly display: string | null;
  readonly fg: string | null;
  readonly primary: string | null;
  readonly radius: string | null;
  readonly title: string;
}

type StyleSampleResult =
  | {
      readonly code: "bad_url" | "unavailable";
      readonly message: string;
      readonly ok: false;
    }
  | { readonly ok: true; readonly sample: StyleSample };

interface TargetFailure {
  readonly message: string;
}

const toTarget = (raw: string): TargetFailure | TargetUrl => {
  try {
    return toTargetUrl(raw);
  } catch (error) {
    if (error instanceof PageImportError) {
      return { message: error.message };
    }

    return { message: "The URL cannot be read." };
  }
};

const isTargetUrl = (target: TargetFailure | TargetUrl): target is TargetUrl =>
  "url" in target;

const toSampleStyle = async (raw: string): Promise<StyleSampleResult> => {
  const target = toTarget(raw);

  if (!isTargetUrl(target)) {
    return { code: "bad_url", message: target.message, ok: false };
  }

  try {
    const sample = await samplePage<StyleSample>(
      {
        allowLoopback: target.allowLoopback,
        deadline: Date.now() + PAGE_IMPORT_DEADLINE_MS,
        height: SAMPLE_HEIGHT,
        selector: null,
        url: target.url,
        width: Math.min(SAMPLE_WIDTH, PAGE_IMPORT_WIDTH_MAX),
      },
      sampleScript()
    );

    return { ok: true, sample };
  } catch (error) {
    if (error instanceof PageImportError) {
      return { code: "unavailable", message: error.message, ok: false };
    }

    return {
      code: "unavailable",
      message: "The page did not load.",
      ok: false,
    };
  }
};

export { toSampleStyle as sampleStyle };

export type { StyleSample, StyleSampleResult, StyleSwatch };
