import { rule } from "./ast.js";

const STAMPED_ROOT = /^src\/(?:shared\/actions|server\/handlers)\//u;

const GENERATED_TABLE = /^src\/(?:shared\/actions|server\/handlers)\/\*\/(?:index|routes|handlers)\.ts$/u;

const SLOT_SOURCE = /(?:^|\/)platform\/runtime-slot\/index\.js$|(?:^|\/)deps\.js$/u;

const SLOT_NAMES = new Set(["makeRuntimeSlot"]);

const WIDE_MESSAGE =
  "A glob over stamped code (packages/common/actions/src or src/server/handlers) in a lint exemption list is banned, because stamped actions and handlers stay at 0 diagnostics. Use the exact legacy file paths in lint/plugins/studio/frozen.js.";

const SLOT_MESSAGE =
  "A new runtime slot (makeRuntimeSlot) is banned, because a hidden mutable slot that a route module binds skips the Layers built at boot. Use a Context.Service with a static layer, provided in src/server/handlers/<domain>/live.ts.";

const isWideGlob = (value) =>
  STAMPED_ROOT.test(value) && value.includes("*") && !GENERATED_TABLE.test(value);

const wideExemption = rule((context) => ({
  Literal: (node) => {
    const isListed = node.parent?.type === "ArrayExpression";

    if (isListed && node.value === String(node.value) && isWideGlob(node.value)) {
      context.report({ message: WIDE_MESSAGE, node });
    }
  },
}));

const isSlotImport = (node) => SLOT_SOURCE.test(String(node.source?.value ?? ""));

const checkSpecifiers = (context, node) => {
  if (!isSlotImport(node)) {
    return;
  }

  for (const specifier of node.specifiers) {
    const name = specifier.imported?.name ?? specifier.local?.name ?? null;

    if (SLOT_NAMES.has(name)) {
      context.report({ message: SLOT_MESSAGE, node: specifier });
    }
  }
};

const noNewRuntimeSlot = rule((context) => ({
  ExportNamedDeclaration: (node) => checkSpecifiers(context, node),
  ImportDeclaration: (node) => checkSpecifiers(context, node),
}));

export { noNewRuntimeSlot, wideExemption };
