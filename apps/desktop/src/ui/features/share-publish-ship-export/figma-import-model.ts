import type {
  FigmaFrameInfo,
  FigmaImportStats,
} from "@design-studio/contracts/figma-nodes";
import type { JsxInsertPosition } from "@design-studio/contracts/insert";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";

const MAX_FAILURE_LENGTH = 140;
const LINKS_OFF = /Figma API, which is off/u;
const API_STATUS = /Figma API answered (?<status>\d+)/u;
const RAW_NOISE = /https?:\/\/|[A-Z]_[A-Z_]/u;
const FIGMA_LINK = /figma\.com\/(?:file|design|proto)\/(?<key>[A-Za-z0-9]+)/u;
const NODE_PARAM = /[?&]node-id=(?<node>[^&#]+)/u;

interface FigmaPositionOption {
  readonly label: string;
  readonly value: JsxInsertPosition;
}

const POSITIONS: readonly FigmaPositionOption[] = [
  { label: copy.insideTheSelection, value: "inside" },
  { label: copy.afterTheSelection, value: "after" },
  { label: copy.beforeTheSelection, value: "before" },
];

interface PlainFailure {
  readonly details: string | null;
  readonly fix: string | null;
  readonly text: string;
}

const toRoute = (ids: {
  readonly directionId: string;
  readonly projectId: string;
}): string =>
  `/api/projects/${encodeURIComponent(ids.projectId)}/d/${encodeURIComponent(ids.directionId)}/figma/import`;

const toPlural = (count: number, word: string): string =>
  `${count} ${word}${pick(count === 1, "", "s")}`;

const toFacts = (stats: FigmaImportStats): string[] => {
  const facts = [
    toPlural(stats.layers, "layer"),
    toPlural(stats.tokens, "token color"),
  ];

  if (stats.rawColors.length > 0) {
    facts.push(toPlural(stats.rawColors.length, "raw color"));
  }

  if (stats.images > 0) {
    facts.push(toPlural(stats.images, "image placeholder"));
  }

  if (stats.hidden > 0) {
    facts.push(`${stats.hidden} hidden skipped`);
  }

  return facts;
};

const toPlainFailure = (raw: string): PlainFailure => {
  if (LINKS_OFF.test(raw)) {
    return {
      details: raw,
      fix: copy.pasteFrameJsonInstead,
      text: copy.cannotOpenFigmaLinks,
    };
  }

  const status = API_STATUS.exec(raw)?.groups?.["status"];

  if (status) {
    return {
      details: raw,
      fix: copy.checkFigmaToken,
      text: `Figma refused to share this file (error ${status}).`,
    };
  }

  if (raw.length > MAX_FAILURE_LENGTH || RAW_NOISE.test(raw)) {
    return { details: raw, fix: null, text: copy.figmaFrameDidNotLoad };
  }

  return { details: null, fix: null, text: raw };
};

const toNodesUrl = (link: string): string => {
  const key = FIGMA_LINK.exec(link)?.groups?.["key"] ?? copy.fileKeyPlaceholder;
  const node = NODE_PARAM.exec(link)?.groups?.["node"];

  const nodeId = pick(
    node,
    decodeURIComponent(node ?? "").replace("-", ":"),
    copy.nodeIdPlaceholder
  );

  return `https://api.figma.com/v1/files/${key}/nodes?ids=${nodeId}`;
};

const toFrameLabel = (frame: FigmaFrameInfo): string => {
  if (frame.width) {
    return `${frame.name} · ${frame.width}×${frame.height}`;
  }

  return frame.name;
};

const toImportMessage = (
  frameName: string,
  components: readonly string[],
  addedCount: number
): string => {
  let message = `Imported ${frameName}`;

  if (components.length > 0) {
    message += ` with ${[...new Set(components)].join(", ")}`;
  }

  if (addedCount > 0) {
    message += `, ${toPlural(addedCount, "import")} added`;
  }

  return `${message}.`;
};

const toSummarySize = (frame: FigmaFrameInfo): string => {
  if (frame.width) {
    return `${frame.width}×${frame.height}`;
  }

  return frame.type;
};

export {
  LINKS_OFF,
  POSITIONS,
  toFacts,
  toFrameLabel,
  toImportMessage,
  toNodesUrl,
  toPlainFailure,
  toPlural,
  toRoute,
  toSummarySize,
};

export type { PlainFailure };
