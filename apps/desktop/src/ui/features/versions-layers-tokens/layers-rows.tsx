import type { LayerNode } from "@design-studio/contracts";
import { useMemo } from "react";
import type { ReactNode, Ref } from "react";

import type { LayerRowCallbacks } from "./layer-row-callbacks-model.js";
import { LayerRow } from "./layer-row.js";
import { ROW } from "./layers-constants.js";
import { LayersDropLine } from "./layers-drop-line.js";

interface LayersRowsProps {
  readonly callbacks: LayerRowCallbacks;
  readonly collapsed: ReadonlySet<number>;
  readonly dimmed: ReadonlySet<number>;
  readonly dropInto: number | null;
  readonly dropLine: number | null;
  readonly editingKey: string | null;
  readonly first: number;
  readonly hoveredNode: number | null;
  readonly isEditable: boolean;
  readonly keys: Map<number, string>;
  readonly last: number;
  readonly rows: LayerNode[];
  readonly ref: Ref<HTMLDivElement>;
  readonly selectedNode: number | null;
}

const LayersRows = (props: LayersRowsProps): ReactNode => {
  const { callbacks, dropLine, editingKey, first, keys, last, ref, rows } =
    props;

  const rowsStyle = useMemo(() => ({ height: rows.length * ROW }), [rows]);

  return (
    <div ref={ref} className="layers-rows" style={rowsStyle}>
      {rows.slice(first, last).map((node, index) => (
        <LayerRow
          key={node.id}
          onHover={callbacks.handleHover}
          onMenu={callbacks.handleMenu}
          onPress={callbacks.handlePress}
          onRenameDone={callbacks.handleRenameDone}
          onSelect={callbacks.handleSelect}
          onStartRename={callbacks.handleStartRename}
          onToggle={callbacks.handleToggle}
          onToggleHidden={callbacks.handleToggleHidden}
          onToggleLocked={callbacks.handleToggleLocked}
          node={node}
          top={(first + index) * ROW}
          isSelected={node.id === props.selectedNode}
          isCollapsed={props.collapsed.has(node.id)}
          isDimmed={props.dimmed.has(node.id)}
          isEditing={editingKey !== null && keys.get(node.id) === editingKey}
          isEditable={props.isEditable}
          isHovered={node.id === props.hoveredNode}
          dropInto={props.dropInto === node.id}
        />
      ))}
      {dropLine !== null && <LayersDropLine line={dropLine} />}
    </div>
  );
};

export { LayersRows };
