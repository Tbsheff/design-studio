import { contextBridge, ipcRenderer } from 'electron';

const VERSION_FLAG = '--studio-version=';
const BOOT_FLAG = '--studio-boot=';
const COMMAND_CHANNEL = 'studio:command';
const CONTEXT_CHANNEL = 'studio:context';
const PICK_FOLDER_CHANNEL = 'studio:pick-folder';

type Command = { type: string } & Record<string, unknown>;

function appVersion(): string {
  const arg = process.argv.find((value) => value.startsWith(VERSION_FLAG));
  return arg ? arg.slice(VERSION_FLAG.length) : '';
}

interface Boot {
  startedAt: number;
  marks: Record<string, number>;
}

function bootTimes(): Boot | null {
  const arg = process.argv.find((value) => value.startsWith(BOOT_FLAG));
  if (!arg) return null;
  try {
    const parsed = JSON.parse(arg.slice(BOOT_FLAG.length)) as Partial<Boot>;
    if (typeof parsed.startedAt !== 'number' || typeof parsed.marks !== 'object' || parsed.marks === null) return null;
    return { startedAt: parsed.startedAt, marks: { ...parsed.marks } };
  } catch {
    return null;
  }
}

const queued: Command[] = [];
let deliver: ((command: Command) => void) | null = null;

ipcRenderer.on(COMMAND_CHANNEL, (_event, command: Command) => {
  if (deliver) deliver(command);
  else queued.push(command);
});

function onCommand(handler: (command: Command) => void): void {
  if (typeof handler !== 'function' || deliver) return;
  deliver = handler;
  for (const command of queued.splice(0)) handler(command);
}

function setContext(context: unknown): void {
  ipcRenderer.send(CONTEXT_CHANNEL, context);
}

async function pickFolder(options: unknown): Promise<string | null> {
  const record = typeof options === 'object' && options !== null ? (options as Record<string, unknown>) : {};
  const title = typeof record.title === 'string' ? record.title : undefined;
  const defaultPath = typeof record.defaultPath === 'string' ? record.defaultPath : undefined;
  const chosen: unknown = await ipcRenderer.invoke(PICK_FOLDER_CHANNEL, { title, defaultPath });
  return typeof chosen === 'string' ? chosen : null;
}

contextBridge.exposeInMainWorld('studioDesktop', Object.freeze({ platform: process.platform, version: appVersion(), boot: bootTimes(), onCommand, setContext, pickFolder }));
