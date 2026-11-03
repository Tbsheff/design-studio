import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import type { KeyboardEvent, RefObject } from "react";

import type { Version } from "../../../shared/contracts.js";
import { formatRelative, formatTime } from "../../domain/format.js";
import { Icon } from "../../kit/Icon.js";
import type { IconName } from "../../kit/Icon.js";
import { usePopover } from "../../kit/use-popover.js";
import { levelLabel } from "../chat/level-control.js";
import { COPY } from "./copy.js";
import { findElement, findElements } from "./find-element.js";
import {
  autoTitle,
  displayTitle,
  fullText,
  kindInfo,
  originOf,
  undoneOf,
} from "./version-labels.js";
import type { VersionIndex } from "./version-labels.js";
import { VersionThumb } from "./version-thumb.js";
import { openCompareInCode } from "./versions-api.js";

const NAME_MAX = 80;

interface VersionRowProps {
  projectId: string;
  active: boolean;
  version: Version;
  index: VersionIndex;
  isHead: boolean;
  isOpen: boolean;
  picked: boolean;
  compareSide?: "A" | "B" | null;
  locked: boolean;
  expanded: boolean;
  onExpand: () => void;
  onOpen: () => void;
  onOpenVersion: (v: Version) => void;
  onRestore: () => void;
  onToggleCompare: () => void;
  onExport: () => void;
  onBranch: () => void;
  onPolish: () => void;
  onRename: (name: string | null) => void;
  onReview?: () => void;
}

function RenameField({
  initial,
  fallback,
  onDone,
}: {
  initial: string;
  fallback: string;
  onDone: (name: string | null | undefined) => void;
}) {
  const [value, setValue] = useState(initial);
  const done = useRef(false);

  const finish = (name: string | null | undefined) => {
    if (done.current) {
      return;
    }
    done.current = true;
    onDone(name);
  };

  const commit = () => {
    const name = value.trim().replaceAll(/\s+/g, " ");

    if (name === initial) {
      return finish(undefined);
    }
    finish(name === "" || name === fallback ? null : name);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    event.stopPropagation();

    if (event.key === "Enter") {
      event.preventDefault();
      commit();
    }

    if (event.key === "Escape") {
      event.preventDefault();
      finish(undefined);
    }
  };

  return (
    <input
      className="version-rename"
      aria-label={COPY.labelVersionName}
      autoFocus
      value={value}
      maxLength={NAME_MAX}
      placeholder={fallback}
      spellCheck={false}
      onFocus={(event) => event.currentTarget.select()}
      onChange={(event) => setValue(event.target.value)}
      onKeyDown={onKeyDown}
      onBlur={commit}
    />
  );
}

function RowAction(props: {
  label: string;
  icon: IconName;
  tip: string;
  onClick: () => void;
  disabled?: boolean;
  pressed?: boolean;
  testId?: string;
}) {
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={props.label}
      data-tip={props.tip}
      data-tip-side="top"
      aria-pressed={props.pressed}
      data-testid={props.testId}
      disabled={props.disabled}
      onClick={props.onClick}
    >
      <Icon name={props.icon} size={15} />
    </button>
  );
}

function VersionLink({
  label,
  target,
  index,
  onOpen,
}: {
  label: string;
  target: Version;
  index: VersionIndex;
  onOpen: (v: Version) => void;
}) {
  return (
    <div className="version-fact">
      <dt>{label}</dt>
      <dd>
        <button type="button" className="link" onClick={() => onOpen(target)}>
          {displayTitle(target, index)}
        </button>
      </dd>
    </div>
  );
}

function VersionDetail({
  version: v,
  index,
  id,
  onOpenVersion,
}: {
  version: Version;
  index: VersionIndex;
  id: string;
  onOpenVersion: (v: Version) => void;
}) {
  const prompt = fullText(v);
  const origin = originOf(v, index);
  const undone = undoneOf(v, index);

  return (
    <dl className="version-detail" id={id}>
      {prompt && (
        <div className="version-fact">
          <dt>{v.meta.kind === "run" ? "Prompt" : "Change"}</dt>
          <dd className="version-prompt">{prompt}</dd>
        </div>
      )}
      {undone && (
        <VersionLink
          label="Undid"
          target={undone}
          index={index}
          onOpen={onOpenVersion}
        />
      )}
      {origin && (
        <VersionLink
          label={v.meta.kind === "undo" ? "Back to" : "Restored"}
          target={origin}
          index={index}
          onOpen={onOpenVersion}
        />
      )}
      <div className="version-fact">
        <dt>Saved</dt>
        <dd>{formatTime(v.createdAt)}</dd>
      </div>
      {v.changedFiles.length > 0 && (
        <div className="version-fact">
          <dt>Files</dt>
          <dd className="version-files">
            {v.changedFiles.map((file) => (
              <code key={file}>{file}</code>
            ))}
            {fileCount(v) > v.changedFiles.length && (
              <span>and {fileCount(v) - v.changedFiles.length} more</span>
            )}
          </dd>
        </div>
      )}
    </dl>
  );
}

