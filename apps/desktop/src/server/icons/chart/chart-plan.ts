import { randomBytes } from "node:crypto";

import type { InsertTarget } from "@design-studio/contracts/insert";

import { loadLibrary, planImports } from "../../components/index.js";
import { planInsertJsx, seenImports } from "../../direct-edit/index.js";
import type { InsertScope, JsxInsertPlan } from "../../direct-edit/index.js";
import { loadTypeScript } from "../../platform/ts-compiler/index.js";
import {
  hasClientDirective,
  isServerOnly,
  toAst,
  toDeclared,
  toDirectiveSplice,
  toFreeName,
  toSplicedAt,
} from "./chart-module.js";
import type { Edited, Splice } from "./chart-module.js";
import type { ChartInspection, ChartMode } from "./chart-probe.js";
import { ChartRequestError } from "./chart-request-error.js";
import {
  toChartJsx,
  toChartSvg,
  toColorExpressions,
  toPosition,
} from "./engine/index.js";
import type { ChartJsx, ChartSpec } from "./engine/index.js";

interface ChartPlanRequest {
  readonly inspection: ChartInspection;
  readonly position: string;
  readonly spec: ChartSpec;
  readonly target: InsertTarget;
}

interface ChartPlan {
  readonly code: string;
  readonly layerId: string;
  readonly mode: ChartMode;
  readonly original: string;
  readonly target: JsxInsertPlan["target"];
  readonly title: string;
}

interface Styled {
  readonly jsx: ChartJsx | null;
  readonly markup: string;
}

interface JsxContext {
  readonly base: JsxInsertPlan;
  readonly request: ChartPlanRequest;
  readonly scope: InsertScope;
}

const SLOT_BYTES = 6;

const HTML_FILE = /\.html?$/iu;

const TAG_OPEN = "<";

const TAG_NAME = "div";

const SLOT_ATTR = "data-studio-chart-slot";

const toSlotId = (): string => randomBytes(SLOT_BYTES).toString("hex");

const toSlotJsx = (id: string): string =>
  [TAG_OPEN, TAG_NAME, " ", SLOT_ATTR, "=", JSON.stringify(id), " />"].join("");

const toSlotPattern = (id: string): RegExp =>
  new RegExp(
    [
      TAG_OPEN,
      TAG_NAME,
      " ",
      SLOT_ATTR,
      '="',
      id,
      String.raw`"\s*(?:/>|>\s*</div>)`,
    ].join(""),
    "u"
  );

const toIndented = (markup: string, lead: string): string =>
  markup.split("\n").join(`\n${lead}`);

const toLead = (code: string, at: number): string => {
  const start = code.lastIndexOf("\n", at - 1) + 1;
  const before = code.slice(start, at);

  if (before.trim() === "") {
    return before;
  }

  return "";
};

const toFilled = (code: string, id: string, markup: string): Edited => {
  const found = toSlotPattern(id).exec(code);

  if (found === null) {
    throw new ChartRequestError("The chart could not be placed in the file.");
  }

  const filled = toIndented(markup, toLead(code, found.index));
  const after = found.index + found[0].length;

  return {
    code: code.slice(0, found.index) + filled + code.slice(after),
    offset: found.index,
  };
};

const toKitSplices = async (
  context: JsxContext,
  edited: Edited,
  names: readonly string[]
): Promise<Splice[]> => {
  const { base, request, scope } = context;
  const { kit } = request.inspection;

  if (kit === null || names.length === 0) {
    return [];
  }

  const library = await loadLibrary(scope.project, scope.workTree);
  const ast = toAst(edited.code, base.target.file);
  const ts = await loadTypeScript();

  const common = {
    allowPaths: scope.project.app?.framework === "next",
    componentFile: kit.absolute,
    kind: "named" as const,
    root: library.root,
    seen: seenImports(library.specifiers),
    targetFile: base.target.file,
  };

  const needs = names.map((name) => ({ ...common, name }));

  return planImports(ts, edited.code, ast, needs).splices;
};

const shouldAddDirective = (context: JsxContext, code: string): boolean => {
  const { base, request, scope } = context;

  if (request.inspection.mode === "svg") {
    return false;
  }

  if (scope.project.app?.framework !== "next") {
    return false;
  }

  if (hasClientDirective(toAst(code, base.target.file))) {
    return false;
  }

  if (isServerOnly(code)) {
    throw new ChartRequestError(
      `${base.target.relative} is a server component, and Recharts needs a client component. Select a layer inside a client component, or add "use client" to the file.`
    );
  }

  return true;
};

const toStyled = (base: JsxInsertPlan, request: ChartPlanRequest): Styled => {
  const { inspection, spec } = request;
  const colors = toColorExpressions(inspection.colorTokens);
  const isHtml = HTML_FILE.test(base.target.relative);

  if (inspection.mode === "svg" || isHtml) {
    return { jsx: null, markup: toChartSvg(spec, { colors, isJsx: !isHtml }) };
  }

  const jsx = toChartJsx(spec, {
    colors,
    configName: toFreeName(base.code, "chartConfig"),
    dataName: toFreeName(base.code, "chartData"),
    isKit: inspection.mode === "kit",
  });

  return { jsx, markup: jsx.jsx };
};

const toJsxEdits = async (
  context: JsxContext,
  start: Edited,
  jsx: ChartJsx
): Promise<Edited> => {
  let edited = start;

  if (shouldAddDirective(context, edited.code)) {
    edited = toSplicedAt(edited, [toDirectiveSplice()]);
  }

  const kitSplices = await toKitSplices(context, edited, jsx.kitNames);

  edited = toSplicedAt(edited, kitSplices);

  const declarations = [jsx.dataCode, jsx.configCode ?? ""].filter(
    (item) => item !== ""
  );

  const top = { declarations, imports: jsx.rechartsNames };

  return toSplicedAt(
    edited,
    toDeclared(edited.code, context.base.target.file, top)
  );
};

const createChartPlan = async (
  scope: InsertScope,
  request: ChartPlanRequest
): Promise<ChartPlan> => {
  const slotId = toSlotId();

  const base = await planInsertJsx(scope, {
    jsx: toSlotJsx(slotId),
    position: request.position,
    target: request.target,
  });

  const styled = toStyled(base, request);
  let edited = toFilled(base.code, slotId, styled.markup);

  if (styled.jsx !== null) {
    edited = await toJsxEdits({ base, request, scope }, edited, styled.jsx);
  }

  const position = toPosition(edited.code, edited.offset);

  return {
    code: edited.code,
    layerId: `${base.target.relative}:${position.line}:${position.col}`,
    mode: request.inspection.mode,
    original: base.original,
    target: base.target,
    title: `Insert ${request.spec.kind} chart`,
  };
};

export { createChartPlan };

export type { ChartPlan, ChartPlanRequest };
