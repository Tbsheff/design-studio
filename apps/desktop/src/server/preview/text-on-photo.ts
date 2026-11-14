import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { PNG } from "pngjs";

import type { RenderClip } from "../../shared/render-rpc.js";
import { logError, logInfo } from "../platform/logger/index.js";

const NODE_CAP = 3;

const AA_NORMAL = 4.5;

const AA_LARGE = 3;

const LARGE_PX = 24;

const LARGE_BOLD_PX = 18.66;

const BOLD_WEIGHT = 700;

const LOW_SHARE = 0.1;

const HIGH_SHARE = 0.9;

const LEVELS = 1024;

const CHANNEL_MAX = 255;

const LINEAR_KNEE = 0.04045;

const LINEAR_SLOPE = 12.92;

const GAMMA_OFFSET = 0.055;

const GAMMA_SCALE = 1.055;

const GAMMA = 2.4;

const RED_WEIGHT = 0.2126;

const GREEN_WEIGHT = 0.7152;

const BLUE_WEIGHT = 0.0722;

const FLARE = 0.05;

const RGBA = 4;

const PHOTO_REASONS = ["bgImage", "bgGradient", "bgOverlap", "imgNode"];

const MARK = "data-studio-pt";

const HAS_PHOTO_EXPRESSION = `(() => { if (document.querySelector('img, picture, video, canvas, svg image')) return true; for (const element of document.querySelectorAll('body, body *')) { const style = getComputedStyle(element); if (style.backgroundImage !== 'none') return true; if (getComputedStyle(element, '::before').backgroundImage !== 'none') return true; if (getComputedStyle(element, '::after').backgroundImage !== 'none') return true; } return false; })()`;

const HAS_AXE_EXPRESSION = "typeof window.axe === 'object'";

const RESTORE_EXPRESSION = `(() => { document.querySelectorAll('[${MARK}]').forEach((element) => element.removeAttribute('${MARK}')); document.getElementById('${MARK}')?.remove(); return true; })()`;

interface PhotoTextPage {
  readonly evaluate: <Result>(expression: string) => Promise<Result>;
  readonly screenshot: (outPath: string, clip: RenderClip) => Promise<void>;
}

interface PhotoTextNode {
  readonly selector: string;
  readonly html: string;
  readonly impact: string | null;
  readonly color: readonly [number, number, number];
  readonly fontSize: number;
  readonly fontWeight: number;
  readonly clip: RenderClip;
}

interface PhotoTextScan {
  readonly reasons: readonly string[];
  readonly nodes: readonly PhotoTextNode[];
}

interface PhotoTextHit {
  readonly selector: string;
  readonly html: string;
  readonly impact: string | null;
  readonly ratio: number;
  readonly need: number;
  readonly part: "lightest" | "darkest";
}

interface BackgroundLevels {
  readonly high: number;
  readonly low: number;
}

interface PhotoTextRun {
  readonly hits: readonly PhotoTextHit[];
  readonly reasons: readonly string[];
  readonly nodeCount: number;
}

