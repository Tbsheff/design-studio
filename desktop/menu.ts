import { app, Menu, type MenuItemConstructorOptions } from 'electron';
import type { ZoomKey } from '../src/shared/contracts.js';

export interface MenuActions {
  checkSetup: () => void;
  checkUpdates: () => void;
  newProject: () => void;
  openFolder: () => void;
  undo: () => void;
  redo: () => void;
  run: () => void;
  stop: () => void;
  zoom: (key: ZoomKey) => void;
  revealWorkTree: () => void;
  revealExport: () => void;
}

export interface MenuState {
  inProject: boolean;
  running: boolean;
  hasExport: boolean;
  updatesEnabled: boolean;
}

export const MENU_IDS = {
  newProject: 'new-project',
  openFolder: 'open-folder',
  undo: 'undo',
  redo: 'redo',
  run: 'run',
  stop: 'stop',
  revealWorkTree: 'reveal-work-tree',
  revealExport: 'reveal-export',
  checkUpdates: 'check-updates',
  checkSetup: 'check-setup',
  zoomIn: 'zoom-in',
  zoomOut: 'zoom-out',
  zoomActual: 'zoom-actual',
  zoomFit: 'zoom-fit',
  zoomSelection: 'zoom-selection',
} as const;

function appMenu(actions: MenuActions, state: MenuState): MenuItemConstructorOptions {
  return {
    label: app.name,
    submenu: [
      { role: 'about' },
      { id: MENU_IDS.checkUpdates, label: 'Check for Updates…', enabled: state.updatesEnabled, click: actions.checkUpdates },
      { id: MENU_IDS.checkSetup, label: 'Check Setup…', click: actions.checkSetup },
      { type: 'separator' },
      { role: 'services' },
      { type: 'separator' },
      { role: 'hide' },
      { role: 'hideOthers' },
      { role: 'unhide' },
      { type: 'separator' },
      { role: 'quit' },
    ],
  };
}

function fileMenu(actions: MenuActions, state: MenuState): MenuItemConstructorOptions {
  return {
    label: 'File',
    submenu: [
      { id: MENU_IDS.newProject, label: 'New Project', accelerator: 'CmdOrCtrl+N', click: actions.newProject },
      { id: MENU_IDS.openFolder, label: 'Open Folder…', accelerator: 'CmdOrCtrl+O', click: actions.openFolder },
      { label: 'Open Recent', role: 'recentDocuments', submenu: [{ role: 'clearRecentDocuments' }] },
      { type: 'separator' },
      { id: MENU_IDS.revealWorkTree, label: 'Reveal Work Tree in Finder', enabled: state.inProject, click: actions.revealWorkTree },
      { id: MENU_IDS.revealExport, label: 'Reveal Last Export in Finder', enabled: state.hasExport, click: actions.revealExport },
      { type: 'separator' },
      { role: 'close' },
    ],
  };
}

function editMenu(actions: MenuActions): MenuItemConstructorOptions {
  return {
    label: 'Edit',
    submenu: [
      { id: MENU_IDS.undo, label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: actions.undo },
      { id: MENU_IDS.redo, label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: actions.redo },
      { type: 'separator' },
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { role: 'pasteAndMatchStyle' },
      { role: 'delete' },
      { role: 'selectAll' },
    ],
  };
}

function runMenu(actions: MenuActions, state: MenuState): MenuItemConstructorOptions {
  return {
    label: 'Run',
    submenu: [
      { id: MENU_IDS.run, label: 'Run', accelerator: 'CmdOrCtrl+Enter', enabled: state.inProject && !state.running, click: actions.run },
      { id: MENU_IDS.stop, label: 'Stop', accelerator: 'CmdOrCtrl+.', enabled: state.inProject && state.running, click: actions.stop },
    ],
  };
}

function viewMenu(actions: MenuActions, state: MenuState): MenuItemConstructorOptions {
  const zoom = (id: string, label: string, accelerator: string, key: ZoomKey): MenuItemConstructorOptions => ({
    id,
    label,
    accelerator,
    enabled: state.inProject,
    click: () => actions.zoom(key),
  });
  return {
    label: 'View',
    submenu: [
      { role: 'reload' },
      { role: 'forceReload' },
      { role: 'toggleDevTools' },
      { type: 'separator' },
      zoom(MENU_IDS.zoomIn, 'Zoom In', 'CmdOrCtrl+=', 'in'),
      zoom(MENU_IDS.zoomOut, 'Zoom Out', 'CmdOrCtrl+-', 'out'),
      zoom(MENU_IDS.zoomActual, 'Zoom to 100%', 'CmdOrCtrl+0', 'actual'),
      zoom(MENU_IDS.zoomFit, 'Zoom to Fit', 'CmdOrCtrl+1', 'fit'),
      zoom(MENU_IDS.zoomSelection, 'Zoom to Selection', 'CmdOrCtrl+2', 'selection'),
      { type: 'separator' },
      { role: 'togglefullscreen' },
    ],
  };
}

export function buildMenu(actions: MenuActions, state: MenuState): Menu {
  return Menu.buildFromTemplate([appMenu(actions, state), fileMenu(actions, state), editMenu(actions), viewMenu(actions, state), runMenu(actions, state), { role: 'windowMenu' }]);
}

export function buildDockMenu(newProject: () => void, recents: { id: string; name: string }[], open: (id: string) => void): Menu {
  const items: MenuItemConstructorOptions[] = [{ label: 'New Project', click: newProject }];
  if (recents.length > 0) items.push({ type: 'separator' }, ...recents.map((recent) => ({ label: recent.name, click: () => open(recent.id) })));
  return Menu.buildFromTemplate(items);
}
