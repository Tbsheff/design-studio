import type { TextEditor } from "./text-edit.js";

interface HistoryKeyBody {
  readonly type: "history-key";
  readonly redo: boolean;
  readonly isNotice: boolean;
}

type PostHistoryKey = (body: HistoryKeyBody) => void;

const TYPING_TAGS = new Set(["INPUT", "TEXTAREA", "SELECT"]);

const toHistoryKey = (redo: boolean, isNotice: boolean): HistoryKeyBody => ({
  isNotice,
  redo,
  type: "history-key",
});

const isTypingElement = (target: EventTarget | null): boolean =>
  target instanceof HTMLElement &&
  (target.isContentEditable || TYPING_TAGS.has(target.tagName));

const isHistoryKey = (event: KeyboardEvent): boolean =>
  (event.metaKey || event.ctrlKey) &&
  !event.altKey &&
  event.key.toLowerCase() === "z";

const historyKeyBody = (event: KeyboardEvent): HistoryKeyBody | null => {
  if (!isHistoryKey(event)) {
    return null;
  }

  if (isTypingElement(event.composedPath()[0] ?? event.target)) {
    return null;
  }

  return toHistoryKey(event.shiftKey, false);
};

const noteHistoryKeys = (post: PostHistoryKey): void => {
  window.addEventListener(
    "keydown",
    (event) => {
      if (isHistoryKey(event) && !event.repeat) {
        post(toHistoryKey(event.shiftKey, true));
      }
    },
    { capture: true }
  );
};

const forwardHistoryKeys = (post: PostHistoryKey): void => {
  window.addEventListener(
    "keydown",
    (event) => {
      const body = historyKeyBody(event);

      if (!body) {
        return;
      }

      event.preventDefault();
      post(body);
    },
    { capture: true }
  );
};

const toEditCommand = (redo: boolean): "redo" | "undo" => {
  if (redo) {
    return "redo";
  }

  return "undo";
};

const runTextUndo = (
  editor: Pick<TextEditor, "editing" | "onKeyDown">,
  redo: boolean,
  post: PostHistoryKey
): void => {
  if (editor.editing()) {
    editor.onKeyDown(
      new KeyboardEvent("keydown", {
        cancelable: true,
        key: "z",
        metaKey: true,
        shiftKey: redo,
      })
    );

    return;
  }

  if (isTypingElement(document.activeElement)) {
    document.execCommand(toEditCommand(redo));

    return;
  }

  post(toHistoryKey(redo, false));
};

export {
  forwardHistoryKeys,
  historyKeyBody,
  isHistoryKey,
  noteHistoryKeys,
  runTextUndo,
};
