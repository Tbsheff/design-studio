import type { SelectionContext } from "@design-studio/contracts";
import {
  looksLikeFigmaLink,
  looksLikeFigmaNodes,
} from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";

import { FigmaImportDialog, insertApi, insertError } from "./deps.js";

const VOID = new Set([
  "img",
  "input",
  "hr",
  "br",
  "textarea",
  "select",
  "meta",
  "link",
  "source",
  "track",
  "wbr",
  "col",
  "area",
  "embed",
]);

const toTarget = (selection: SelectionContext): InsertTarget => {
  const target: InsertTarget = {
    selector: selection.selector,
    source: selection.source,
    tag: selection.tag.toLowerCase(),
  };

  if (selection.owners?.length) {
    return { ...target, owners: selection.owners };
  }

  return target;
};

const getClipboardText = async (): Promise<string | null> => {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
};

const startFigmaImport = async (
  ids: { readonly projectId: string; readonly directionId: string },
  selection: SelectionContext,
  text: string,
  notify: (message: string) => void
): Promise<void> => {
  const [{ Suspense, createElement }, { createRoot }] = await Promise.all([
    import("react"),
    import("react-dom/client"),
  ]);

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  const close = (): void => {
    queueMicrotask(() => {
      root.unmount();
      host.remove();
    });
  };

  const canNest = !VOID.has(selection.tag.toLowerCase());
  const onClose = close;
  const onDone = notify;
  const target = toTarget(selection);

  const dialog = createElement(FigmaImportDialog, {
    canNest,
    ids,
    onClose,
    onDone,
    target,
    text,
  });

  root.render(createElement(Suspense, { fallback: null }, dialog));
};

const toInsertPosition = (selection: SelectionContext): JsxInsertPosition => {
  if (VOID.has(selection.tag.toLowerCase())) {
    return "after";
  }

  return "inside";
};

const toImportsText = (added: number): string => {
  if (added === 0) {
    return "";
  }

  let noun = "imports";

  if (added === 1) {
    noun = "import";
  }

  return `, ${added} ${noun} added`;
};

const applyPasteJsx = async (
  ids: { readonly projectId: string; readonly directionId: string },
  selection: SelectionContext,
  notify: (message: string) => void
): Promise<void> => {
  const clipboard = await getClipboardText();
  const jsx = clipboard?.trim() ?? null;

  if (jsx === null) {
    notify(
      "The studio cannot read the clipboard. Allow clipboard access, then try again."
    );

    return;
  }

  if (looksLikeFigmaNodes(jsx) || looksLikeFigmaLink(jsx)) {
    await startFigmaImport(ids, selection, jsx, notify);

    return;
  }

  if (!jsx.startsWith("<")) {
    notify(
      "The clipboard has no JSX. Copy a snippet such as <Card>…</Card> or Figma nodes JSON, then try again."
    );

    return;
  }

  try {
    const result = await insertApi.insertJsx(ids.projectId, ids.directionId, {
      jsx,
      position: toInsertPosition(selection),
      target: toTarget(selection),
    });

    const added = (result.imports ?? []).filter((item) => item.added).length;
    notify(`${result.title}${toImportsText(added)}.`);
  } catch (error) {
    notify(insertError(error));
  }
};

export { applyPasteJsx };
