import os from "node:os";
import path from "node:path";

import { composeSheet, removeShots } from "./contact-sheet.js";
import type { SheetShot } from "./contact-sheet.js";
import { probeOnPage, withForcedParam, withPagePath } from "./deps.js";
import type { CanvasFileFrame, Project } from "./deps.js";
import { checksTapTargets, toCells } from "./engine/cells.js";
import type { CellScheme, MatrixCell, MatrixRequest } from "./engine/cells.js";
import { matrixProbe } from "./probe.js";
import type { RawMatrixProbe } from "./probe.js";
import type { ViewportRuntime } from "./viewport-runtime.js";

type FindingKind =
  | "clipped-text"
  | "horizontal-scroll"
  | "overflow"
  | "tap-target";

interface MatrixFinding {
  readonly detail: string;
  readonly frameId: string | null;
  readonly kind: FindingKind;
  readonly scheme: CellScheme;
  readonly selector: string;
  readonly source: string | null;
  readonly width: number;
}

interface MatrixCellReport {
  readonly clippedText: number;
  readonly frameId: string | null;
  readonly horizontalScroll: boolean;
  readonly overflow: number;
  readonly scheme: CellScheme;
  readonly tapTargets: number;
  readonly width: number;
}

interface MatrixInspected {
  readonly cells: readonly MatrixCellReport[];
  readonly contactSheet: string | null;
  readonly findings: readonly MatrixFinding[];
  readonly page: string;
}

interface InspectCommand extends MatrixRequest {
  readonly directionId: string;
  readonly page: string;
  readonly projectId: string;
}

interface CellUrl {
  readonly cell: MatrixCell;
  readonly url: string;
}

interface CellResult {
  readonly findings: readonly MatrixFinding[];
  readonly report: MatrixCellReport;
}

const SCROLL_SLACK = 1;

const urlOf = (base: string, page: string, scheme: CellScheme): string => {
  const pageUrl = withPagePath(base, page);

  if (scheme === "dark") {
    return withForcedParam(pageUrl, { selector: null, state: "dark" });
  }

  return pageUrl;
};

const kindOfLayout = (kind: string): FindingKind => {
  if (kind === "clipped") {
    return "clipped-text";
  }

  return "overflow";
};

const toFindings = (
  cell: MatrixCell,
  frameId: string | null,
  raw: RawMatrixProbe
): readonly MatrixFinding[] => {
  const base = { frameId, scheme: cell.scheme, width: cell.width };

  const layout = raw.layout.findings.map((finding): MatrixFinding => ({
    ...base,
    detail: finding.detail,
    kind: kindOfLayout(finding.kind),
    selector: finding.selector,
    source: finding.source,
  }));

  const taps = raw.taps.items.map((tap): MatrixFinding => ({
    ...base,
    ...tap,
    kind: "tap-target",
  }));

  const hasScroll = raw.scroll.scrollWidth > raw.scroll.width + SCROLL_SLACK;
  const scroll: MatrixFinding[] = [];

  if (hasScroll) {
    scroll.push({
      ...base,
      detail: `page is ${raw.scroll.scrollWidth}px wide in a ${raw.scroll.width}px viewport`,
      kind: "horizontal-scroll",
      selector: "html",
      source: null,
    });
  }

  return [...layout, ...taps, ...scroll];
};

const countOf = (
  findings: readonly MatrixFinding[],
  kind: FindingKind
): number => findings.filter((finding) => finding.kind === kind).length;

const toReport = (
  cell: MatrixCell,
  owner: string | null,
  findings: readonly MatrixFinding[],
  raw: RawMatrixProbe
): MatrixCellReport => ({
  clippedText: countOf(findings, "clipped-text"),
  frameId: owner,
  horizontalScroll: countOf(findings, "horizontal-scroll") > 0,
  overflow: countOf(findings, "overflow"),
  scheme: cell.scheme,
  tapTargets: raw.taps.total,
  width: cell.width,
});

const frameIdOf = (
  frames: readonly CanvasFileFrame[],
  cell: MatrixCell
): string | null =>
  frames.find((frame) => frame.label === cell.label)?.id ?? null;

const sheetPathOf = (runtime: ViewportRuntime, project: Project): string =>
  path.join(
    runtime.dataDir,
    "viewport-sheets",
    `${project.id}-${Date.now()}.png`
  );

const shootOne = async (
  runtime: ViewportRuntime,
  item: CellUrl,
  at: number,
  schemes: readonly CellScheme[]
): Promise<SheetShot> => {
  const file = path.join(os.tmpdir(), `ds-matrix-${Date.now()}-${at}.png`);

  await runtime.preview.screenshot(
    item.url,
    { height: item.cell.height, width: item.cell.width },
    file
  );

  return { file, row: schemes.indexOf(item.cell.scheme) };
};

const makeSheet = async (
  runtime: ViewportRuntime,
  project: Project,
  urls: readonly CellUrl[]
): Promise<string | null> => {
  const schemes = [...new Set(urls.map((item) => item.cell.scheme))];
  let shots: readonly SheetShot[] = [];

  try {
    shots = await Promise.all(
      urls.map((item, at) => shootOne(runtime, item, at, schemes))
    );

    return await composeSheet(shots, sheetPathOf(runtime, project));
  } catch {
    return null;
  } finally {
    await removeShots(shots);
  }
};

const probeCell = async (
  runtime: ViewportRuntime,
  item: CellUrl,
  frames: readonly CanvasFileFrame[]
): Promise<CellResult> => {
  const { cell, url } = item;

  const raw = await probeOnPage<RawMatrixProbe>(
    runtime.preview,
    url,
    { height: cell.height, width: cell.width },
    matrixProbe(checksTapTargets(cell.width))
  );

  const frameId = frameIdOf(frames, cell);
  const findings = toFindings(cell, frameId, raw);

  return { findings, report: toReport(cell, frameId, findings, raw) };
};

const inspectMatrix = async (
  runtime: ViewportRuntime,
  command: InspectCommand
): Promise<MatrixInspected> => {
  const { direction, project } = await runtime.loadDirection(
    command.projectId,
    command.directionId
  );

  const [base, snapshot] = await Promise.all([
    runtime.preview.directionUrl(project, direction),
    runtime.canvas.read(project),
  ]);

  const frames = snapshot.canvas?.frames ?? [];

  const urls = toCells(command).map((cell) => ({
    cell,
    url: urlOf(base, command.page, cell.scheme),
  }));

  const [results, sheet] = await Promise.all([
    Promise.all(urls.map((item) => probeCell(runtime, item, frames))),
    makeSheet(runtime, project, urls),
  ]);

  return {
    cells: results.map((result) => result.report),
    contactSheet: sheet,
    findings: results.flatMap((result) => result.findings),
    page: command.page,
  };
};

export { inspectMatrix };

export type {
  InspectCommand,
  MatrixCellReport,
  MatrixFinding,
  MatrixInspected,
};
