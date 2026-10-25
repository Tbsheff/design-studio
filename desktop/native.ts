import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, session, shell, type DownloadItem, type WebContents } from 'electron';
import { DESKTOP_IPC, isCommandId, isDesktopContext, parseDeepLink, parseDroppedPath, parsePickFolderRequest, type DesktopCommand, type DesktopContext } from '../src/shared/desktop-link.js';
import { buildDockMenu, buildMenu, type MenuState } from './menu.js';
import { NOTIFY_ENV, runNotice } from './notify.js';
import { addRecent, readRecents, writeRecents, type RecentProject } from './recents.js';
import type { FinishedRun, ServerLink } from './server-link.js';
import type { Updater } from './updater.js';

export const DOWNLOADS_ENV = 'STUDIO_DESKTOP_DOWNLOADS';

export interface NativeDeps {
  link: ServerLink;
  studioWindows: () => BrowserWindow[];
  studioOrigin: () => string | null;
  windowsAllowed: () => boolean;
  focusWindow: () => void;
  checkSetup: () => void;
  updater: () => Updater | null;
  recentsFile: () => string;
}

function uniquePath(dir: string, name: string): string {
  const parsed = path.parse(path.basename(name) || 'export.zip');
  let candidate = path.join(dir, parsed.base);
  for (let n = 2; existsSync(candidate); n += 1) candidate = path.join(dir, `${parsed.name} ${n}${parsed.ext}`);
  return candidate;
}

function isFolder(target: string): boolean {
  try {
    return statSync(target).isDirectory();
  } catch {
    return false;
  }
}

export class NativeShell {
  private readonly pending: DesktopCommand[] = [];
  private context: DesktopContext = { projectId: null, directionId: null, running: false };
  private lastExport: string | null = null;
  private recents: RecentProject[] = [];
  private ready = false;
  private pickerOpen = false;
  private unseenRuns = 0;
  private readonly loaded = new WeakSet<WebContents>();

  constructor(private readonly deps: NativeDeps) {}

  registerEarly(): void {
    app.on('will-finish-launching', () => {
      app.on('open-file', (event, target) => {
        event.preventDefault();
        this.openFolder(target);
      });
      app.on('open-url', (event, url) => {
        event.preventDefault();
        this.openUrl(url);
      });
    });
  }

  install(): void {
    this.ready = true;
    this.recents = readRecents(this.deps.recentsFile());
    ipcMain.on(DESKTOP_IPC.context, (event, raw: unknown) => this.onContext(event.sender, raw));
    ipcMain.handle(DESKTOP_IPC.pickFolder, (event, raw: unknown) => this.pickFolder(event.sender, raw));
    ipcMain.on(DESKTOP_IPC.dropFolder, (event, raw: unknown) => this.onDropFolder(event.sender, raw));
    session.defaultSession.on('will-download', (_event, item, contents) => this.onDownload(item, contents));
    this.refreshMenus();
  }

  private isStudio(contents: WebContents): boolean {
    const origin = this.deps.studioOrigin();
    return origin !== null && contents.getURL().startsWith(`${origin}/`) && this.deps.studioWindows().some((window) => window.webContents === contents);
  }

  private target(): BrowserWindow | null {
    const origin = this.deps.studioOrigin();
    if (!origin || !this.deps.windowsAllowed()) return null;
    return this.deps.studioWindows().find((window) => window.webContents.getURL().startsWith(`${origin}/`) && this.loaded.has(window.webContents)) ?? null;
  }

  trackWindow(window: BrowserWindow): void {
    const contents = window.webContents;
    window.on('focus', () => this.setUnseen(0));
    contents.on('did-start-navigation', (details) => {
      if (details.isMainFrame && !details.isSameDocument) this.loaded.delete(contents);
    });
    contents.on('did-finish-load', () => {
      this.loaded.add(contents);
      this.flush();
    });
  }

  send(command: DesktopCommand): void {
    const window = this.target();
    if (!window) {
      this.pending.push(command);
      if (this.deps.windowsAllowed()) this.deps.focusWindow();
      return;
    }
    window.webContents.send(DESKTOP_IPC.command, command);
    app.emit('studio-command', command);
  }

  flush(): void {
    const window = this.target();
    if (!window) return;
    for (const command of this.pending.splice(0)) {
      window.webContents.send(DESKTOP_IPC.command, command);
      app.emit('studio-command', command);
    }
  }

  openUrl(url: string): void {
    const command = parseDeepLink(url);
    if (!command) {
      console.warn(`[desktop] ignored link ${url.slice(0, 200)}`);
      return;
    }
    this.send(command);
    if (this.deps.windowsAllowed()) this.deps.focusWindow();
  }

  openFolder(target: string): void {
    if (!path.isAbsolute(target) || !isFolder(target)) {
      console.warn(`[desktop] ignored open of ${target.slice(0, 200)}: not a folder`);
      return;
    }
    this.send({ type: 'open-folder', path: path.resolve(target) });
    if (this.deps.windowsAllowed()) this.deps.focusWindow();
  }

  secondInstance(argv: string[]): void {
    const link = argv.find((arg) => arg.startsWith('designstudio:'));
    if (link) this.openUrl(link);
    else this.deps.focusWindow();
  }

  private menuState(): MenuState {
    return { inProject: this.context.projectId !== null, running: this.context.running, hasExport: this.lastExport !== null, updatesEnabled: this.deps.updater()?.enabled ?? false };
  }