function fileCount(v: Version): number {
  return Math.max(v.changedFilesTotal ?? 0, v.changedFiles.length);
}

function VersionLevel({ version: v }: { version: Version }) {
  const { level } = v.meta;

  if (!level) {
    return null;
  }
  return (
    <>
      <span className="dot" />
      <span className={`version-level ${level}`} data-testid="version-level">
        {levelLabel(level)}
      </span>
    </>
  );
}

function VersionMeta({ version: v }: { version: Version }) {
  const kind = kindInfo(v);
  const files = fileCount(v);
  const more = files - v.changedFiles.length;

  return (
    <div className="version-meta">
      <span
        className={`version-kind ${v.meta.kind}`}
        data-kind={v.meta.kind}
        data-tip={kind.hint}
        data-tip-align="start"
      >
        <Icon name={kind.icon} size={12} />
        <span className="version-kind-label">{kind.label}</span>
      </span>
      <VersionLevel version={v} />
      <span className="dot" />
      <time
        dateTime={new Date(v.createdAt).toISOString()}
        data-tip={`${formatTime(v.createdAt)} · ${files} file${files === 1 ? "" : "s"}`}
      >
        {formatRelative(v.createdAt)}
      </time>
      <span className="dot version-file-count-dot" />
      <span
        className="version-file-count"
        data-tip={
          more > 0
            ? `${v.changedFiles.slice(0, 20).join("\n")}\nand ${more} more`
            : v.changedFiles.join("\n")
        }
      >
        {files} file{files === 1 ? "" : "s"}
      </span>
    </div>
  );
}

function rowClasses(props: VersionRowProps): string {
  const flags = {
    expanded: props.expanded,
    head: props.isHead,
    picked: props.picked,
    selected: props.isOpen,
  };

  return [
    "version",
    ...Object.entries(flags)
      .filter(([, on]) => on)
      .map(([name]) => name),
  ].join(" ");
}

export function VersionRow(props: VersionRowProps) {
  const { version: v, isHead } = props;
  const title = displayTitle(v, props.index);
  const detailId = `version-detail-${v.id.slice(0, 12)}`;
  const [renaming, setRenaming] = useState(false);
  const toggle = useRef<HTMLButtonElement>(null);
  const endRename = (name: string | null | undefined) => {
    setRenaming(false);
    if (name !== undefined) {
      props.onRename(name);
    }
    requestAnimationFrame(() => toggle.current?.focus({ preventScroll: true }));
  };
  return (
    <li className={rowClasses(props)}>
      <span className="version-node" aria-hidden="true" />
      <VersionThumb
        projectId={props.projectId}
        versionId={v.id}
        active={props.active}
        label={title}
        onOpen={props.onOpen}
      />
      <div className="version-main">
        <div className="version-title">
          {renaming ? (
            <RenameField
              initial={title}
              fallback={autoTitle(v, props.index)}
              onDone={endRename}
            />
          ) : (
            <button
              ref={toggle}
              type="button"
              className="version-toggle"
              data-tip={v.meta.prompt ?? v.title}
              data-tip-align="start"
              aria-expanded={props.expanded}
              aria-controls={props.expanded ? detailId : undefined}
              aria-keyshortcuts="F2"
              onClick={props.onExpand}
              onDoubleClick={() => setRenaming(true)}
              onKeyDown={(event) => {
                if (event.key === "F2") {
                  event.preventDefault();
                  setRenaming(true);
                }
              }}
            >
              <span>{title}</span>
            </button>
          )}
          {props.compareSide && (
            <span
              className="badge accent version-side"
              data-tip={`Compare side ${props.compareSide}`}
            >
              <span aria-hidden="true">{props.compareSide}</span>
              <span className="sr-only">Compare side {props.compareSide}</span>
            </span>
          )}
          {isHead && <span className="badge accent">Head</span>}
        </div>
        <div className="version-line">
          <VersionMeta version={v} />
          <VersionActions {...props} />
        </div>
        {props.expanded && (
          <VersionDetail
            version={v}
            index={props.index}
            id={detailId}
            onOpenVersion={props.onOpenVersion}
          />
        )}
      </div>
    </li>
  );
}

interface MoreItem {
  id: string;
  label: string;
  icon: IconName;
  hint?: string;
  run: () => void;
}

