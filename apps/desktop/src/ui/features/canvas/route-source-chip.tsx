import { Icon } from "@design-studio/ui";
import type { KeyboardEvent, ReactElement } from "react";
import { useCallback, useMemo } from "react";

import type { CanvasFrame } from "./canvas-layout-types.js";
import { copy } from "./copy.js";
import { FrameMenuItemButton } from "./frame-menu-item.js";
import { menuKeys, useMenu } from "./frame-menu-model.js";
import { useRouteSource } from "./use-route-source.js";
import { stop } from "./variation-model.js";

interface RouteSourceChipProps {
  readonly activate: (frame: CanvasFrame) => void;
  readonly directionId: string | null;
  readonly frames: readonly CanvasFrame[];
  readonly path: string | null;
  readonly projectId: string;
}

const RouteSourceChip = (props: RouteSourceChipProps): ReactElement | null => {
  const source = useRouteSource(props);
  const menu = useMenu();
  const { close, root, setOpen, trigger } = menu;
  const toggle = useCallback(() => setOpen((value) => !value), [setOpen]);

  const handleKeys = useCallback(
    (event: KeyboardEvent<HTMLElement>): void => menuKeys(event, close),
    [close]
  );

  const copyEntry = useMemo(
    () => ({
      icon: "reload" as const,
      id: "copy-app-again",
      label: copy.copyAppAgain,
      run: source.handleCopy,
    }),
    [source.handleCopy]
  );

  const compareEntry = useMemo(
    () => ({
      icon: "compare" as const,
      id: "compare-app-copy",
      label: copy.compareAppCopy,
      run: source.handleCompare,
    }),
    [source.handleCompare]
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
        disabled={source.isPending}
        data-tip={source.error ?? source.tip}
      >
        <Icon name="alert" size={12} />
        {label}
      </button>
      {menu.open && (
        <div
          className="ui-menu project-menu canvas-menu frame-menu"
          role="menu"
          tabIndex={-1}
          aria-label={copy.appChanged}
          onKeyDown={handleKeys}
        >
          <FrameMenuItemButton entry={copyEntry} close={close} />
          {source.copyFrame && (
            <FrameMenuItemButton entry={compareEntry} close={close} />
          )}
        </div>
      )}
    </div>
  );
};

export { RouteSourceChip };