  refreshMenus(): void {
    if (!this.ready) return;
    Menu.setApplicationMenu(
      buildMenu(
        {
          checkSetup: this.deps.checkSetup,
          checkUpdates: () => void this.deps.updater()?.check(true),
          newProject: () => this.send({ type: 'new-project' }),
          openFolder: () => void this.chooseFolder(),
          undo: () => this.edit('undo'),
          redo: () => this.edit('redo'),
          run: () => this.send({ type: 'run' }),
          stop: () => this.send({ type: 'stop' }),
          zoom: (key) => this.send({ type: 'zoom', key }),
          command: (id) => {
            if (isCommandId(id)) this.send({ type: 'command', id });
          },
          revealWorkTree: () => void this.revealWorkTree(),
          revealExport: () => this.revealExport(),
        },
        this.menuState(),
      ),
    );
    app.dock?.setMenu(buildDockMenu(() => this.send({ type: 'new-project' }), this.recents.slice(0, 5), (projectId) => this.send({ type: 'open-project', projectId })));
  }

  private edit(kind: 'undo' | 'redo'): void {
    const focused = BrowserWindow.getFocusedWindow();
    if (focused && !this.isStudio(focused.webContents)) {
      if (kind === 'undo') focused.webContents.undo();
      else focused.webContents.redo();
      return;
    }
    this.send({ type: kind });
  }

  private async showFolderDialog(parent: BrowserWindow | null, options: { title: string; buttonLabel: string; defaultPath?: string }): Promise<string | null> {
    if (this.pickerOpen) return null;
    this.pickerOpen = true;
    try {
      const dialogOptions: Electron.OpenDialogOptions = { ...options, properties: ['openDirectory', 'createDirectory'] };
      const result = parent ? await dialog.showOpenDialog(parent, dialogOptions) : await dialog.showOpenDialog(dialogOptions);
      const [folder] = result.filePaths;
      return !result.canceled && folder && isFolder(folder) ? path.resolve(folder) : null;
    } finally {
      this.pickerOpen = false;
    }
  }

  private async chooseFolder(): Promise<void> {
    const folder = await this.showFolderDialog(this.target(), { title: 'Open Folder', buttonLabel: 'Open' });
    if (folder) this.openFolder(folder);
  }

  private async pickFolder(sender: WebContents, raw: unknown): Promise<string | null> {
    if (!this.isStudio(sender)) return null;
    const request = parsePickFolderRequest(raw);
    if (!request) return null;
    const defaultPath = request.defaultPath && isFolder(request.defaultPath) ? request.defaultPath : undefined;
    const folder = await this.showFolderDialog(BrowserWindow.fromWebContents(sender), { title: request.title, buttonLabel: 'Choose', ...(defaultPath ? { defaultPath } : {}) });
    app.emit('studio-pick-folder', { title: request.title, defaultPath: defaultPath ?? null, folder });
    return folder;
  }

  private onDropFolder(sender: WebContents, raw: unknown): void {
    if (!this.isStudio(sender)) return;
    const dropped = parseDroppedPath(raw);
    if (dropped) this.openFolder(dropped);
  }

  private setUnseen(count: number): void {
    if (count === this.unseenRuns) return;
    this.unseenRuns = count;
    app.dock?.setBadge(count > 0 ? String(count) : '');
    app.emit('studio-badge', count);
  }

  private onContext(sender: WebContents, raw: unknown): void {
    if (!this.isStudio(sender) || !isDesktopContext(raw)) return;
    const previous = this.context.projectId;
    this.context = raw;
    this.refreshMenus();
    if (raw.projectId && raw.projectId !== previous) void this.remember(raw.projectId);
  }

  private async remember(projectId: string): Promise<void> {
    const project = await this.deps.link.project(projectId);
    const main = project?.directions[0];
    if (!project || !main) return;
    const folder = project.imported?.sourcePath ?? main.workTree;
    this.recents = addRecent(this.recents, { id: project.id, name: project.name, folder });
    writeRecents(this.deps.recentsFile(), this.recents);
    app.addRecentDocument(folder);
    this.refreshMenus();
    app.emit('studio-recent', { id: project.id, folder });
  }

  private async revealWorkTree(): Promise<void> {
    const { projectId, directionId } = this.context;
    if (!projectId) return;
    const folder = await this.deps.link.workTree(projectId, directionId);
    if (!folder) {
      console.warn(`[desktop] no work tree to reveal for ${projectId}`);
      return;
    }
    shell.showItemInFolder(folder);
    app.emit('studio-reveal', folder);
  }

  private revealExport(): void {
    if (!this.lastExport || !existsSync(this.lastExport)) return;
    shell.showItemInFolder(this.lastExport);
    app.emit('studio-reveal', this.lastExport);
  }

  private onDownload(item: DownloadItem, contents: WebContents): void {
    if (!this.isStudio(contents)) {
      item.cancel();
      return;
    }
    const dir = process.env[DOWNLOADS_ENV] || app.getPath('downloads');
    const target = uniquePath(dir, item.getFilename());
    item.setSavePath(target);
    item.once('done', (_event, state) => {
      if (state !== 'completed') return;
      this.lastExport = target;
      this.refreshMenus();
      app.emit('studio-export', target);
    });
  }

  async runFinished(finished: FinishedRun): Promise<void> {
    this.deps.updater()?.runsIdle();
    const focused = this.deps.studioWindows().some((window) => window.isFocused());
    const project = await this.deps.link.project(finished.run.projectId);
    const notice = runNotice(finished, project?.name ?? null, focused);
    if (!notice) return;
    if (!this.deps.studioWindows().some((window) => window.isFocused())) this.setUnseen(this.unseenRuns + 1);
    app.emit('studio-notification', notice);
    if (process.env[NOTIFY_ENV] === 'off' || !Notification.isSupported()) return;
    const shown = new Notification({ title: notice.title, body: notice.body });
    shown.on('click', () => this.send({ type: 'open-project', projectId: notice.projectId }));
    shown.show();
  }
}
