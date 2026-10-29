import { lazy, Suspense, useCallback, useEffect, useRef, useState, type KeyboardEvent, type ReactNode, type RefObject } from 'react';
import { PORT_OPEN_EVENT } from '../../shared/port';
import { setPortAvailable, type PortOpenDetail } from '../portApi';
import { uiStore, type ZoomSetting } from '../storage';
import type { PortDialogTarget } from './PortToAppDialog';
import { usePopover } from '../usePopover';
import { Icon, type IconName } from './Icon';
import { IS_MAC, tipWithKey } from '../commands/keys';
import { shortcutLabel } from '../../shared/keymap';

export type CanvasTool = 'select' | 'comment' | 'edit' | 'prototype' | null;
export type PresentMode = 'window' | 'fullscreen' | 'new-window' | 'play';

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
}

function onMenuKey(event: KeyboardEvent<HTMLDivElement>) {
  if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
  const items = [...event.currentTarget.querySelectorAll<HTMLButtonElement>('.ui-menu-item:not(:disabled)')];
  const at = items.indexOf(document.activeElement as HTMLButtonElement);
  event.preventDefault();
  items[(at + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length]?.focus();
}

function MenuPopover({ groups, label, align, onClose, trigger }: { groups: MenuGroup[]; label: string; align: 'start' | 'end'; onClose: (refocus: boolean) => void; trigger: RefObject<HTMLButtonElement | null> }) {
  const root = useRef<HTMLDivElement>(null);
  usePopover(true, root, onClose, trigger);
  return (
    <div ref={root} className={`ui-menu topbar-menu align-${align}`} role="menu" aria-label={label} onKeyDown={onMenuKey}>
      {groups
        .filter((g) => g.items.length > 0 || g.note)
        .map((group, i) => (
          <div key={group.label ?? i} className="ui-menu-section">
            {group.label && <div className="ui-menu-label">{group.label}</div>}
            {group.items.map((item) => (
              <button
                key={item.id}
                type="button"
                role={item.checked === undefined ? 'menuitem' : 'menuitemradio'}
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

function shareGroups(p: { canExport: boolean; onExport: () => void; onShip?: (() => void) | null; onShareLink?: (() => void) | null }, onPort: (() => void) | null): MenuGroup[] {
  const exportItem: MenuEntry = { id: 'export', label: 'Export…', icon: 'download', meta: 'PNG, PDF, HTML, handoff', disabled: !p.canExport, run: p.onExport, ...(p.canExport ? {} : { tip: 'Save a version to export' }) };
  const ship = p.onShip;
  const shipItem: MenuEntry[] = ship ? [{ id: 'ship', label: 'Ship as a pull request…', icon: 'branch', meta: 'Branch and PR', run: ship }] : [];
  const portItem: MenuEntry[] = onPort ? [{ id: 'port', label: 'Move to app…', icon: 'react', meta: 'Route in your app', run: onPort, tip: 'The agent rebuilds a page as a route in an attached app, with its kit components' }] : [];
  const link = p.onShareLink;
  const linkItem: MenuEntry[] = link ? [{ id: 'share-link', label: 'Share a read-only link…', icon: 'link', meta: 'View and comment', disabled: !p.canExport, run: link, tip: p.canExport ? 'Others see still images of the frames and can comment' : 'Save a version to share' }] : [];
  return [{ items: [exportItem, ...shipItem, ...portItem] }, { items: linkItem, note: 'Links are off until you make one. Nothing leaves this computer.' }];
}

const PortToAppDialog = lazy(() => import('./PortToAppDialog'));

function usePortDialog(available: boolean): { target: PortDialogTarget | null; open: (frameId: string | null, directionId?: string | null) => void; close: () => void } {
  const [target, setTarget] = useState<PortDialogTarget | null>(null);
  const open = useCallback((frameId: string | null, directionId?: string | null) => {
    const { activeProjectId, directionByProject } = uiStore.get();
    if (!activeProjectId) return;
    setTarget({ projectId: activeProjectId, directionId: directionId ?? directionByProject[activeProjectId] ?? null, frameId });
  }, []);
  useEffect(() => {
    setPortAvailable(available);
    return () => setPortAvailable(false);
  }, [available]);
  useEffect(() => {
    const onOpen = (event: Event) => {
      const detail = (event as CustomEvent<PortOpenDetail>).detail;
      open(detail?.frameId ?? null, detail?.directionId ?? null);
    };
    window.addEventListener(PORT_OPEN_EVENT, onOpen);
    return () => window.removeEventListener(PORT_OPEN_EVENT, onOpen);
  }, [open]);
  return { target, open, close: useCallback(() => setTarget(null), []) };
}

export function DropMenu({ label, groups, className, align = 'start', tip, children, onOpen }: { label: string; groups: () => MenuGroup[]; className: string; align?: 'start' | 'end'; tip?: string; children: ReactNode; onOpen?: () => void }) {
  const [open, setOpen] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const close = useCallback((refocus: boolean) => {
    setOpen(false);
    if (refocus) trigger.current?.focus();
  }, []);
  return (
    <span className="topbar-anchor">
      <button
        ref={trigger}
        type="button"
        className={className}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        data-tip={open ? undefined : tip}
        data-tip-align={align === 'end' ? 'end' : undefined}
        onClick={() => {
          if (!open) onOpen?.();
          setOpen((v) => !v);
        }}
      >
        {children}
      </button>
      {open && <MenuPopover groups={groups()} label={label} align={align} onClose={close} trigger={trigger} />}
    </span>
  );
}

const ZOOMS = [0.5, 0.75, 1, 1.25, 2];

function ZoomPill({ zoom, setting, onZoomTo, onFit, onStep }: { zoom: number; setting: ZoomSetting; onZoomTo: (z: number) => void; onFit: () => void; onStep: (d: 1 | -1) => void }) {
  const groups = (): MenuGroup[] => [
    {
      items: [
        { id: 'in', label: 'Zoom in', meta: shortcutLabel('zoom-in', IS_MAC), run: () => onStep(1) },
        { id: 'out', label: 'Zoom out', meta: shortcutLabel('zoom-out', IS_MAC), run: () => onStep(-1) },
      ],
    },
    {
      items: [
        { id: 'fit', label: 'Zoom to fit', meta: shortcutLabel('zoom-fit', IS_MAC), checked: setting === 'fit', run: onFit },
        ...ZOOMS.map((z) => ({ id: String(z), label: `${Math.round(z * 100)}%`, checked: setting === z, run: () => onZoomTo(z) })),
      ],
    },
  ];
  return (
    <DropMenu label={`Zoom ${Math.round(zoom * 100)}%`} className="topbar-zoom" groups={groups} align="end" tip={tipWithKey('Zoom', 'zoom-fit')}>
      {Math.round(zoom * 100)}%
    </DropMenu>
  );
}

interface Props {
  shapeTools?: ReactNode;
  paneCollapsed: boolean;
  onExpandPane: () => void;
  onReload: () => void;
  tweakOpen: boolean;
  onTweak: () => void;
  tweakDisabled: boolean;
  fileName: string;
  fileMenu: () => MenuGroup[];
  onFileMenuOpen: () => void;
  zoom: number;
  zoomSetting: ZoomSetting;
  onZoomTo: (z: number) => void;
  onZoomStep: (d: 1 | -1) => void;
  onFit: () => void;
  tool: CanvasTool;
  commentAvailable: boolean;
  onTool: (tool: Exclude<CanvasTool, null>) => void;
  viewOpen: boolean;
  onToggleView: () => void;
  onPresent: (mode: PresentMode) => void;
  presentDisabled: boolean;
  canExport: boolean;
  onExport: () => void;
  onShip?: (() => void) | null;
  onShareLink?: (() => void) | null;
}

export function CanvasTopBar(p: Props) {
  const port = usePortDialog(!p.onShip);
  const onPort = p.onShip ? null : () => port.open(null);
  const presentGroups = (): MenuGroup[] => [
    {
      items: [
        { id: 'play', label: 'Play prototype', icon: 'link', run: () => p.onPresent('play') },
        { id: 'window', label: 'In this window', icon: 'play', run: () => p.onPresent('window') },
        { id: 'fullscreen', label: 'Fullscreen', icon: 'expand', run: () => p.onPresent('fullscreen') },
        { id: 'new-window', label: 'New window', icon: 'window', run: () => p.onPresent('new-window') },
      ],
    },
  ];
  return (
    <div className="toolbar canvas-topbar" role="toolbar" aria-label="Canvas">
      {p.paneCollapsed && (
        <button type="button" className="icon-btn topbar-icon" aria-label="Show chat pane" data-tip="Show pane" data-tip-align="start" onClick={p.onExpandPane}>
          <Icon name="sidebar" size={14} />
        </button>
      )}
      <button type="button" className="icon-btn topbar-icon" aria-label="Reload preview" data-tip="Reload" data-tip-align="start" onClick={p.onReload}>
        <Icon name="reload" size={14} />
      </button>
      <button
        type="button"
        className="icon-btn topbar-icon"
        aria-label="Tweak"
        aria-pressed={p.tweakOpen}
        aria-expanded={p.tweakOpen}
        disabled={p.tweakDisabled}
        data-tip={p.tweakOpen ? undefined : 'Describe a tweak'}
        onClick={p.onTweak}
      >
        <Icon name="sliders" size={14} />
      </button>
      <DropMenu label="Pages and frames" className="topbar-file" groups={p.fileMenu} onOpen={p.onFileMenuOpen} tip="Pages and frames">
        <span className="truncate">{p.fileName}</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <button type="button" className="icon-btn topbar-icon" aria-label="View options" aria-pressed={p.viewOpen} data-tip="Size, source and checks" onClick={p.onToggleView}>
        <Icon name="more" size={14} />
      </button>
      <div className="spacer" />
      <ZoomPill zoom={p.zoom} setting={p.zoomSetting} onZoomTo={p.onZoomTo} onFit={p.onFit} onStep={p.onZoomStep} />
      <div className="ui-tools topbar-tools" role="group" aria-label="Tool">
        <button type="button" aria-label="Select" aria-pressed={p.tool === 'select'} aria-keyshortcuts="V" data-tip={tipWithKey('Select elements', 'tool-select')} onClick={() => p.onTool('select')}>
          <Icon name="pointer" size={14} />
          <span>Select</span>
        </button>
        <button type="button" aria-label="Comment" aria-pressed={p.tool === 'comment'} aria-keyshortcuts="C" disabled={!p.commentAvailable} data-tip={p.commentAvailable ? tipWithKey('Comment', 'tool-comment') : 'Comments work on the live preview'} onClick={() => p.onTool('comment')}>
          <Icon name="comment" size={14} />
          <span>Comment</span>
        </button>
        <button type="button" aria-label="Edit" aria-pressed={p.tool === 'edit'} aria-keyshortcuts="Alt+1" data-tip={tipWithKey('Edit and layers', 'layers')} onClick={() => p.onTool('edit')}>
          <Icon name="edit" size={14} />
          <span>Edit</span>
        </button>
        <button type="button" aria-label="Prototype" aria-pressed={p.tool === 'prototype'} data-tip="Link elements to frames, then Play" onClick={() => p.onTool('prototype')}>
          <Icon name="link" size={14} />
          <span>Prototype</span>
        </button>
      </div>
      {p.shapeTools}
      <span data-topbar-slot="review" style={{ display: 'contents' }} />
      <DropMenu label="Present" className="btn ghost topbar-present" groups={presentGroups} align="end">
        <span>Present</span>
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <DropMenu label="Share" className="btn strong topbar-share" groups={() => shareGroups(p, onPort)} align="end" tip={p.onShip ? 'Export, or ship as a pull request' : 'Export images, files or a handoff'}>
        <Icon name="share" size={14} />
        Share
        <Icon name="chevronDown" size={12} />
      </DropMenu>
      <span className="topbar-avatar" role="img" aria-label="You, on this computer" data-tip="You, on this computer" data-tip-align="end">Y</span>
      {port.target && (
        <Suspense fallback={null}>
          <PortToAppDialog target={port.target} onClose={port.close} />
        </Suspense>
      )}
    </div>
  );
}
