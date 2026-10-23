import { shell, type Session, type WebContents } from 'electron';
import { VITE_PORT_RANGE, type PortSet } from './ports.js';

const EXTERNAL_PROTOCOLS = new Set(['http:', 'https:', 'mailto:']);
const ALLOWED_PERMISSIONS = new Set(['clipboard-read', 'clipboard-sanitized-write']);
const LOOPBACK_HOSTS = new Set(['127.0.0.1', 'localhost']);

function parse(raw: string): URL | null {
  try {
    return new URL(raw);
  } catch {
    return null;
  }
}

function isPreviewHost(hostname: string): boolean {
  return LOOPBACK_HOSTS.has(hostname) || hostname.endsWith('.localhost');
}

function isVitePort(port: number, ports: PortSet): boolean {
  return port >= ports.viteBase && port < ports.viteBase + VITE_PORT_RANGE;
}

export function isInternalUrl(raw: string, ports: PortSet | null): boolean {
  const url = parse(raw);
  if (!ports || !url || url.protocol !== 'http:') return false;
  const port = Number(url.port);
  if (url.hostname === '127.0.0.1' && port === ports.studio) return true;
  if (isPreviewHost(url.hostname) && port === ports.preview) return true;
  return LOOPBACK_HOSTS.has(url.hostname) && isVitePort(port, ports);
}

export function openExternally(raw: string): void {
  const url = parse(raw);
  if (url && EXTERNAL_PROTOCOLS.has(url.protocol)) void shell.openExternal(url.href);
}

export function guardContents(contents: WebContents, ports: () => PortSet | null): void {
  contents.on('will-navigate', (event, url) => {
    if (isInternalUrl(url, ports())) return;
    event.preventDefault();
    openExternally(url);
  });
  contents.setWindowOpenHandler(({ url }) => {
    openExternally(url);
    return { action: 'deny' };
  });
}

export function guardPermissions(session: Session): void {
  session.setPermissionRequestHandler((_contents, permission, callback) => {
    callback(ALLOWED_PERMISSIONS.has(permission));
  });
  session.setPermissionCheckHandler((_contents, permission) => ALLOWED_PERMISSIONS.has(permission));
}
