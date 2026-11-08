import { Icon } from "@design-studio/ui";
import { useCallback } from "react";
import type { ReactElement } from "react";

import { cleanFramePath } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { useMenu } from "./frame-menu-model.js";
import { FramePageForm } from "./frame-page-form.js";
import { FramePageList } from "./frame-page-list.js";
import { pageName } from "./page-name-model.js";
import { stop } from "./variation-controls.js";

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
  const { close, setOpen } = menu;

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

  let part: "" | " set" = "";

  if (path) {
    part = " set";
  }

  let datatip = `/${path} · Show another page in this frame`;

  if (menu.open) {
    datatip = "";
  }

  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className={`frame-chip page${part}`}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={`Page: ${pageName(path)}`}
        onPointerDown={stop}
        onClick={toggle}
        data-tip={datatip || null}
      >
        <Icon name="file" size={12} />
        <span className="frame-path">{pageName(path)}</span>
      </button>
      {menu.open && (
        <div
          className="project-menu canvas-menu frame-menu frame-page-menu"
          role="dialog"
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
        </div>
      )}
    </div>
  );
};

export { FramePageMenu, pageName };
