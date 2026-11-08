import type {
  ComponentInfo,
  ProjectKind,
  SelectionContext,
} from "@design-studio/contracts";
import type { InsertableComponent } from "@design-studio/contracts/insert";
import { Icon, PanelHead } from "@design-studio/ui";
import { useState, useEffect, useMemo, useRef } from "react";
import type { ReactNode } from "react";

import {
  DragGhost,
  InsertMenu,
  useComponentDrag,
  useInsertable,
} from "./component-insert.js";
import type { ComponentDrag } from "./component-insert.js";
import {
  ComponentPreviewThumb,
  trimmedUrl,
} from "./component-preview-thumb.js";
import { COPY } from "./copy.js";
import { componentThumb } from "./use-components.js";
import type { ComponentList } from "./use-components.js";

interface GalleryRender {
  component: InsertableComponent | null;
  onClose: () => void;
}

interface Props {
  renderGallery?: (slot: GalleryRender) => ReactNode;
  projectId: string;
  directionId: string | null;
  list: ComponentList;
  active: boolean;
  onMention: (component: ComponentInfo) => void;
  kind?: ProjectKind;
  selection?: SelectionContext[];
}

interface Item {
  key: string;
  info: ComponentInfo;
  insert: InsertableComponent | null;
  folder: string;
}

const insertItems = (
  insertable: InsertableComponent[],
  inventory: ComponentInfo[]
): Item[] =>
  insertable.map((component) => {
    const known = inventory.find(
      (item) => item.name === component.name && item.file === component.file
    );

    const info: ComponentInfo = known ?? {
      file: component.file,
      id: component.name,
      line: component.line,
      name: component.name,
      selector: null,
      source: "react",
      uses: component.uses,
    };

    return {
      folder: component.folder,
      info: { ...info, uses: component.uses },
      insert: component,
      key: component.id,
    };
  });

const useItems = (props: Props, canInsert: boolean, query: string) => {
  const insertable = useInsertable(
    props.projectId,
    props.directionId,
    canInsert && props.active,
    props.list.version
  );

  const all = useMemo<Item[] | null>(() => {
    if (!canInsert) {
      return (
        props.list.components?.map((info) => ({
          folder: "",
          info,
          insert: null,
          key: info.id,
        })) ?? null
      );
    }

    return insertable.list
      ? insertItems(insertable.list.components, props.list.components ?? [])
      : null;
  }, [canInsert, insertable.list, props.list.components]);

  const shown = useMemo(() => {
    const needle = query.trim().toLowerCase();

    return (all ?? []).filter(
      (item) =>
        !needle ||
        item.info.name.toLowerCase().includes(needle) ||
        item.folder.toLowerCase().includes(needle)
    );
  }, [all, query]);

  const error = canInsert ? insertable.error : props.list.error;
  const retry = canInsert ? insertable.retry : props.list.retry;

  return { all, error, retry, shown };
};

const groupsOf = (items: Item[]): [string, Item[]][] => {
  const groups = new Map<string, Item[]>();

  for (const item of items) {
    groups.set(item.folder, [...(groups.get(item.folder) ?? []), item]);
  }

  return [...groups.entries()];
};

