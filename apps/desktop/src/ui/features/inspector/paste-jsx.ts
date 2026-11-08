import type { SelectionContext } from "@design-studio/contracts";
import {
  looksLikeFigmaLink,
  looksLikeFigmaNodes,
} from "@design-studio/contracts/figma-nodes";
import type {
  InsertTarget,
  JsxInsertPosition,
} from "@design-studio/contracts/insert";

import {
  insertApi,
  insertError,
} from "../design-system/component-insert-api.js";

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

const targetOf = (selection: SelectionContext): InsertTarget => ({
  selector: selection.selector,
  source: selection.source,
  tag: selection.tag.toLowerCase(),
  ...(selection.owners?.length ? { owners: selection.owners } : {}),
});

const clipboardText = async (): Promise<string | null> => {
  try {
    return await navigator.clipboard.readText();
  } catch {
    return null;
  }
};

const openFigmaImport = async (
  ids: { readonly projectId: string; readonly directionId: string },
  selection: SelectionContext,
  text: string,
  notify: (message: string) => void
): Promise<void> => {
  const [{ createElement }, { createRoot }, dialog] = await Promise.all([
    import("react"),
    import("react-dom/client"),
    import("../share-publish-ship-export/figma-import-dialog.js"),
  ]);

  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);

  const close = () => {
    queueMicrotask(() => {
      root.unmount();
      host.remove();
    });
  };

  root.render(
    createElement(dialog.FigmaImportDialog, {
      canNest: !VOID.has(selection.tag.toLowerCase()),
      ids,
      onClose: close,
      onDone: notify,
      target: targetOf(selection),
      text,
    })
  );
};

const pasteJsx = async (
  ids: { readonly projectId: string; readonly directionId: string },
  selection: SelectionContext,
  notify: (message: string) => void
): Promise<void> => {
  const jsx = (await clipboardText())?.trim();

  if (jsx === undefined) {
    return notify(
      "The studio cannot read the clipboard. Allow clipboard access, then try again."
    );
  }

  if (looksLikeFigmaNodes(jsx) || looksLikeFigmaLink(jsx)) {
    return openFigmaImport(ids, selection, jsx, notify);
  }

  if (!jsx.startsWith("<")) {
    return notify(
      "The clipboard has no JSX. Copy a snippet such as <Card>…</Card> or Figma nodes JSON, then try again."
    );
  }

  const position: JsxInsertPosition = VOID.has(selection.tag.toLowerCase())
    ? "after"
    : "inside";

  try {
    const result = await insertApi.insertJsx(ids.projectId, ids.directionId, {
      jsx,
      position,
      target: targetOf(selection),
    });

    const added = (result.imports ?? []).filter((item) => item.added).length;
    notify(
      `${result.title}${added > 0 ? `, ${added} import${added === 1 ? "" : "s"} added` : ""}.`
    );
  } catch (error) {
    notify(insertError(error));
  }
};

export { pasteJsx };
