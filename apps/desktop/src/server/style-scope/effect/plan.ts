import path from "node:path";

import type { EffectItem, WrittenFile } from "./deps.js";
import { hasShader, toLayerClass } from "./engine/index.js";
import { EffectError } from "./errors.js";
import { getReferenceCount } from "./references.js";
import { toShaderRuntimePlan } from "./runtime-plan.js";
import {
  NO_SHEET,
  toClassChange,
  toCurrent,
  toKindsTitle,
  toNextStyle,
} from "./set-plan.js";
import type {
  CurrentClasses,
  EffectScope,
  EffectSetPlan,
  EffectSetRequest,
} from "./set-plan.js";
import {
  toClassedCode,
  toLinkedCode,
  toPrunedSheet,
  toSheetWithLayer,
} from "./sheet-edit.js";
import { getSheet, toNewSheet, toSheetRules } from "./sheet.js";
import type { SheetFile, SheetRule } from "./sheet.js";
import { getEffectSite } from "./site.js";
import type { EffectSite } from "./site.js";

interface Inputs {
  readonly rules: readonly SheetRule[];
  readonly sheet: SheetFile;
  readonly site: EffectSite;
}

interface RuntimeFiles {
  readonly code: string;
  readonly hasRuntime: boolean;
  readonly written: WrittenFile[];
}

const NOTHING = "The layer already has these effects.";

const toLinkedForUse = (
  inputs: Inputs,
  code: string,
  isUsed: boolean
): string => {
  if (!isUsed) {
    return code;
  }

  return toLinkedCode(inputs.site, inputs.sheet, code);
};

const getInputs = async (
  scope: EffectScope,
  request: EffectSetRequest
): Promise<Inputs> => {
  const [site, found] = await Promise.all([
    getEffectSite(scope.workTree, request.target.source),
    getSheet(scope.workTree),
  ]);

  if (found === null && !site.isHtml) {
    throw new EffectError(NO_SHEET);
  }

  const sheet = found ?? toNewSheet(scope.workTree);

  return { rules: toSheetRules(sheet.text), sheet, site };
};

const toWrittenFile = (
  scope: EffectScope,
  relative: string,
  original: string,
  code: string
): WrittenFile => ({
  code,
  original,
  target: { file: path.join(scope.workTree, relative), relative },
});

const toRuntimeFiles = async (
  scope: EffectScope,
  site: EffectSite,
  code: string,
  isNeeded: boolean
): Promise<RuntimeFiles> => {
  const none = { code, hasRuntime: false, written: [] };

  if (!isNeeded) {
    return none;
  }

  let target = null;

  if (site.isHtml) {
    target = { code, relative: site.relative };
  }

  const plan = await toShaderRuntimePlan(scope.workTree, target);

  if (plan.host === null) {
    return none;
  }

  if (plan.host.relative === site.relative) {
    return { code: plan.host.code, hasRuntime: true, written: plan.written };
  }

  return {
    code,
    hasRuntime: true,
    written: [
      ...plan.written,
      toWrittenFile(
        scope,
        plan.host.relative,
        plan.host.original,
        plan.host.code
      ),
    ],
  };
};

const toLayerEffects = (
  request: EffectSetRequest,
  current: CurrentClasses
): readonly EffectItem[] => request.effects ?? current.anon?.effects ?? [];

const toWrittenList = (
  scope: EffectScope,
  inputs: Inputs,
  nextSheet: string,
  runtime: RuntimeFiles
): WrittenFile[] => {
  const { sheet, site } = inputs;
  const written: WrittenFile[] = [];

  if (runtime.code !== site.code) {
    written.push(toWrittenFile(scope, site.relative, site.code, runtime.code));
  }

  if (nextSheet !== sheet.text) {
    written.push({
      code: nextSheet,
      created: sheet.isNew,
      original: sheet.text,
      target: { file: sheet.file, relative: sheet.relative },
    });
  }

  return [...written, ...runtime.written];
};

const toEffectSetPlan = async (
  scope: EffectScope,
  request: EffectSetRequest
): Promise<EffectSetPlan> => {
  const inputs = await getInputs(scope, request);
  const { rules, sheet, site } = inputs;
  const current = toCurrent(site.tokens, rules);
  const style = toNextStyle(request, current, rules);
  const effects = toLayerEffects(request, current);
  let layerClass: string | null = null;

  if (effects.length > 0) {
    layerClass = toLayerClass(effects);
  }

  const change = toClassChange(site.tokens, [
    { next: layerClass, old: current.anon?.className ?? null },
    { next: style?.className ?? null, old: current.named?.className ?? null },
  ]);

  const classed = await toClassedCode(scope, request.target, change, site.code);

  const refs = await getReferenceCount(
    scope.workTree,
    current.anon?.className ?? "",
    new Map([[site.relative, classed]])
  );

  const nextSheet = toPrunedSheet(
    toSheetWithLayer(sheet, rules, effects, layerClass),
    current.anon,
    refs
  );

  const runtime = await toRuntimeFiles(
    scope,
    site,
    toLinkedForUse(inputs, classed, layerClass !== null || style !== null),
    hasShader(effects) || hasShader(style?.effects ?? [])
  );

  const written = toWrittenList(scope, inputs, nextSheet, runtime);

  if (written.length === 0) {
    throw new EffectError(NOTHING);
  }

  return {
    className: layerClass,
    hasRuntime: runtime.hasRuntime,
    styleName: style?.name ?? null,
    title: toKindsTitle(effects, style?.name ?? null),
    written,
  };
};

export { toEffectSetPlan };
