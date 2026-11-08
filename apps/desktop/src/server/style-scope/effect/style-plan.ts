import path from "node:path";

import type { EffectItem, WrittenFile } from "./deps.js";
import {
  fromSheetText,
  hasShader,
  toEffectDeclarations,
  toNamedClass,
  toRuleText,
  toSheetWithRule,
  toSheetWithoutRule,
} from "./engine/index.js";
import { EffectError } from "./errors.js";
import { getReferenceCount } from "./references.js";
import { toShaderRuntimePlan } from "./runtime-plan.js";
import type { EffectScope } from "./set-plan.js";
import { getRule, getSheet, toNewSheet, toSheetRules } from "./sheet.js";
import type { SheetFile } from "./sheet.js";

interface StyleCreatePlan {
  readonly className: string;
  readonly isNew: boolean;
  readonly title: string;
  readonly written: WrittenFile[];
}

interface StyleDeletePlan {
  readonly title: string;
  readonly usedBy: number;
  readonly written: WrittenFile[];
}

const toSheetWrite = (sheet: SheetFile, code: string): WrittenFile => ({
  code,
  created: sheet.isNew,
  original: sheet.text,
  target: { file: sheet.file, relative: sheet.relative },
});

const getSheetOrNew = async (scope: EffectScope): Promise<SheetFile> =>
  (await getSheet(scope.workTree)) ?? toNewSheet(scope.workTree);

const toRuntimeWrites = async (
  scope: EffectScope,
  effects: readonly EffectItem[]
): Promise<WrittenFile[]> => {
  if (!hasShader(effects)) {
    return [];
  }

  const runtime = await toShaderRuntimePlan(scope.workTree, null);
  const { host } = runtime;

  if (host === null || host.code === host.original) {
    return runtime.written;
  }

  return [
    ...runtime.written,
    {
      code: host.code,
      original: host.original,
      target: {
        file: path.join(scope.workTree, host.relative),
        relative: host.relative,
      },
    },
  ];
};

const toStyleCreatePlan = async (
  scope: EffectScope,
  name: string,
  effects: readonly EffectItem[]
): Promise<StyleCreatePlan> => {
  const sheet = await getSheetOrNew(scope);
  const styleClass = toNamedClass(name);
  const existing = getRule(toSheetRules(sheet.text), styleClass);

  const ruleText = toRuleText(
    styleClass,
    { effects, name },
    toEffectDeclarations(effects)
  );

  const code = toSheetWithRule(sheet.text, existing?.raw ?? null, ruleText);
  const files = await toRuntimeWrites(scope, effects);

  if (code !== sheet.text) {
    files.unshift(toSheetWrite(sheet, code));
  }

  if (files.length === 0) {
    throw new EffectError(
      `The effect style ${name} already has these effects.`
    );
  }

  return {
    className: styleClass,
    isNew: existing === null,
    title: `Effect style ${name}`,
    written: files,
  };
};

const toStyleDeletePlan = async (
  scope: EffectScope,
  name: string
): Promise<StyleDeletePlan> => {
  const sheet = await getSheetOrNew(scope);
  const styleClass = toNamedClass(name);

  const rule =
    fromSheetText(sheet.text).find((entry) => entry.className === styleClass) ??
    null;

  if (rule === null) {
    throw new EffectError(
      `No effect style is named ${name}. Call list_effect to see the names.`
    );
  }

  const count = await getReferenceCount(scope.workTree, styleClass, new Map());

  return {
    title: `Delete effect style ${name}`,
    usedBy: count,
    written: [toSheetWrite(sheet, toSheetWithoutRule(sheet.text, rule))],
  };
};

export { toStyleCreatePlan, toStyleDeletePlan };

export type { StyleCreatePlan, StyleDeletePlan };
