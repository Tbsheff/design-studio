import type { LayerNode } from "@design-studio/contracts";
import { Icon } from "@design-studio/ui";
import { memo, useMemo } from "react";
import type { MouseEvent, PointerEvent, ReactNode } from "react";

import { toLayerIcon } from "./layer-icon-model.js";
import { LayerRowBadges } from "./layer-row-badges.js";
import { LayerRowLabel } from "./layer-row-label.js";
import {
  toAriaExpanded,
  toRowClass,
  toRowIndent,
  toRowText,
} from "./layer-row-model.js";
import { LayerTwisty } from "./layer-twisty.js";
import { TWISTY_ICON_SIZE } from "./layers-constants.js";
import { useLayerRowHandlers } from "./use-layer-row-handlers.js";

interface LayerRowProps {
  readonly dropInto: boolean;
  readonly isDimmed: boolean;
  readonly isCollapsed: boolean;
  readonly isEditable: boolean;
  readonly isEditing: boolean;
  readonly isHovered: boolean;
  readonly isSelected: boolean;
  readonly node: LayerNode;
  readonly onHover: (id: number | null) => void;
  readonly onMenu: (node: LayerNode, event: MouseEvent<HTMLDivElement>) => void;
  readonly onPress: (id: number, event: PointerEvent<HTMLDivElement>) => void;
  readonly onRenameDone: (
    node: LayerNode,
    value: string | null,
    next?: 1 | -1
  ) => void;
  readonly onSelect: (id: number, isAdditive: boolean) => void;
  readonly onStartRename: (id: number) => void;
  readonly onToggle: (id: number) => void;
  readonly onToggleHidden: (node: LayerNode) => void;
  readonly onToggleLocked: ((node: LayerNode) => void) | null;
  readonly top: number;
}

const LayerRowBase = (props: LayerRowProps): ReactNode => {
  const { dropInto, node, top } = props;
  const hovered = props.isHovered;
  const selected = props.isSelected;
  const handlers = useLayerRowHandlers(props);

  const paddingLeft = toRowIndent(node.depth);
  const style = useMemo(() => ({ paddingLeft, top }), [paddingLeft, top]);

  return (
    <div
      id={`layer-${node.id}`}
      role="treeitem"
      tabIndex={-1}
      aria-level={node.depth + 1}
      aria-selected={selected}
      aria-expanded={toAriaExpanded(node, props.isCollapsed)}
      className={toRowClass({
        dimmed: props.isDimmed,
        dropInto,
        hovered,
        node,
        selected,
      })}
      style={style}
      data-tip={toRowText(node)}
      onPointerEnter={handlers.handlePointerEnter}
      onPointerLeave={handlers.handlePointerLeave}
      onPointerDown={handlers.handlePointerDown}
      onDoubleClick={handlers.handleDoubleClick}
      onContextMenu={handlers.handleContextMenu}
    >
      <LayerTwisty
        id={node.id}
        isCollapsed={props.isCollapsed}
        isLeaf={node.childCount === 0}
        onToggle={props.onToggle}
      />
      <span className="layers-kind" aria-hidden="true">
        <Icon name={toLayerIcon(node)} size={TWISTY_ICON_SIZE} />
      </span>
      <LayerRowLabel
        isEditing={props.isEditing}
        node={node}
        onRenameDone={props.onRenameDone}
      />
      <LayerRowBadges
        isEditable={props.isEditable}
        isEditing={props.isEditing}
        node={node}
        onToggleHidden={props.onToggleHidden}
        onToggleLocked={props.onToggleLocked}
      />
    </div>
  );
};

const LayerRow = memo(LayerRowBase);

export { LayerRow };

export type { LayerRowProps };
