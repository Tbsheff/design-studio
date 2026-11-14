import { setTimeout as toDelay } from "node:timers/promises";

import type {
  AgentRunContext,
  PreviewService,
} from "../../shared/server-ports.js";
import { probeOnPage } from "../page-probe/index.js";
import { withPagePath } from "../project-source/index.js";
import { matrixProbe } from "../viewport/index.js";
import type { RawMatrixProbe, RawTap } from "../viewport/index.js";

type PhoneContext = Pick<AgentRunContext, "direction" | "project">;

interface PhonePage {
  readonly file: string;
  readonly probe: RawMatrixProbe | null;
}

const PHONE_VIEWPORT = { height: 844, width: 390 };

const PHONE_PAGES = 6;

const LISTED_LINES = 6;

const PROBE_TIMEOUT_MS = 8000;

const SCROLL_SLACK = 1;

const TAP_DETAIL =
  /^tap target "(?<label>[^"]*)" is (?<width>\d+)x(?<height>\d+) px/u;

const getPhoneProbe = async (
  preview: PreviewService,
  url: string
): Promise<RawMatrixProbe | null> => {
  const timer = new AbortController();

  try {
    const probe = probeOnPage<RawMatrixProbe>(
      preview,
      url,
      PHONE_VIEWPORT,
      matrixProbe(true)
    );

    return await Promise.race([
      probe,
      toDelay(PROBE_TIMEOUT_MS, null, { signal: timer.signal }),
    ]);
  } catch {
    return null;
  } finally {
    timer.abort();
  }
};

const inspectPhonePage = async (
  preview: PreviewService,
  base: string,
  file: string
): Promise<PhonePage> => ({
  file,
  probe: await getPhoneProbe(preview, withPagePath(base, file)),
});

const toTapText = (tap: RawTap): string => {
  const groups = TAP_DETAIL.exec(tap.detail)?.groups ?? null;

  if (groups === null) {
    return tap.selector;
  }

  const { height, label, width } = groups;

  return `"${label ?? ""}" ${width ?? ""} x ${height ?? ""} px`;
};

const toScrollLine = (page: PhonePage, probe: RawMatrixProbe): string =>
  `- Phone: ${page.file} scrolls sideways at ${PHONE_VIEWPORT.width} px (page ${probe.scroll.scrollWidth} px wide). Let the grid wrap or stack under 640 px, then run run_viewport on ${page.file}.`;

const toTapLine = (page: PhonePage, probe: RawMatrixProbe): string => {
  const [first] = probe.taps.items;
  const count = probe.taps.total;
  let head = `${count} tap targets on ${page.file} are`;
  let firstText = "";

  if (count === 1) {
    head = `1 tap target on ${page.file} is`;
  }

  if (first) {
    firstText = ` (first: ${toTapText(first)})`;
  }

  return `- Phone: ${head} under 44 px${firstText}. Give each one at least 44 x 44 px with padding or min-height, then run run_viewport on ${page.file}.`;
};

const listPageLines = (page: PhonePage): string[] => {
  const { probe } = page;

  if (probe === null) {
    return [];
  }

  const lines: string[] = [];

  if (probe.scroll.scrollWidth > probe.scroll.width + SCROLL_SLACK) {
    lines.push(toScrollLine(page, probe));
  }

  if (probe.taps.total > 0) {
    lines.push(toTapLine(page, probe));
  }

  return lines;
};

const toRestLine = (count: number): string =>
  `- Phone: ${count} more gaps. Run run_viewport on each page at ${PHONE_VIEWPORT.width} px to list them all.`;

const getPhoneBase = async (
  ctx: PhoneContext,
  preview: PreviewService
): Promise<string | null> => {
  try {
    return await preview.directionUrl(ctx.project, ctx.direction);
  } catch {
    return null;
  }
};

const listPhoneLines = async (
  ctx: PhoneContext,
  preview: PreviewService,
  pages: readonly string[]
): Promise<string[]> => {
  if (pages.length === 0) {
    return [];
  }

  const base = await getPhoneBase(ctx, preview);

  if (base === null) {
    return [];
  }

  const shown = await Promise.all(
    pages
      .slice(0, PHONE_PAGES)
      .map((file) => inspectPhonePage(preview, base, file))
  );

  const gaps = shown.flatMap((page) => listPageLines(page));

  const lines = gaps.slice(0, LISTED_LINES);

  if (gaps.length > LISTED_LINES) {
    lines.push(toRestLine(gaps.length - LISTED_LINES));
  }

  return lines;
};

export { listPhoneLines };
