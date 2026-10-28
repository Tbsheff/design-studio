import { useCallback, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { BrandMark } from './BrandMark';
import { Icon, type IconName } from './Icon';
import { usePopover } from '../usePopover';
import type { PanelTab } from '../usePanelTab';

type ThemePref = 'system' | 'light' | 'dark';
type ThemeApi = { get: () => ThemePref; set: (pref: ThemePref) => void };
const themeApi = (): ThemeApi | undefined => (window as unknown as { studioTheme?: ThemeApi }).studioTheme;

interface Props {
  name: string;
  kindLabel: string;
  directionName: string | null;
  connection: string;
  actionError: string | null;
  onDismissError: () => void;
  tab: PanelTab;
  onTab: (tab: PanelTab) => void;
  hasTokens: boolean;
  hasComponents: boolean;
  hasTweaks: boolean;
  commentCount: number;
  onRename: (name: string) => Promise<void>;
  onExit: () => void;
  onDesignMd: () => void;
  onSettings: () => void;
  onCollapse: () => void;
}

interface Item {
  id: string;
  label: string;
  icon: IconName;
  run: () => void;
  meta?: string;
  disabled?: boolean;
  checked?: boolean;
}

function MenuItems({ items, onDone }: { items: Item[]; onDone: () => void }) {
  return items.map((item) => (
    <button
      key={item.id}
      type="button"
      role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
      aria-checked={item.checked}
      className="ui-menu-item"
      disabled={item.disabled}
      onClick={() => {
        onDone();
        item.run();
      }}
    >
      <Icon name={item.icon} size={14} />
      <span>{item.label}</span>
      {item.meta && <span className="ui-menu-meta">{item.meta}</span>}
    </button>
  ));
}

function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.ui-menu-item:not(:disabled)')];
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  const next = items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length];
  event.preventDefault();
  next?.focus();
}

function ProjectMenu(props: Props & { onClose: (refocus: boolean) => void; onStartRename: () => void; trigger: RefObject<HTMLButtonElement | null> }) {
  const root = useRef<HTMLDivElement>(null);
  usePopover(true, root, props.onClose, props.trigger);
  const done = () => props.onClose(false);
  const pref = themeApi()?.get() ?? 'system';
  const panels: Item[] = [
    { id: 'versions', label: 'Versions', icon: 'history', run: () => props.onTab('versions') },
    ...(props.hasTokens ? [{ id: 'tokens', label: 'Tokens', icon: 'token' as const, run: () => props.onTab('tokens') }] : []),
    ...(props.hasComponents ? [{ id: 'components', label: 'Components', icon: 'component' as const, run: () => props.onTab('components') }] : []),
    ...(props.hasTweaks ? [{ id: 'tweaks', label: 'Tweaks', icon: 'sliders' as const, run: () => props.onTab('tweaks') }] : []),
    { id: 'system', label: 'Design system', icon: 'palette', run: () => props.onTab('system') },
    { id: 'design-md', label: 'Edit DESIGN.md', icon: 'doc', run: props.onDesignMd },
  ];
  const project: Item[] = [
    { id: 'rename', label: 'Rename', icon: 'pencil', run: props.onStartRename },
    { id: 'settings', label: 'Project settings', icon: 'settings', run: props.onSettings },
  ];
  const themes: Item[] = (['system', 'light', 'dark'] as const).map((value) => ({
    id: `theme-${value}`,
    label: value === 'system' ? 'System theme' : value === 'light' ? 'Light theme' : 'Dark theme',
    icon: value === 'dark' ? 'moon' : value === 'light' ? 'sparkle' : 'desktop',
    checked: pref === value,
    run: () => themeApi()?.set(value),
  }));
  return (
    <div ref={root} className="ui-menu pane-project-menu" role="menu" aria-label="Project" onKeyDown={onMenuKey}>
      <div className="ui-menu-section">
        <div className="ui-menu-label">{props.kindLabel}{props.directionName ? ` · ${props.directionName}` : ''}</div>
        <MenuItems items={project} onDone={done} />
      </div>
      <div className="ui-menu-section">
        <MenuItems items={panels} onDone={done} />
      </div>
      <div className="ui-menu-section">
        <MenuItems items={themes} onDone={done} />
      </div>
      <div className="ui-menu-section">
        <MenuItems items={[{ id: 'home', label: 'Back to projects', icon: 'arrowLeft', run: props.onExit }]} onDone={done} />
      </div>
    </div>
  );
}

function RenameField({ name, onDone }: { name: string; onDone: (next: string | null) => void }) {
  const [value, setValue] = useState(name);
  const done = useRef(false);
  const finish = (save: boolean) => {
    if (done.current) return;
    done.current = true;
    onDone(save && value.trim() && value.trim() !== name ? value.trim() : null);
  };
  return (
    <input
      className="pane-rename"
      aria-label="Project name"
      autoFocus
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={() => finish(true)}
      onKeyDown={(e) => {
        if (e.key === 'Enter') finish(true);
        else if (e.key === 'Escape') {
          e.preventDefault();
          e.stopPropagation();
          finish(false);
        }
      }}
    />
  );
}

function Status({ connection, error, onDismiss }: { connection: string; error: string | null; onDismiss: () => void }): ReactNode {
  return (
    <>
      {connection !== 'open' && (
        <span className="conn pane-conn" role="status" data-tip={connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}>
          <span className="spinner" />
          <span className="sr-only">{connection === 'connecting' ? 'Connecting…' : 'Reconnecting…'}</span>
        </span>
      )}
      {error && (
        <div className="pane-error ui-notice" role="alert">
          <Icon name="alert" size={14} />
          <span className="pane-error-text">{error}</span>
          <button type="button" className="icon-btn small" aria-label="Dismiss" onClick={onDismiss}>
            <Icon name="close" size={12} />
          </button>
        </div>
      )}
    </>
  );
}

export function StudioPaneHeader(props: Props) {
  const [open, setOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  const commentsOn = props.tab === 'comments';
  return (
    <>
      <header className="pane-head">
        <BrandMark />
        {renaming ? (
          <RenameField
            name={props.name}
            onDone={(next) => {
              setRenaming(false);
              if (next) void props.onRename(next);
            }}
          />
        ) : (
          <span className="pane-project-anchor">
            <button
              ref={trigger}
              type="button"
              className="pane-project"
              aria-haspopup="menu"
              aria-expanded={open}
              data-tip={open ? undefined : props.name}
              data-tip-align="start"
              onClick={() => setOpen((v) => !v)}
              onDoubleClick={() => setRenaming(true)}
            >
              <span className="truncate">{props.name}</span>
              <Icon name="chevronDown" size={12} />
            </button>
            {open && <ProjectMenu {...props} trigger={trigger} onClose={close} onStartRename={() => setRenaming(true)} />}
          </span>
        )}
        <Status connection={props.connection} error={null} onDismiss={props.onDismissError} />
        <button type="button" className="icon-btn pane-head-btn" aria-label="Hide chat pane" data-tip="Hide pane" data-tip-align="end" onClick={props.onCollapse}>
          <Icon name="sidebar" size={14} />
        </button>
        <button
          type="button"
          className="icon-btn pane-head-btn"
          aria-label="Comments"
          aria-pressed={commentsOn}
          data-tip="Comments"
          data-tip-align="end"
          onClick={() => props.onTab(commentsOn ? 'chat' : 'comments')}
        >
          <Icon name="comment" size={14} />
          {props.commentCount > 0 && <span className="pane-head-badge">{props.commentCount}</span>}
        </button>
      </header>
      <Status connection="open" error={props.actionError} onDismiss={props.onDismissError} />
    </>
  );
}
