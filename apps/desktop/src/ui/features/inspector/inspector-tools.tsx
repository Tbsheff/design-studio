import type { SelectionContext } from "@design-studio/contracts";
import { useCallback } from "react";
import type { MutableRefObject, ReactElement } from "react";

import type { PreviewPort } from "../../platform/bridge.js";
import { PREVIEW_HISTORY_EVENT } from "../canvas/use-undo-shortcut.js";
import {
  VECTOR_TOOLS,
  useVectorTool,
  vectorTool,
} from "../canvas/vector-tool-model.js";
import { copy } from "./copy.js";
import { HistoryButton } from "./history-button.js";
import { InsertButton } from "./insert-button.js";
import { SelectButton } from "./select-button.js";
import { SelectChildButton } from "./select-child-button.js";
import { INSERTS } from "./tools-model.js";
import type { DirectEditControl } from "./use-direct-edit.js";
import { useInspectorTools } from "./use-inspector-tools.js";
import { VariantsButton } from "./variants-button.js";
import { VectorButtons } from "./vector-buttons.js";

interface Props {
  readonly projectId: string;
  readonly directionId: string | null;
  readonly selection: SelectionContext[];
  readonly port: MutableRefObject<PreviewPort | null>;
  readonly control: MutableRefObject<DirectEditControl | null>;
  readonly isSelectMode: boolean;
  readonly onSelectMode?: () => void;
  readonly onUndo?: () => void;
  readonly onRedo?: () => void;
}

const InspectorTools = (props: Props): ReactElement => {
  const { tool, available } = useVectorTool();

  const tools = useInspectorTools({
    control: props.control,
    directionId: props.directionId,
    historyEvent: PREVIEW_HISTORY_EVENT,
    onRedo: props.onRedo ?? null,
    onSelectMode: props.onSelectMode ?? null,
    onUndo: props.onUndo ?? null,
    port: props.port,
    projectId: props.projectId,
    selection: props.selection,
  });

  const handleVector = useCallback((id: string): void => {
    const found = VECTOR_TOOLS.find((item) => item.id === id);

    if (found) {
      vectorTool.toggle(found.id);
    }
  }, []);

  return (
    <div className="ins-tools-wrap">
      <div className="ins-tools" role="toolbar" aria-label={copy.editTools}>
        <SelectButton
          isSelectMode={props.isSelectMode}
          onSelect={tools.handleSelect}
        />
        <SelectChildButton
          hasSelection={tools.hasSelection}
          onSelectChild={tools.handleSelectChild}
        />
        <span className="ins-tools-sep" aria-hidden="true" />
        {INSERTS.map((item) => (
          <InsertButton
            key={item.kind}
            item={item}
            insertTip={tools.insertTip}
            onInsert={tools.handleInsert}
          />
        ))}
        <VectorButtons
          items={VECTOR_TOOLS}
          activeId={tool}
          isAvailable={available}
          onToggle={handleVector}
        />
        <span className="ins-tools-sep" aria-hidden="true" />
        <VariantsButton />
        <span className="ins-tools-end" />
        <HistoryButton isRedo={false} onHistory={tools.handleHistory} />
        <HistoryButton isRedo onHistory={tools.handleHistory} />
      </div>
      {tools.notice && (
        <p className="ins-tools-notice" role="alert">
          {tools.notice}
        </p>
      )}
    </div>
  );
};

export { InspectorTools };