const Thumb = ({
  projectId,
  directionId,
  component,
  version,
  active,
}: {
  projectId: string;
  directionId: string;
  component: ComponentInfo;
  version: string;
  active: boolean;
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "none">("loading");
  const shown = useRef<string | null>(null);
  useEffect(
    () => () => {
      if (shown.current) {
        URL.revokeObjectURL(shown.current);
      }
    },
    []
  );
  useEffect(() => {
    if (!component.selector) {
      setState("none");

      return;
    }

    if (!active) {
      return;
    }

    let live = true;

    const read = async () => {
      let next: string | null = null;

      try {
        next = await trimmedUrl(
          await componentThumb(projectId, directionId, component.id, version)
        );
      } catch {
        if (live && !shown.current) {
          setState("none");
        }

        return;
      }

      if (!live) {
        if (next) {
          URL.revokeObjectURL(next);
        }

        return;
      }

      if (!next) {
        if (!shown.current) {
          setState("none");
        }

        return;
      }

      if (shown.current) {
        URL.revokeObjectURL(shown.current);
      }

      shown.current = next;
      setSrc(next);
      setState("ready");
    };

    void read();

    return () => {
      live = false;
    };
  }, [
    projectId,
    directionId,
    component.id,
    component.selector,
    version,
    active,
  ]);

  return (
    <span className={`cmp-thumb ${state}`} aria-hidden="true">
      {src ? (
        <img src={src} alt="" draggable={false} />
      ) : state === "none" ? (
        <Icon name="component" size={20} />
      ) : null}
    </span>
  );
};

const meta = (component: ComponentInfo): string => {
  const file = component.file?.split("/").pop() ?? "";
  const uses = component.uses === 1 ? "1 use" : `${component.uses} uses`;

  return file ? `${uses} · ${file}` : uses;
};

interface CardProps {
  item: Item;
  props: Props;
  drag: ComponentDrag;
  onInsertMenu: (
    component: InsertableComponent,
    at: { x: number; y: number }
  ) => void;
  onGallery: (component: InsertableComponent) => void;
}

const Card = ({ item, props, drag, onInsertMenu, onGallery }: CardProps) => {
  const { info, insert } = item;

  const tip = insert
    ? `Click to mention @${info.name}. Drag onto the canvas to insert it.`
    : `Add @${info.name} to your message${info.file ? ` · ${info.file}` : ""}`;

  return (
    <li className="cmp-item">
      <button
        type="button"
        className="cmp-card"
        aria-label={`Mention ${info.name}`}
        data-tip={tip}
        data-testid="component-card"
        onClick={() => props.onMention(info)}
        {...(insert ? drag.handlers(insert) : {})}
      >
        {insert ? (
          <ComponentPreviewThumb
            projectId={props.projectId}
            directionId={props.directionId as string}
            id={insert.id}
            version={props.list.version}
            active={props.active}
          />
        ) : (
          <Thumb
            projectId={props.projectId}
            directionId={props.directionId as string}
            component={info}
            version={props.list.version}
            active={props.active}
          />
        )}
        <span className="cmp-name truncate">{info.name}</span>
        <span className="cmp-meta truncate">{meta(info)}</span>
      </button>
      {insert && (
        <button
          type="button"
          className="icon-btn small cmp-insert"
          aria-label={`Insert ${info.name}`}
          aria-haspopup="menu"
          data-tip={COPY.tipInsertInTheSelection}
          data-testid="component-insert"
          onClick={(event) => {
            const rect = event.currentTarget.getBoundingClientRect();
            onInsertMenu(insert, { x: rect.left, y: rect.bottom + 4 });
          }}
        >
          <Icon name="plus" size={14} />
        </button>
      )}
      {insert && (
        <button
          type="button"
          className="icon-btn small cmp-insert"
          aria-label={`${COPY.labelShowAllVariants}: ${info.name}`}
          data-tip={COPY.tipShowEveryVariant}
          data-testid="component-gallery"
          onClick={() => onGallery(insert)}
        >
          <Icon name="layers" size={14} />
        </button>
      )}
    </li>
  );
};

export const ComponentsPanel = (props: Props) => {
  const { list, directionId } = props;
  const canInsert = props.kind === "react";
  const [query, setQuery] = useState("");

  const [menu, setMenu] = useState<{
    component: InsertableComponent;
    at: { x: number; y: number };
  } | null>(null);

  const [gallery, setGallery] = useState<InsertableComponent | null>(null);
  const drag = useComponentDrag();
  const { all, shown, error, retry } = useItems(props, canInsert, query);
  const count = all?.length ?? 0;
  const groups = groupsOf(shown);

  return (
    <div className="cmp">
      <PanelHead
        title={COPY.titleComponents}
        className="ins-header cmp-header"
        titleClassName="cmp-title"
      >
        {all && <span className="count cmp-count">{count}</span>}
      </PanelHead>
      {count > 6 && (
        <div className="tk-search cmp-search">
          <Icon name="search" size={13} />
          <input
            type="search"
            aria-label={COPY.labelSearchComponents}
            placeholder={COPY.placeholderSearchComponents}
            value={query}
            spellCheck={false}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
      )}
      <div className="cmp-scroll">
        {error && (
          <p className="ins-error" role="alert">
            <Icon name="alert" size={13} />
            <span>Could not list components. {error}</span>
            {retry && (
              <button type="button" className="btn small" onClick={retry}>
                Try again
              </button>
            )}
          </p>
        )}
        {all === null && !error && (
          <ul
            className="cmp-grid"
            aria-busy="true"
            aria-label={COPY.labelLoadingComponents}
          >
            {[0, 1, 2, 3].map((key) => (
              <li key={key} className="cmp-skeleton" />
            ))}
          </ul>
        )}
        {all !== null && count === 0 && (
          <p className="ins-empty cmp-empty">
            {canInsert
              ? "No exported React components yet. Components in src, or in the app and its workspace packages, show here."
              : "No components yet. Parts the page repeats, like cards, show here."}
          </p>
        )}
        {count > 0 && shown.length === 0 && (
          <p className="ins-empty cmp-empty">No components match “{query}”.</p>
        )}
        {directionId &&
          groups.map(([folder, items]) => (
            <section
              key={folder || "all"}
              className="cmp-group"
              aria-label={folder || "Components"}
            >
              {groups.length > 1 && (
                <h3
                  className="cmp-group-head"
                  data-tip={folder}
                  data-tip-align="start"
                >
                  <Icon name="folder" size={12} />
                  <span className="truncate">{folder}</span>
                  <span className="cmp-count">{items.length}</span>
                </h3>
              )}
              <ul className="cmp-grid">
                {items.map((item) => (
                  <Card
                    key={item.key}
                    item={item}
                    props={props}
                    drag={drag}
                    onInsertMenu={(component, at) => setMenu({ at, component })}
                    onGallery={setGallery}
                  />
                ))}
              </ul>
            </section>
          ))}
      </div>
      {props.renderGallery?.({
        component: gallery,
        onClose: () => setGallery(null),
      })}
      {count > 0 && (
        <p className="cmp-foot">
          {canInsert
            ? "Drag onto the canvas, or select an element and press + to insert. Click to mention."
            : "Click a component to mention it in your message."}
        </p>
      )}
      {menu && (
        <InsertMenu
          component={menu.component}
          at={menu.at}
          selection={props.selection?.at(-1)}
          onClose={() => setMenu(null)}
        />
      )}
      <DragGhost ghost={drag.ghost} />
    </div>
  );
};
