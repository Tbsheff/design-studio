import { Icon, usePopover } from "@design-studio/ui";
import type { IconName } from "@design-studio/ui";
import { useRef } from "react";
import type { KeyboardEvent, RefObject, ReactElement } from "react";

type CanvasTool = "select" | "comment" | "edit" | "prototype" | null;

type PresentMode = "window" | "fullscreen" | "new-window" | "play";

interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  meta?: string;
  checked?: boolean;
  disabled?: boolean;
  tip?: string;
  run: () => void;
}

interface MenuGroup {
  label?: string;
  items: MenuEntry[];
  note?: string;
  fold?: "wide" | "narrow" | "tight";
}

function onMenuKey(event: KeyboardEvent<HTMLDivElement>): void {
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") {
    return;
  }

  const items = [
    ...event.currentTarget.querySelectorAll<HTMLButtonElement>(
      ".ui-menu-item:not(:disabled)"
    ),
  ].filter((item) => item.checkVisibility());

  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  event.preventDefault();
  items[
    (at + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length
  ]?.focus();
}

function MenuPopover({
  groups,
  label,
  align,
  onClose,
  trigger,
}: {
  groups: MenuGroup[];
  label: string;
  align: "start" | "end";
  onClose: (refocus: boolean) => void;
  trigger: RefObject<HTMLButtonElement | null>;
}): ReactElement {
  const root = useRef<HTMLDivElement>(null);
  usePopover(true, root, onClose, trigger);

  return (
    <div
      ref={root}
      className={`ui-menu topbar-menu align-${align}`}
      role="menu"
      aria-label={label}
      onKeyDown={onMenuKey}
    >
      {groups
        .filter((g) => g.items.length > 0 || g.note)
        .map((group, i) => (
          <div
            key={group.label ?? i}
            className="ui-menu-section"
            data-fold={group.fold}
          >
            {group.label && <div className="ui-menu-label">{group.label}</div>}
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                role={item.checked === undefined ? "menuitem" : "menuitemradio"}
                aria-checked={item.checked}
                className="ui-menu-item"
                disabled={item.disabled}
                data-tip={item.tip}
                data-tip-align="start"
                onClick={() => {
                  onClose(true);
                  item.run();
                }}
              >
                {item.icon && <Icon name={item.icon} size={14} />}
                <span className="truncate">{item.label}</span>
                {item.meta && <span className="ui-menu-meta">{item.meta}</span>}
              </button>
            ))}
            {group.note && <p className="ui-menu-note">{group.note}</p>}
          </div>
        ))}
    </div>
  );
}

function shareGroups(
  p: {
    canExport: boolean;
    onExport: () => void;
    onShip?: (() => void) | null;
    onShareLink?: ((mode?: "link" | "publish") => void) | null;
  },
  onPort: (() => void) | null
): MenuGroup[] {
  const exportItem: MenuEntry = {
    disabled: !p.canExport,
    icon: "download",
    id: "export",
    label: "Export…",
    meta: "PNG, PDF, HTML, handoff",
    run: p.onExport,
    ...(p.canExport ? {} : { tip: "Save a version to export" }),
  };

  const ship = p.onShip;

  const shipItem: MenuEntry[] = ship
    ? [
        {
          icon: "branch",
          id: "ship",
          label: "Ship as a pull request…",
          meta: "Branch and PR",
          run: ship,
        },
      ]
    : [];

  const portItem: MenuEntry[] = onPort
    ? [
        {
          icon: "react",
          id: "port",
          label: "Move to app…",
          meta: "Route in your app",
          run: onPort,
          tip: "The agent rebuilds a page as a route in an attached app, with its kit components",
        },
      ]
    : [];

  const link = p.onShareLink;

  const linkItem: MenuEntry[] = link
    ? [
        {
          disabled: !p.canExport,
          icon: "link",
          id: "share-link",
          label: "Share a read-only link…",
          meta: "View and comment",
          run: () => link("link"),
          tip: p.canExport
            ? "Others see still images of the frames and can comment"
            : "Save a version to share",
        },
      ]
    : [];

  const publishItem: MenuEntry[] = link
    ? [
        {
          disabled: !p.canExport,
          icon: "globe",
          id: "publish",
          label: "Publish on Cloudflare…",
          meta: "Your publish Worker",
          run: () => link("publish"),
          tip: p.canExport
            ? "Uploads a copy of a saved version to your publish Worker after you confirm"
            : "Save a version to publish",
        },
      ]
    : [];

  return [
    { items: [exportItem, ...shipItem, ...portItem] },
    {
      items: linkItem,
      note: "Links are off until you make one. Nothing leaves this computer.",
    },
    {
      items: publishItem,
      note: "Publish uploads only after you confirm what goes public.",
    },
  ];
}

export { MenuPopover, shareGroups };

export type { CanvasTool, MenuEntry, MenuGroup, PresentMode };