const toScanExpression = (): string => `(async () => {
  const wanted = ${JSON.stringify(PHOTO_REASONS)};
  const result = await window.axe.run(document, { runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['incomplete'] });
  const rule = result.incomplete.find((entry) => entry.id === 'color-contrast');
  const reasons = [];
  const nodes = [];
  if (!rule) return { reasons, nodes };
  const canvas = document.createElement('canvas');
  canvas.width = 1;
  canvas.height = 1;
  const paint = canvas.getContext('2d', { willReadFrequently: true });
  const toRgb = (value) => { paint.clearRect(0, 0, 1, 1); paint.fillStyle = '#000'; paint.fillStyle = value; paint.fillRect(0, 0, 1, 1); const data = paint.getImageData(0, 0, 1, 1).data; return [data[0], data[1], data[2]]; };
  for (const node of rule.nodes) {
    const check = [...node.any, ...node.all, ...node.none].find((entry) => entry.data && entry.data.messageKey);
    const reason = check ? check.data.messageKey : 'none';
    reasons.push(reason);
    if (!wanted.includes(reason) || nodes.length >= ${NODE_CAP}) continue;
    if (!node.target.every((part) => typeof part === 'string')) continue;
    const selector = node.target.join(' ');
    let element = null;
    try { element = document.querySelector(selector); } catch (error) { element = null; }
    if (!element) continue;
    const style = getComputedStyle(element);
    if (style.textShadow !== 'none') continue;
    const range = document.createRange();
    range.selectNodeContents(element);
    const box = range.getBoundingClientRect();
    if (box.width < 1 || box.height < 1) continue;
    const x = Math.max(0, box.left + window.scrollX);
    const y = Math.max(0, box.top + window.scrollY);
    nodes.push({ selector, html: node.html, impact: node.impact || rule.impact || null, color: toRgb(style.color), fontSize: parseFloat(style.fontSize) || 16, fontWeight: Number(style.fontWeight) || 400, clip: { x, y, width: Math.min(box.width, document.documentElement.scrollWidth - x), height: box.height } });
  }
  return { reasons, nodes };
})()`;

const toHideExpression = (selector: string): string => `(async () => {
  const element = document.querySelector(${JSON.stringify(selector)});
  if (!element) return false;
  element.setAttribute('${MARK}', '');
  if (!document.getElementById('${MARK}')) {
    const sheet = document.createElement('style');
    sheet.id = '${MARK}';
    sheet.textContent = '[${MARK}], [${MARK}] * { color: transparent !important; -webkit-text-fill-color: transparent !important; text-shadow: none !important; transition: none !important; caret-color: transparent !important; }';
    document.head.appendChild(sheet);
  }
  await new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done)));
  return true;
})()`;

const toLinear = (channel: number): number => {
  const value = channel / CHANNEL_MAX;

  if (value <= LINEAR_KNEE) {
    return value / LINEAR_SLOPE;
  }

  return ((value + GAMMA_OFFSET) / GAMMA_SCALE) ** GAMMA;
};

const LINEAR_TABLE = Array.from({ length: CHANNEL_MAX + 1 }, (_value, index) =>
  toLinear(index)
);

const toLuminance = (red: number, green: number, blue: number): number =>
  RED_WEIGHT * (LINEAR_TABLE[red] ?? 0) +
  GREEN_WEIGHT * (LINEAR_TABLE[green] ?? 0) +
  BLUE_WEIGHT * (LINEAR_TABLE[blue] ?? 0);

const toContrast = (first: number, second: number): number =>
  (Math.max(first, second) + FLARE) / (Math.min(first, second) + FLARE);

const toLevelAt = (
  histogram: Uint32Array,
  total: number,
  share: number
): number => {
  const wanted = Math.max(1, Math.ceil(total * share));
  let seen = 0;

  for (const [level, count] of histogram.entries()) {
    seen += count;

    if (seen >= wanted) {
      return level / (LEVELS - 1);
    }
  }

  return 1;
};

const toBackgroundLevels = (png: PNG): BackgroundLevels => {
  const histogram = new Uint32Array(LEVELS);
  const total = png.width * png.height;

  for (let offset = 0; offset < png.data.length; offset += RGBA) {
    const luminance = toLuminance(
      png.data[offset] ?? 0,
      png.data[offset + 1] ?? 0,
      png.data[offset + 2] ?? 0
    );

    const level = Math.min(LEVELS - 1, Math.round(luminance * (LEVELS - 1)));
    histogram[level] = (histogram[level] ?? 0) + 1;
  }

  return {
    high: toLevelAt(histogram, total, HIGH_SHARE),
    low: toLevelAt(histogram, total, LOW_SHARE),
  };
};

const isLargeText = (node: PhotoTextNode): boolean =>
  node.fontSize >= LARGE_PX ||
  (node.fontSize >= LARGE_BOLD_PX && node.fontWeight >= BOLD_WEIGHT);

