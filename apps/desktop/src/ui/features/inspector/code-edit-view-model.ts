import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { syntaxHighlighting } from "@codemirror/language";
import type { Extension } from "@codemirror/state";
import type { EditorView } from "@codemirror/view";
import { classHighlighter } from "@lezer/highlight";

import { toLanguageOptions, toLineStart } from "./code-edit-model.js";

interface ViewOptions {
  readonly file: string;
  readonly initialText: string;
  readonly line: number;
  readonly onChange: (text: string) => void;
  readonly onSave: () => void;
}

const toLanguageExtensions = (file: string): Extension[] => {
  const options = toLanguageOptions(file);

  if (options === null) {
    return [];
  }

  return [javascript({ jsx: options.isJsx, typescript: options.isTypescript })];
};

const createCodeEditView = async (
  host: HTMLElement,
  options: ViewOptions
): Promise<EditorView> => {
  const [{ EditorState }, view] = await Promise.all([
    import("@codemirror/state"),
    import("@codemirror/view"),
  ]);

  const { drawSelection, highlightActiveLine, keymap, lineNumbers } = view;
  const View = view.EditorView;

  const saveKey = {
    key: "Mod-s",
    preventDefault: true,
    run: (): boolean => {
      options.onSave();

      return true;
    },
  };

  const state = EditorState.create({
    doc: options.initialText,
    extensions: [
      lineNumbers(),
      history(),
      drawSelection(),
      highlightActiveLine(),
      syntaxHighlighting(classHighlighter),
      ...toLanguageExtensions(options.file),
      keymap.of([saveKey, ...defaultKeymap, ...historyKeymap]),
      View.updateListener.of((update) => {
        if (update.docChanged) {
          options.onChange(update.state.doc.toString());
        }
      }),
    ],
  });

  const editor = new View({ parent: host, state });
  const at = state.doc.line(toLineStart(state.doc.lines, options.line)).from;

  editor.dispatch({
    effects: View.scrollIntoView(at, { y: "center" }),
    selection: { anchor: at },
  });
  editor.focus();

  return editor;
};

export { createCodeEditView };

export type { ViewOptions };
