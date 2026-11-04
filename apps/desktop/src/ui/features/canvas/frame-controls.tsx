import { useEffect, useRef, useState } from "react";

import { Icon } from "@design-studio/ui";
import { cleanFramePath } from "./canvas-frames-model.js";
import { menuKeys, useMenu } from "./frame-resize-handles.js";
import { stop } from "./variation-controls.js";

export function pageName(path: string | undefined): string {
  const clean = (path ?? "").replace(/^\/+/, "").replace(/\.html$/, "");

  return clean || "index";
}

function pageLabel(page: string, routes: boolean): string {
  return routes ? `/${page}` : page;
}

function isCurrentPage(page: string, path: string, routes: boolean): boolean {
  return routes ? page === path : page === (path || "index.html");
}

export function FramePageMenu({
  path,
  listPages,
  onPath,
  routes = false,
}: {
  path: string;
  listPages: (() => Promise<string[]>) | null;
  onPath: (path: string) => void;
  routes?: boolean;
}) {
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
    load()
      .then((list) => alive && setPages(list))
      .catch(() => alive && setPages([]));

    return () => {
      alive = false;
    };
  }, [menu.open, path, hasPages]);

  const apply = (raw: string) => {
    const clean = cleanFramePath(raw);

    if (clean === null) {
      setInvalid(true);

      return;
    }

    onPath(clean);
    menu.close(true);
  };

  return (
    <div className="frame-menu-root" ref={menu.root}>
      <button
        ref={menu.trigger}
        type="button"
        className={`frame-chip page${path ? " set" : ""}`}
        aria-haspopup="dialog"
        aria-expanded={menu.open}
        aria-label={`Page: ${pageName(path)}`}
        onPointerDown={stop}
        onClick={() => menu.setOpen((v) => !v)}
        data-tip={
          menu.open ? undefined : `/${path} · Show another page in this frame`
        }
      >
        <Icon name="file" size={12} />
        <span className="frame-path">{pageName(path)}</span>
      </button>
      {menu.open && (
        <div
          className="project-menu canvas-menu frame-menu frame-page-menu"
          role="dialog"
          aria-label="Frame page"
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              apply(draft);
            }}
          >
            <label className="frame-page-field">
              <span>Path</span>
              <input
                ref={input}
                value={draft}
                spellCheck={false}
                aria-invalid={invalid}
                placeholder={
                  routes ? "settings" : listPages ? "about.html" : "pricing"
                }
                onChange={(e) => {
                  setDraft(e.target.value);
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
              aria-label="Pages"
              onKeyDown={(e) => menuKeys(e, menu.close)}
            >
              {pages === null && (
                <p className="frame-page-hint">Loading pages…</p>
              )}
              {pages?.length === 0 && (
                <p className="frame-page-hint">No other pages yet.</p>
              )}
              {pages?.map((page) => (
                <button
                  key={page}
                  type="button"
                  role="menuitem"
                  aria-current={
                    isCurrentPage(page, path, routes) ? "true" : undefined
                  }
                  onClick={() => apply(page === "index.html" ? "" : page)}
                >
                  <Icon name="file" size={14} />
                  <span className="truncate">{pageLabel(page, routes)}</span>
                  {isCurrentPage(page, path, routes) && (
                    <Icon name="check" size={14} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
