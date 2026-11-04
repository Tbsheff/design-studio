import { randomBytes } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  ICON_PACKAGES,
  planInsertJsx,
  positionAt,
  resolveSource,
} from "./deps.js";
import type {
  IconPosition,
  IconSource,
  InsertScope,
  InsertTarget,
  JsxInsertPlan,
  SourceLoc,
} from "./deps.js";
import { applySplice, iconImport } from "./imports.js";
import { appRoot, iconSetFor, usesJsx } from "./library.js";
import { matchNames } from "./list.js";
import { IconError } from "./set.js";
import type { IconSet } from "./set.js";
import { componentMarkup, svgMarkup } from "./svg.js";
import type { SvgLook } from "./svg.js";

interface IconInsertRequest {
  color?: string | undefined;
  library?: IconSource | undefined;
  name: string;
  position: IconPosition;
  size: number;
  target: InsertTarget;
}

interface Placed {
  code: string;
  importAdded: boolean;
  select: JsxInsertPlan["select"];
}

interface IconInsertPlan extends Placed {
  icon: string;
  importFrom: string | null;
  library: IconSource;
  markup: string;
  original: string;
  swapped: boolean;
  target: JsxInsertPlan["target"];
  title: string;
}

interface IconMarkup {
  component: string | null;
  markup: string;
}

interface SlotFill {
  component: string;
  from: string;
  markup: string;
  slot: string;
}

const ICON_TAG = /^<(?<tag>[A-Za-z][\w.]*)/u;
const ICON_COMPONENT = /^Icon[A-Z]|Icon$/u;
const SLOT_BYTES = 6;
const HINTS_MAX = 8;

const offsetOf = (code: string, at: SourceLoc): number => {
  const lines = code.split("\n").slice(0, at.line - 1);
  const before = lines.reduce((sum, line) => sum + line.length + 1, 0);

  return before + at.col - 1;
};

const importedFromIcons = (tag: string, code: string): boolean =>
  ICON_PACKAGES.some((name) =>
    code
      .split("\n")
      .some(
        (line) =>
          line.startsWith("import ") &&
          line.includes(tag) &&
          line.includes(`"${name}`)
      )
  );

const isIconTag = (tag: string, code: string): boolean =>
  tag === "svg" || ICON_COMPONENT.test(tag) || importedFromIcons(tag, code);

const sourceFile = async (
  scope: InsertScope,
  target: InsertTarget
): Promise<string | null> => {
  if (!target.source) {
    return null;
  }

  try {
    const resolved = await resolveSource(scope.workTree, target.source.file);

    return resolved.file;
  } catch {
    return null;
  }
};

const readCode = async (file: string): Promise<string> => {
  try {
    return await readFile(file, "utf-8");
  } catch {
    return "";
  }
};

const targetIsIcon = async (
  file: string | null,
  target: InsertTarget
): Promise<boolean> => {
  if (!file || !target.source) {
    return target.tag === "svg";
  }

  const code = await readCode(file);
  const head = code.slice(offsetOf(code, target.source));
  const tag = ICON_TAG.exec(head)?.groups?.["tag"];

  if (!tag) {
    return target.tag === "svg";
  }

  return isIconTag(tag, code);
};

const iconName = async (set: IconSet, raw: string): Promise<string> => {
  const name = await set.resolve(raw);

  if (name) {
    return name;
  }

  const [stem] = raw.split("-");
  const near = matchNames(await set.names(), stem ?? raw).slice(0, HINTS_MAX);
  const parts = [`No icon named ${raw} in ${set.source}.`];

  if (near.length > 0) {
    parts.push(`Close names: ${near.join(", ")}.`);
  }

  parts.push("Use list_icons to search.");

  throw new IconError(parts.join(" "));
};

const iconMarkup = async (
  set: IconSet,
  look: SvgLook,
  jsx: boolean
): Promise<IconMarkup> => {
  const component = await set.component(look.name);

  if (component && set.importFrom) {
    return { component, markup: componentMarkup(component, look) };
  }

  const nodes = (await set.nodes(look.name)) ?? [];

  if (nodes.length === 0) {
    throw new IconError(`The icon ${look.name} has no shapes in ${set.source}`);
  }

  return { component: null, markup: svgMarkup(nodes, set.frame, look, jsx) };
};

const fillSlot = (plan: JsxInsertPlan, fill: SlotFill): Placed => {
  const at = plan.code.indexOf(fill.slot);

  if (at === -1) {
    throw new IconError("The icon could not be placed in the file");
  }

  const placed =
    plan.code.slice(0, at) +
    fill.markup +
    plan.code.slice(at + fill.slot.length);

  const edit = iconImport(placed, {
    component: fill.component,
    file: plan.target.relative,
    from: fill.from,
  });

  const splice = edit.splice ?? { end: 0, start: 0, text: "" };
  const code = applySplice(placed, splice);
  const shift = Number(splice.start <= at) * splice.text.length;
  const position = positionAt(code, at + shift);

  const select = plan.select.map((item) => ({
    ...item,
    ...position,
    tag: fill.component,
  }));

  const importAdded = edit.added;

  return { code, importAdded, select };
};

const titleOf = (swapped: boolean, name: string): string => {
  if (swapped) {
    return `Swap icon for ${name}`;
  }

  return `Insert ${name} icon`;
};

const slotText = (): string =>
  [
    "<",
    'svg data-studio-icon-slot="',
    randomBytes(SLOT_BYTES).toString("hex"),
    '" />',
  ].join("");

const insertPosition = (
  swapped: boolean,
  position: IconPosition
): IconPosition | "replace" => {
  if (swapped) {
    return "replace";
  }

  return position;
};

const placeIcon = async (
  scope: InsertScope,
  request: IconInsertRequest,
  found: IconMarkup & { from: string | null; swapped: boolean }
): Promise<{ placed: Placed; plan: JsxInsertPlan }> => {
  const slot = slotText();
  const fill = { component: found.component ?? "", from: found.from ?? "" };
  const filled = Boolean(fill.component && fill.from);
  const snippet = [found.markup, slot][Number(filled)] ?? found.markup;

  const plan = await planInsertJsx(scope, {
    jsx: snippet,
    position: insertPosition(found.swapped, request.position),
    target: request.target,
  });

  if (!filled) {
    return {
      placed: { code: plan.code, importAdded: false, select: plan.select },
      plan,
    };
  }

  const placed = fillSlot(plan, { ...fill, markup: found.markup, slot });

  return { placed, plan };
};

const planIconInsert = async (
  scope: InsertScope,
  request: IconInsertRequest
): Promise<IconInsertPlan> => {
  const file = await sourceFile(scope, request.target);
  const start = path.dirname(file ?? path.join(appRoot(scope), "page"));

  const [set, swapped] = await Promise.all([
    iconSetFor(scope, start, request.library ?? null),
    targetIsIcon(file, request.target),
  ]);

  const icon = await iconName(set, request.name);
  const look = { color: request.color ?? null, name: icon, size: request.size };
  const found = await iconMarkup(set, look, usesJsx(scope));
  const importFrom = (found.component && set.importFrom) || null;

  const { placed, plan } = await placeIcon(scope, request, {
    ...found,
    from: importFrom,
    swapped,
  });

  return {
    ...placed,
    icon,
    importFrom,
    library: set.source,
    markup: found.markup,
    original: plan.original,
    swapped,
    target: plan.target,
    title: titleOf(swapped, icon),
  };
};

export { planIconInsert };

export type { IconInsertPlan, IconInsertRequest };
