import type { PortMatchWire } from "@design-studio/actions/port/schema";
import type { RunRequest } from "@design-studio/contracts";
import { PORT_TASK } from "@design-studio/contracts/port";

interface PortCheckInput {
  readonly directionId: string;
  readonly limit: number;
  readonly path: string;
  readonly projectId: string;
  readonly routePath: string;
  readonly targetProjectId: string;
  readonly width: number;
}

const PORT_CHECK_WIDTH = 1280;

const PORT_AREA_LIMIT = 9;

const PORT_CHECK_TAG = /<port-check [^>]*\/>/u;

const FIX_AREAS_MAX = 4;

const toTagFields = (tag: string): Map<string, string> => {
  const fields = new Map<string, string>();

  for (const part of tag.split('" ')) {
    const at = part.lastIndexOf(" ");
    const [key = "", value = ""] = part.slice(at + 1).split('="');

    fields.set(key, value.replaceAll('"', ""));
  }

  return fields;
};

const toPortCheckTag = (request: RunRequest | null): string | null => {
  if (request === null || request.task !== PORT_TASK) {
    return null;
  }

  const found = PORT_CHECK_TAG.exec(request.prompt);

  if (found === null) {
    return null;
  }

  return found[0];
};

const toPortCheckInput = (
  request: RunRequest | null
): PortCheckInput | null => {
  const tag = toPortCheckTag(request);

  if (tag === null) {
    return null;
  }

  const fields = toTagFields(tag);
  const projectId = fields.get("projectId") ?? "";
  const targetProjectId = fields.get("targetProjectId") ?? "";
  const path = fields.get("path") ?? "";
  const routePath = fields.get("routePath") ?? "";
  const directionId = fields.get("directionId") ?? "";

  if ([projectId, targetProjectId, path, routePath, directionId].includes("")) {
    return null;
  }

  const limit = PORT_AREA_LIMIT;

  return {
    directionId,
    limit,
    path,
    projectId,
    routePath,
    targetProjectId,
    width: PORT_CHECK_WIDTH,
  };
};

const toAreaText = (count: number): string => {
  if (count === 0) {
    return "every area matches";
  }

  if (count === 1) {
    return "1 area differs";
  }

  return `${count} areas differ`;
};

const toFixPrompt = (match: PortMatchWire, tag: string): string => {
  const areas = match.areas
    .slice(0, FIX_AREAS_MAX)
    .map((area) => `${area.name} (${area.score}/100)`)
    .join(", ");

  return [
    `The app route matches its prototype page at ${match.score}/100. The bar is 80. The areas that differ most: ${areas}.`,
    `Make these areas of the route match the prototype: layout, spacing, sizes, colors and type. The side-by-side diff is at ${match.diffPath}.`,
    tag,
    "When you are done, call inspect_port with these five values and reply with the new score.",
  ].join("\n\n");
};

export { toAreaText, toFixPrompt, toPortCheckInput, toPortCheckTag };

export type { PortCheckInput };
