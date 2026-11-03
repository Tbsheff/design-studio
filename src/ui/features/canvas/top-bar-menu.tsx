import { useRef, type KeyboardEvent, type RefObject } from "react";

import { Icon, type IconName } from "../../kit/Icon.js";
import { usePopover } from "../../kit/use-popover.js";

export type CanvasTool = "select" | "comment" | "edit" | "prototype" | null;

export type PresentMode = "window" | "fullscreen" | "new-window" | "play";

export interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  meta?: string;
  checked?: boolean;
  disabled?: boolean;
  tip?: string;
  run: () => void;
}

export interface MenuGroup {
  label?: string;
  items: MenuEntry[];
  note?: string;
  fold?: "wide" | "narrow" | "tight";
}

function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
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

export function MenuPopover({
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
}) {
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

export function shareGroups(
  p: {
    canExport: boolean;
    onExport: () => void;
    onShip?: (() => void) | null;
    onShareLink?: ((mode?: "link" | "publish") => void) | null;
  },
  onPort: (() => void) | null
): MenuGroup[] {
  const exportItem: MenuEntry = {
    id: "export",
    label: "Export…",
    icon: "download",
    meta: "PNG, PDF, HTML, handoff",
    disabled: !p.canExport,
    run: p.onExport,
    ...(p.canExport ? {} : { tip: "Save a version to export" }),
  };

  const ship = p.onShip;

  const shipItem: MenuEntry[] = ship
    ? [
        {
          id: "ship",
          label: "Ship as a pull request…",
          icon: "branch",
          meta: "Branch and PR",
          run: ship,
        },
      ]
    : [];

  const portItem: MenuEntry[] = onPort
    ? [
        {
          id: "port",
          label: "Move to app…",
          icon: "react",
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
          id: "share-link",
          label: "Share a read-only link…",
          icon: "link",
          meta: "View and comment",
          disabled: !p.canExport,
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
          id: "publish",
          label: "Publish on Cloudflare…",
          icon: "globe",
          meta: "Your publish Worker",
          disabled: !p.canExport,
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
