import { appendFileSync, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { app, dialog } from 'electron';
import electronUpdater, { type AppUpdater, type UpdateInfo } from 'electron-updater';

export const UPDATE_FEED_ENV = 'STUDIO_UPDATE_FEED';
export const UPDATE_CHECK_ENV = 'STUDIO_UPDATE_CHECK';
const PERIODIC_CHECK_MS = 6 * 60 * 60 * 1000;

export type UpdateState = 'disabled' | 'checking' | 'none' | 'downloading' | 'ready' | 'deferred' | 'installing' | 'error';

export interface UpdateEvent {
  state: UpdateState;
  version?: string;
  detail?: string;
}

export interface UpdaterOptions {
  activeRuns: () => number;
  logFile: string;
  resourcesPath: string;
  env?: NodeJS.ProcessEnv;
}

export type InstallDecision = 'prompt' | 'defer';

export function installDecision(activeRuns: number): InstallDecision {
  return activeRuns > 0 ? 'defer' : 'prompt';
}

export function feedSource(env: NodeJS.ProcessEnv, packaged: boolean, resourcesPath: string): { kind: 'env'; url: string } | { kind: 'bundled' } | null {
  if (!packaged) return null;
  const url = env[UPDATE_FEED_ENV];
  if (url) return /^https?:\/\//.test(url) ? { kind: 'env', url } : null;
  return existsSync(path.join(resourcesPath, 'app-update.yml')) ? { kind: 'bundled' } : null;
}

export class Updater {
  readonly enabled: boolean;
  private readonly updater: AppUpdater | null = null;
  private ready: UpdateInfo | null = null;
  private manual = false;
  private prompting = false;
  private waitingForRuns = false;
  private installing = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly options: UpdaterOptions) {
    const source = feedSource(options.env ?? process.env, app.isPackaged, options.resourcesPath);
    this.enabled = source !== null;
    if (!source) return;
    const updater = electronUpdater.autoUpdater;
    updater.logger = { info: (m: unknown) => this.log('info', m), warn: (m: unknown) => this.log('warn', m), error: (m: unknown) => this.log('error', m), debug: () => undefined };
    updater.autoDownload = true;
    updater.autoInstallOnAppQuit = false;
    if (source.kind === 'env') updater.setFeedURL({ provider: 'generic', url: source.url });
    updater.on('checking-for-update', () => this.emit({ state: 'checking' }));
    updater.on('update-not-available', () => void this.onNone());
    updater.on('update-available', (info: UpdateInfo) => this.emit({ state: 'downloading', version: info.version }));
    updater.on('update-downloaded', (info: UpdateInfo) => void this.onDownloaded(info));
    updater.on('error', (error: Error) => void this.onError(error));
    this.updater = updater;
  }

  private log(level: string, message: unknown): void {
    const line = `${new Date().toISOString()} [updater] ${level} ${message instanceof Error ? (message.stack ?? message.message) : String(message)}`;
    console.log(line);
    try {
      mkdirSync(path.dirname(this.options.logFile), { recursive: true });
      appendFileSync(this.options.logFile, `${line}\n`);
    } catch {
      return;
    }
  }

  private emit(event: UpdateEvent): void {
    this.log('info', `state ${event.state}${event.version ? ` ${event.version}` : ''}${event.detail ? `: ${event.detail}` : ''}`);
    app.emit('studio-update', event);
  }

  start(): void {
    if (!this.enabled || (this.options.env ?? process.env)[UPDATE_CHECK_ENV] === 'off') return;
    void this.check(false);
    this.timer = setInterval(() => void this.check(false), PERIODIC_CHECK_MS);
    this.timer.unref();
  }

  async check(manual: boolean): Promise<void> {
    if (!this.updater) {
      if (manual) await dialog.showMessageBox({ type: 'info', message: 'Updates are not set up for this build', buttons: ['OK'] });
      return;
    }
    if (this.ready) {
      await this.offerInstall();
      return;
    }
    this.manual = manual;
    await this.updater.checkForUpdates().catch((error: unknown) => this.onError(error instanceof Error ? error : new Error(String(error))));
  }

  private async onNone(): Promise<void> {
    this.emit({ state: 'none' });
    if (this.manual) await dialog.showMessageBox({ type: 'info', message: `Design Studio ${app.getVersion()} is the newest version`, buttons: ['OK'] });
    this.manual = false;
  }

  private async onError(error: Error): Promise<void> {
    this.emit({ state: 'error', detail: error.message });
    if (this.installing) {
      this.installing = false;
      this.ready = null;
      await dialog.showMessageBox({ type: 'warning', message: 'Design Studio could not install the update', detail: `${error.message}\n\nDesign Studio keeps running the current version.`, buttons: ['OK'] });
    } else if (this.manual) {
      await dialog.showMessageBox({ type: 'warning', message: 'Design Studio could not check for updates', detail: error.message, buttons: ['OK'] });
    }
    this.manual = false;
  }

  private async onDownloaded(info: UpdateInfo): Promise<void> {
    this.ready = info;
    this.manual = false;
    this.emit({ state: 'ready', version: info.version });
    await this.offerInstall();
  }

  runsIdle(): void {
    if (!this.waitingForRuns || this.options.activeRuns() > 0) return;
    this.waitingForRuns = false;
    void this.offerInstall();
  }

  private async offerInstall(): Promise<void> {
    if (!this.ready || this.prompting || !this.updater) return;
    const version = this.ready.version;
    this.prompting = true;
    try {
      if (installDecision(this.options.activeRuns()) === 'defer') {
        this.waitingForRuns = true;
        this.emit({ state: 'deferred', version, detail: 'run active' });
        await dialog.showMessageBox({ type: 'info', message: `Design Studio ${version} is ready to install`, detail: 'A run is in progress. Design Studio asks again when it finishes.', buttons: ['OK'] });
        return;
      }
      const { response } = await dialog.showMessageBox({
        type: 'info',
        message: `Design Studio ${version} is ready to install`,
        detail: 'Restart now to update. Your projects and settings stay as they are.',
        buttons: ['Restart Now', 'Later'],
        defaultId: 0,
        cancelId: 1,
      });
      if (response !== 0) return;
      if (installDecision(this.options.activeRuns()) === 'defer') {
        this.waitingForRuns = true;
        this.emit({ state: 'deferred', version, detail: 'run started before restart' });
        return;
      }
      this.installing = true;
      this.emit({ state: 'installing', version });
      this.updater.quitAndInstall(false, true);
    } finally {
      this.prompting = false;
    }
  }
}
