import { useCallback, useState } from "react";

import { drafts, readSend, writeSend } from "./comment-composer-model.js";

interface ComposerDraft {
  changeText: (value: string) => void;
  changeToClaude: (isOn: boolean) => void;
  clearText: () => void;
  text: string;
  toClaude: boolean;
}

const useComposerDraft = (draftKey: string): ComposerDraft => {
  const [text, setText] = useState(() => drafts.get(draftKey) ?? "");
  const [toClaude, setToClaude] = useState(readSend);

  const changeText = useCallback(
    (value: string): void => {
      setText(value);

      if (value.trim() === "") {
        drafts.delete(draftKey);
      } else {
        drafts.set(draftKey, value);
      }
    },
    [draftKey]
  );

  const changeToClaude = useCallback((isOn: boolean): void => {
    setToClaude(isOn);
    writeSend(isOn);
  }, []);

  const clearText = useCallback((): void => {
    drafts.delete(draftKey);
    setText("");
  }, [draftKey]);

  return { changeText, changeToClaude, clearText, text, toClaude };
};

export { useComposerDraft };

export type { ComposerDraft };