function moreItems(props: VersionRowProps): MoreItem[] {
  const { version: v, isHead } = props;
  const items: MoreItem[] = [];
  const { onReview } = props;

  if (onReview && v.parentId !== null) {
    items.push({
      icon: "code",
      id: "review",
      label: "Review changes",
      run: () => {
        openCompareInCode();
        onReview();
      },
    });
  }

  items.push(
    {
      icon: "download",
      id: "export",
      label: "Export…",
      run: props.onExport,
    },
    {
      icon: "branch",
      id: "branch",
      label: "New direction from here",
      run: props.onBranch,
    }
  );

  if (isHead && v.meta.level !== "polish") {
    items.push({
      id: "polish",
      label: "Polish this",
      icon: "sparkle",
      hint: props.locked ? "Wait for the run" : undefined,
      run: props.onPolish,
    });
  }
  return items;
}

const MENU_STEP: Record<string, (index: number, count: number) => number> = {
  ArrowDown: (index, count) => (index + 1) % count,
  ArrowUp: (index, count) => (index - 1 + count) % count,
  End: (_index, count) => count - 1,
  Home: () => 0,
};

function onMenuKey(
  event: KeyboardEvent<HTMLDivElement>,
  close: (refocus: boolean) => void
) {
  if (event.key === "Tab") {
    close(false);
  }
  const step = MENU_STEP[event.key];

  if (!step) {
    return;
  }
  event.preventDefault();

  const items = findElements(
    event.currentTarget,
    '[role="menuitem"]:not(:disabled)'
  );

  const index = items.indexOf(document.activeElement as HTMLElement);
  items[step(Math.max(0, index), items.length)]?.focus();
}

const MENU_GAP = 4;
const MENU_EDGE = 8;

function useMenuPlace(
  open: boolean,
  trigger: RefObject<HTMLButtonElement | null>,
  menu: RefObject<HTMLDivElement | null>
) {
  const [place, setPlace] = useState<{ left: number; top: number } | null>(
    null
  );

  useLayoutEffect(() => {
    if (!open) {
      return setPlace(null);
    }
    const button = trigger.current?.getBoundingClientRect();
    const el = menu.current;

    if (!button || !el) {
      return;
    }
    const below = button.bottom + MENU_GAP;

    const top =
      below + el.offsetHeight > window.innerHeight - MENU_EDGE
        ? button.top - MENU_GAP - el.offsetHeight
        : below;

    setPlace({
      left: Math.max(
        MENU_EDGE,
        Math.min(button.left, window.innerWidth - el.offsetWidth - MENU_EDGE)
      ),
      top: Math.max(MENU_EDGE, top),
    });
  }, [open, trigger, menu]);
  useEffect(() => {
    if (place && menu.current) {
      findElement(menu.current, '[role="menuitem"]:not(:disabled)')?.focus({
        preventScroll: true,
      });
    }
  }, [place, menu]);

  return place;
}

function VersionMoreMenu({
  items,
  title,
}: {
  items: MoreItem[];
  title: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);

  const close = useCallback((refocus: boolean) => {
    setOpen(false);

    if (refocus) {
      trigger.current?.focus({ preventScroll: true });
    }
  }, []);

  usePopover(open, root, close);
  const place = useMenuPlace(open, trigger, menu);

  return (
    <div className="version-more" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="icon-btn"
        aria-label={`More actions for ${title}`}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : "More"}
        data-tip-side="top"
        onClick={() => setOpen((value) => !value)}
      >
        <Icon name="more" size={15} />
      </button>
      {open && (
        <div
          ref={menu}
          className="ui-menu version-menu"
          role="menu"
          aria-label={COPY.labelMoreVersionActions}
          style={place ?? { visibility: "hidden" }}
          onKeyDown={(event) => onMenuKey(event, close)}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              role="menuitem"
              className={`ui-menu-item${item.hint ? " has-hint" : ""}`}
              tabIndex={-1}
              disabled={Boolean(item.hint)}
              data-testid={
                item.id === "review"
                  ? "version-review-changes"
                  : item.id === "polish"
                    ? "version-polish-this"
                    : undefined
              }
              onClick={(event) => {
                close(event.detail === 0);
                item.run();
              }}
            >
              <Icon name={item.icon} size={14} />
              <span>{item.label}</span>
              {item.hint && <span className="ui-menu-hint">{item.hint}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function VersionActions(props: VersionRowProps) {
  const { isHead, picked } = props;

  return (
    <div
      className="version-actions"
      role="group"
      aria-label={COPY.labelVersionActions}
    >
      <RowAction
        label="Open"
        icon="eye"
        tip="Open this version"
        onClick={props.onOpen}
      />
      <RowAction
        label="Restore"
        icon="restore"
        tip={isHead ? "Already the head" : "Restore as head"}
        disabled={isHead || props.locked}
        onClick={props.onRestore}
      />
      <RowAction
        label={picked ? "Comparing" : "Compare"}
        icon="compare"
        tip={picked ? "Remove from compare" : "Add to compare"}
        pressed={picked}
        onClick={props.onToggleCompare}
      />
      <VersionMoreMenu
        items={moreItems(props)}
        title={displayTitle(props.version, props.index)}
      />
    </div>
  );
}
