import { Icon } from "@design-studio/ui";
import type { ReactElement } from "react";
import { useEffect, useRef, useState } from "react";

import { cleanFramePath } from "./canvas-frames-model.js";
import { copy } from "./copy.js";
import { menuKeys, useMenu } from "./frame-resize-handles.js";
import { toValueOr } from "./settle-model.js";
import { stop } from "./variation-controls.js";

const LENGTH_0 = 0;

const pageName = (path: string | undefined): string => {
  const clean = (path ?? "").replace(/^\/+/, "").replace(/\.html$/, "");

  return clean || "index";
};

const pageLabel = (page: string, routes: boolean): string => {
  if (routes) {
    return `/${page}`;
  }
  return page;
};

const isCurrentPage = (
  page: string,
  path: string,
  routes: boolean
): boolean => {
  if (routes) {
    return page === path;
  }
  return page === (path || "index.html");
};

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
  const [draft, setDraft] = useState(path);
  const [pages, setPages] = useState<string[] | null>(null);
  const [invalid, setInvalid] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const loader = useRef(listPages);
  loader.current = listPages;
  const hasPages = listPages !== null;
  useEffect(() => {
    if (!menu.open) {
      return;
    }

    setDraft(path);
    setInvalid(false);
    input.current?.focus();
    input.current?.select();
    const load = loader.current;

    if (!load) {
      return;
    }

    let alive = true;

    const fill = async (): Promise<void> => {
      const list = await toValueOr(load(), []);

      if (alive) {
        setPages(list);
      }
    };

    void fill();

    return (): void => {
      alive = false;
    };
  }, [menu.open, path, hasPages]);

  const apply = (raw: string): void => {
    const clean = cleanFramePath(raw);

    if (clean === null) {
      setInvalid(true);

      return;
    }

    onPath(clean);
    menu.close(true);
  };

  let part: "" | " set" = "";

  if (path) {
    part = " set";
  }

  const datatip: string | undefined = ((): string | undefined => {
    if (menu.open) {
      return undefined;
    }
    return `/${path} · Show another page in this frame`;
  })();

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
        onClick={() => menu.setOpen((valueValue) => !valueValue)}
        data-tip={datatip}
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
          <form
            onSubmit={(event) => {
              event.preventDefault();
              apply(draft);
            }}
          >
            <label className="frame-page-field">
              <span>{copy.path}</span>
              <input
                ref={input}
                value={draft}
                spellCheck={false}
                aria-invalid={invalid}
                placeholder={
                  routes ? "settings" : listPages ? "about.html" : "pricing"
                }
                onChange={(eventValue) => {
                  setDraft(eventValue.target.value);
                  setInvalid(false);
                }}
              />
            </label>
            {invalid && (
              <p className="frame-page-hint error">
                {routes
                  ? "Use a route inside the app, like /settings. No “..”."
                  : "Use a path inside the project, like about.html. No “..”."}
              </p>
            )}
          </form>
          {listPages && (
            <div
              role="menu"
              aria-label={copy.pages}
              onKeyDown={(event3) => menuKeys(event3, menu.close)}
            >
              {pages === null && (
                <p className="frame-page-hint">{copy.loadingPages}</p>
              )}
              {pages?.length === LENGTH_0 && (
                <p className="frame-page-hint">{copy.noOtherPagesYet}</p>
              )}
              {pages?.map((page) => {
                const ariacurrent: "true" | undefined = (():
                  | "true"
                  | undefined => {
                  if (!isCurrentPage(page, path, routes)) {
                    return undefined;
                  }
                  return "true";
                })();

                return (
                  <button
                    key={page}
                    type="button"
                    role="menuitem"
                    aria-current={ariacurrent}
                    onClick={() => {
                      let argument: string = page;

                      if (page === "index.html") {
                        argument = "";
                      }

                      return apply(argument);
                    }}
                  >
                    <Icon name="file" size={14} />
                    <span className="truncate">{pageLabel(page, routes)}</span>
                    {isCurrentPage(page, path, routes) && (
                      <Icon name="check" size={14} />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export { FramePageMenu, pageName };
