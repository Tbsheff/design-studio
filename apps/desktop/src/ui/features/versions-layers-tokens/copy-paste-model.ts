import type {
  SelectionContext,
  StructureEditRequest,
  StructureTarget,
} from "@design-studio/contracts";

type WaitingKind = "copy" | "cut";

interface WaitingLayers {
  readonly head: string | null;
  readonly kind: WaitingKind;
  readonly markup: string | null;
  readonly targets: StructureTarget[];
}

interface PasteInput {
  readonly clipboard: string | null;
  readonly head: string | null;
  readonly into: StructureTarget;
  readonly waiting: WaitingLayers;
}

type PasteStep =
  | { readonly kind: "clipboard"; readonly shouldClear: boolean }
  | { readonly kind: "changed" }
  | { readonly kind: "structure"; readonly request: StructureEditRequest };

const LEAF_TAGS = new Set([
  "img",
  "input",
  "hr",
  "br",
  "textarea",
  "select",
  "svg",
  "video",
  "iframe",
  "embed",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "span",
  "a",
  "button",
  "label",
  "strong",
  "em",
  "small",
  "code",
]);

const isLeafTag = (tag: string): boolean => LEAF_TAGS.has(tag.toLowerCase());

const isSameFile = (
  targets: readonly StructureTarget[],
  into: StructureTarget
): boolean =>
  targets.every((target) => target.source.file === into.source.file);

const isClipboardMoved = (
  clipboard: string | null,
  markup: string | null
): boolean =>
  clipboard !== null && markup !== null && clipboard.trim() !== markup.trim();

const isSameLoc = (first: StructureTarget, second: StructureTarget): boolean =>
  first.source.file === second.source.file &&
  first.source.line === second.source.line &&
  first.source.col === second.source.col;

const isCopiedLayer = (
  targets: readonly StructureTarget[],
  into: StructureTarget
): boolean => targets.some((target) => isSameLoc(target, into));

const toFlatText = (text: string): string =>
  text.replaceAll(/\s+/gu, " ").trim();

const isSameMarkup = (code: string | null, markup: string | null): boolean =>
  code !== null &&
  markup !== null &&
  toFlatText(code).length > 0 &&
  toFlatText(code) === toFlatText(markup);

const toDuplicateRequest = (
  targets: StructureTarget[],
  into: StructureTarget
): StructureEditRequest => {
  if (isCopiedLayer(targets, into)) {
    return { op: "duplicate", targets };
  }

  if (isLeafTag(into.tag ?? "")) {
    return { after: into, op: "duplicate", targets };
  }

  const op = "duplicate";

  return { into, op, targets };
};

const toCutStep = (input: PasteInput): PasteStep => {
  const { head, into, waiting } = input;

  if (waiting.head !== head) {
    return { kind: "changed" };
  }

  return {
    kind: "structure",
    request: { into, op: "move", targets: waiting.targets },
  };
};

const toPasteStep = (input: PasteInput): PasteStep => {
  const { clipboard, head, into, waiting } = input;

  if (waiting.kind === "cut") {
    return toCutStep(input);
  }

  const shouldClear = isClipboardMoved(clipboard, waiting.markup);

  if (
    shouldClear ||
    waiting.head !== head ||
    !isSameFile(waiting.targets, into)
  ) {
    return { kind: "clipboard", shouldClear };
  }

  return {
    kind: "structure",
    request: toDuplicateRequest(waiting.targets, into),
  };
};

type ReplaceNotice = "changed" | "copy-first" | "no-source" | "other-file";

type ReplaceStep =
  | { readonly kind: "notice"; readonly notice: ReplaceNotice }
  | { readonly kind: "structure"; readonly request: StructureEditRequest };

interface ReplaceInput {
  readonly head: string | null;
  readonly slots: StructureTarget[] | null;
  readonly waiting: WaitingLayers | null;
}

const toReplaceNotice = (input: ReplaceInput): ReplaceNotice | null => {
  const { head, slots, waiting } = input;

  if (waiting?.kind !== "copy") {
    return "copy-first";
  }

  if (!slots || slots.length === 0) {
    return "no-source";
  }

  if (waiting.head !== head) {
    return "changed";
  }

  if (!slots.every((slot) => isSameFile(waiting.targets, slot))) {
    return "other-file";
  }

  return null;
};

const toReplaceStep = (input: ReplaceInput): ReplaceStep => {
  const notice = toReplaceNotice(input);
  const targets = input.waiting?.targets ?? [];
  const replace = input.slots ?? [];

  if (notice) {
    return { kind: "notice", notice };
  }

  return {
    kind: "structure",
    request: { op: "duplicate", replace, targets },
  };
};

const toCopyNotice = (count: number, pasteKey: string): string => {
  if (count === 1) {
    return `Copied 1 layer. ${pasteKey} pastes it into the selection.`;
  }

  return `Copied ${count} layers. ${pasteKey} pastes them into the selection.`;
};

const toMarkup = (
  codes: readonly (string | null)[],
  selection: readonly SelectionContext[]
): string =>
  codes
    .flatMap((code, index) => {
      const text = code ?? selection[index]?.outerHTML ?? "";

      if (text.trim().length === 0) {
        return [];
      }

      return [text];
    })
    .join("\n");

const toCopyTarget = (entry: SelectionContext): StructureTarget | null => {
  const { selector, source, usedAt, usedBy } = entry;

  if (usedBy?.root && usedAt) {
    return { selector, source: usedAt };
  }

  if (!source) {
    return null;
  }

  return { selector, source, tag: entry.tag.toLowerCase() };
};

const toCopyTargets = (
  selection: readonly SelectionContext[]
): StructureTarget[] | null => {
  const targets = selection.flatMap((entry) => {
    const target = toCopyTarget(entry);

    if (!target) {
      return [];
    }

    return [target];
  });

  if (targets.length === 0 || targets.length !== selection.length) {
    return null;
  }

  return targets;
};

const toWaiting = (
  kind: WaitingKind,
  head: string | null,
  targets: StructureTarget[]
): WaitingLayers => {
  const markup = null;

  return { head, kind, markup, targets };
};

export {
  isLeafTag,
  isSameMarkup,
  toCopyNotice,
  toCopyTargets,
  toMarkup,
  toPasteStep,
  toReplaceStep,
  toWaiting,
};

export type { PasteStep, ReplaceNotice, WaitingLayers };