const toNeed = (node: PhotoTextNode): number => {
  if (isLargeText(node)) {
    return AA_LARGE;
  }

  return AA_NORMAL;
};

const toPhotoTextHit = (node: PhotoTextNode, png: PNG): PhotoTextHit | null => {
  const [red, green, blue] = node.color;
  const text = toLuminance(red, green, blue);
  const { low, high } = toBackgroundLevels(png);
  const toDark = toContrast(text, low);
  const toLight = toContrast(text, high);
  const ratio = Math.min(toDark, toLight);
  const need = toNeed(node);

  if (ratio >= need) {
    return null;
  }

  let part: PhotoTextHit["part"] = "darkest";

  if (toLight <= toDark) {
    part = "lightest";
  }

  const { html, impact, selector } = node;

  return { html, impact, need, part, ratio, selector };
};

const inspectPhotoNode = async (
  page: PhotoTextPage,
  node: PhotoTextNode,
  outPath: string
): Promise<PhotoTextHit | null> => {
  const isHidden = await page.evaluate<boolean>(
    toHideExpression(node.selector)
  );

  try {
    if (!isHidden) {
      return null;
    }

    await page.screenshot(outPath, node.clip);
  } finally {
    await page.evaluate(RESTORE_EXPRESSION);
  }

  const png = PNG.sync.read(await readFile(outPath));

  return toPhotoTextHit(node, png);
};

const inspectPhotoNodesFrom = async (
  page: PhotoTextPage,
  nodes: readonly PhotoTextNode[],
  dir: string,
  index: number
): Promise<PhotoTextHit[]> => {
  const node = nodes[index];

  if (!node) {
    return [];
  }

  const hits: PhotoTextHit[] = [];

  const hit = await inspectPhotoNode(
    page,
    node,
    path.join(dir, `node-${index}.png`)
  );

  if (hit) {
    hits.push(hit);
  }

  return [
    ...hits,
    ...(await inspectPhotoNodesFrom(page, nodes, dir, index + 1)),
  ];
};

const inspectPhotoNodes = async (
  page: PhotoTextPage,
  nodes: readonly PhotoTextNode[]
): Promise<PhotoTextHit[]> => {
  if (nodes.length === 0) {
    return [];
  }

  const dir = await mkdtemp(path.join(os.tmpdir(), "studio-photo-text-"));

  try {
    return await inspectPhotoNodesFrom(page, nodes, dir, 0);
  } finally {
    await rm(dir, { force: true, recursive: true });
  }
};

const runPhotoTextScan = async (
  page: PhotoTextPage,
  loadSource: () => Promise<string>
): Promise<PhotoTextRun> => {
  const hasPhoto = await page.evaluate<boolean>(HAS_PHOTO_EXPRESSION);

  if (!hasPhoto) {
    return { hits: [], nodeCount: 0, reasons: [] };
  }

  const hasAxe = await page.evaluate<boolean>(HAS_AXE_EXPRESSION);

  if (!hasAxe) {
    await page.evaluate(`${await loadSource()}\n;0`);
  }

  const scan = await page.evaluate<PhotoTextScan>(toScanExpression());
  const hits = await inspectPhotoNodes(page, scan.nodes);

  return { hits, nodeCount: scan.nodes.length, reasons: scan.reasons };
};

const runPhotoTextPass = async (
  page: PhotoTextPage,
  loadSource: () => Promise<string>
): Promise<readonly PhotoTextHit[]> => {
  const started = Date.now();

  try {
    const run = await runPhotoTextScan(page, loadSource);
    logInfo(
      `photo-text: leased page, ${run.nodeCount} nodes, ${run.hits.length} under AA, reasons [${run.reasons.join(", ")}], ${Date.now() - started} ms`
    );

    return run.hits;
  } catch (error) {
    logError("photo-text: pass failed", error);

    return [];
  }
};

export { runPhotoTextPass };

export type { PhotoTextHit, PhotoTextPage };
