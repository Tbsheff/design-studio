import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { cleanFramePath } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { useMenu } from "./frame-menu-model.js";
import { toChipClass, toChipTip } from "./frame-page-chip-model.js";
import { FramePageForm } from "./frame-page-form.js";
import { FramePageList } from "./frame-page-list.js";
import { pageName } from "./page-name-model.js";
import { stop } from "./variation-model.js";

const FramePageMenu = ({
  path,
  listPages,
  onPath,
  routes = false,
}: {
  path: string;
  listPages: (() => Promise<string[]>) | null;
  onPath: (path: string) => void;
  routes?: boolean;
}): ReactElement => {
  const menu = useMenu();
  const { close, root, setOpen, trigger } = menu;

  const toggle = useCallback(() => setOpen((isOpen) => !isOpen), [setOpen]);

  const apply = useCallback(
    (raw: string): boolean => {
      const clean = cleanFramePath(raw);

      if (clean === null) {
        return false;
      }

      onPath(clean);
      close(true);

      return true;
    },
    [onPath, close]
  );

  return (
    <div className="frame-menu-root" ref={root}>
      <button
        ref={trigger}
        type="button"
        className={toChipClass(path)}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={`Page: ${pageName(path)}`}
        onPointerDown={stop}
        onClick={toggle}
        data-tip={toChipTip(path, menu.open)}
      >
        <Icon name="file" size={12} />
        <span className="frame-path">{pageName(path)}</span>
      </button>
      {menu.open && (
        <dialog
          open
          className="project-menu canvas-menu frame-menu frame-page-menu"
          aria-label={copy.framePage}
        >
          <FramePageForm
            path={path}
            routes={routes}
            hasList={listPages !== null}
            apply={apply}
          />
          {listPages && (
            <FramePageList
              path={path}
              routes={routes}
              load={listPages}
              pick={apply}
              close={close}
            />
          )}
        </dialog>
      )}
    </div>
  );
};

export { FramePageMenu };
