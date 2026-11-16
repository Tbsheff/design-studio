import { looksLikeFigmaNodes } from "@design-studio/contracts/figma-nodes";
import { useCallback, useState } from "react";
import type { ChangeEvent, ReactElement } from "react";

import { pick } from "../../platform/pick.js";
import { copy } from "./copy.js";
import { toNodesUrl } from "./figma-import-model.js";

interface Props {
  readonly link: string;
  readonly onUse: (nodes: string) => void;
}

const FigmaJsonPaste = ({ link, onUse }: Props): ReactElement => {
  const [text, setText] = useState("");
  const [isBad, setIsBad] = useState(false);

  const handleTextEdit = useCallback(
    (event: ChangeEvent<HTMLTextAreaElement>): void => {
      setText(event.target.value);
      setIsBad(false);
    },
    []
  );

  const handleUse = useCallback((): void => {
    const nodes = text.trim();

    if (!looksLikeFigmaNodes(nodes)) {
      setIsBad(true);

      return;
    }

    onUse(nodes);
  }, [onUse, text]);

  return (
    <div className="field">
      <label className="field">
        <span>{copy.frameJson}</span>
        <textarea
          className="mono"
          rows={5}
          value={text}
          spellCheck={false}
          placeholder={copy.nodes}
          aria-invalid={isBad}
          aria-describedby="fgi-json-help"
          onChange={handleTextEdit}
        />
      </label>
      <p id="fgi-json-help" className="fgi-facts">
        {pick(isBad, copy.notFigmaFrameJson, "")}
        {copy.open2}
        {toNodesUrl(link)}
        {copy.withYourFigmaToken}
      </p>
      <div>
        <button
          type="button"
          className="btn"
          disabled={text.trim() === ""}
          onClick={handleUse}
        >
          {copy.applyJson}
        </button>
      </div>
    </div>
  );
};

export { FigmaJsonPaste };
