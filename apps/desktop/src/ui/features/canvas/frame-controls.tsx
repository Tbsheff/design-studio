import { useCallback } from "react";
import type { ReactElement } from "react";

import { cleanFramePath } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import type { FrameMenu } from "./frame-menu-model.js";
import { FramePageForm } from "./frame-page-form.js";
import { FramePageList } from "./frame-page-list.js";
import { useMenuFit } from "./use-menu-fit.js";

const FramePageMenu = ({
  menu,
  path,
  listPages,
  onPath,
  routes = false,
}: {
  menu: FrameMenu;
  path: string;
  listPages: (() => Promise<string[]>) | null;
  onPath: (path: string) => void;
  routes?: boolean;
}): ReactElement => {
  const fitMenu = useMenuFit<HTMLDialogElement>("root", null);
  const { close, root } = menu;

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
    <div className="frame-menu-root frame-page-root" ref={root}>
      {menu.open && (
        <dialog
          ref={fitMenu}
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
