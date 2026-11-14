import { Icon } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useMemo } from "react";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { copy } from "./copy.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";
import { menuKeys, useMenu } from "./frame-menu-model.js";
import { toRouteSourceEntries } from "./route-source-model.js";
import { useMenuFit } from "./use-menu-fit.js";
import { useRouteMerge, useRouteSource } from "./use-route-source.js";
import { stop } from "./variation-model.js";

interface RouteSourceChipProps {
  readonly activate: (frame: CanvasFrame) => void;
  readonly directionId: string | null;
  readonly frameId: string;
  readonly frames: readonly CanvasFrame[];
  readonly path: string | null;
  readonly projectId: string;
}

const RouteSourceChip = (props: RouteSourceChipProps): ReactElement | null => {
  const source = useRouteSource(props);
  const merge = useRouteMerge(source.input);
  const menu = useMenu();
  const fitMenu = useMenuFit("root", null);
  const { close, root, setOpen, trigger } = menu;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);
  const isCopyShown = source.copyFrame !== null;

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  const entries = useMemo(
    () =>
      toRouteSourceEntries({
        handleCompare: source.handleCompare,
        handleCopy: source.handleCopy,
        handleMark: merge.handleMark,
        handleUpdate: merge.handleUpdate,
        hasCopyFrame: isCopyShown,
        isRunning: merge.isRunning,
      }),
    [
      isCopyShown,
      merge.handleMark,
      merge.handleUpdate,
      merge.isRunning,
      source.handleCompare,
      source.handleCopy,
    ]
  );

  if (!source.isChanged) {
    return null;
  }

  let label: string = copy.appChanged;

  if (source.isPending) {
    label = copy.copyingApp;
  }

  return (
    <div className="frame-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="frame-chip state warn"
        aria-haspopup="menu"
        aria-expanded={menu.open}
        aria-label={`${copy.appChanged}. ${source.tip}`}
        onPointerDown={stop}
        onClick={toggle}
        disabled={source.isPending || merge.isPending}
        data-tip={source.error ?? merge.error ?? source.tip}
      >
        <Icon name="alert" size={12} />
        {label}
      </button>
      {menu.open && (
        <div
          ref={fitMenu}
          className="ui-menu project-menu canvas-menu frame-menu"
          role="menu"
          tabIndex={-1}
          aria-label={copy.appChanged}
          onKeyDown={handleKeys}
        >
          {entries.map((entry) => (
            <FrameMenuItemButton key={entry.id} entry={entry} close={close} />
          ))}
        </div>
      )}
    </div>
  );
};

export { RouteSourceChip };
