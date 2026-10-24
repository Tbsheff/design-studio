import { lookup as dnsLookup } from 'node:dns';
import type { LookupAddress } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { BlockList, isIP } from 'node:net';
import type { LookupFunction } from 'node:net';

export interface FetchPolicy {
  allowLoopback: boolean;
  timeoutMs: number;
  maxBytes: number;
  maxRedirects: number;
  deadline?: number;
  resolve?: (hostname: string) => Promise<LookupAddress[]>;
}

export interface FetchedResource {
  url: string;
  status: number;
  contentType: string;
  body: Buffer;
}

export class FetchBlockedError extends Error {}

export class FetchFailedError extends Error {}

export const PAGE_POLICY: Omit<FetchPolicy, 'allowLoopback'> = { timeoutMs: 10_000, maxBytes: 2 * 1024 * 1024, maxRedirects: 3 };
export const CSS_POLICY: Omit<FetchPolicy, 'allowLoopback'> = { timeoutMs: 10_000, maxBytes: 1024 * 1024, maxRedirects: 3 };

const REDIRECTS = new Set([301, 302, 303, 307, 308]);

function buildBlockList(withLoopback: boolean): BlockList {
  const list = new BlockList();
  const v4: Array<[string, number]> = [
    ['0.0.0.0', 8],
    ['10.0.0.0', 8],
    ['100.64.0.0', 10],
    ['169.254.0.0', 16],
    ['172.16.0.0', 12],
    ['192.0.0.0', 24],
    ['192.0.2.0', 24],
    ['192.88.99.0', 24],
    ['192.168.0.0', 16],
    ['198.18.0.0', 15],
    ['198.51.100.0', 24],
    ['203.0.113.0', 24],
    ['224.0.0.0', 4],
    ['240.0.0.0', 4],
  ];
  const v6: Array<[string, number]> = [
    ['::', 128],
    ['64:ff9b::', 96],
    ['100::', 64],
    ['2001:db8::', 32],
    ['fc00::', 7],
    ['fe80::', 10],
    ['fec0::', 10],
    ['ff00::', 8],
  ];
  if (withLoopback) {
    v4.push(['127.0.0.0', 8]);
    v6.push(['::1', 128]);
  }
  for (const [net, prefix] of v4) list.addSubnet(net, prefix, 'ipv4');
  for (const [net, prefix] of v6) list.addSubnet(net, prefix, 'ipv6');
  return list;
}

const STRICT = buildBlockList(true);
const LOOPBACK_ALLOWED = buildBlockList(false);

function mappedV4(address: string): string | null {
  const match = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/i.exec(address);
  if (match) return match[1] ?? null;
  const hex = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/i.exec(address);
  if (!hex) return null;
  const high = parseInt(hex[1] ?? '0', 16);
  const low = parseInt(hex[2] ?? '0', 16);
  return [high >> 8, high & 255, low >> 8, low & 255].join('.');
}

export function isBlockedAddress(address: string, allowLoopback: boolean): boolean {
  const list = allowLoopback ? LOOPBACK_ALLOWED : STRICT;
  const v4 = mappedV4(address);
  if (v4) return list.check(v4, 'ipv4');
  const family = isIP(address);
  if (family === 4) return list.check(address, 'ipv4');
  if (family === 6) return list.check(address, 'ipv6');
  return true;
}

function isLocalName(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal') || !host.includes('.');
}

function bareHost(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

export function checkUrl(raw: string, allowLoopback: boolean): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchBlockedError(`not a valid URL: ${raw.slice(0, 200)}`);
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw new FetchBlockedError(`only http and https URLs are allowed: ${url.protocol}`);
  if (url.username || url.password) throw new FetchBlockedError('URLs with a user name or password are not allowed');
  const host = bareHost(url.hostname);
  if (isIP(host)) {
    if (isBlockedAddress(host, allowLoopback)) throw new FetchBlockedError(`${host} is a private or local address`);
    return url;
  }
  const loopbackName = host === 'localhost' || host.endsWith('.localhost');
  if (isLocalName(host) && !(allowLoopback && loopbackName)) throw new FetchBlockedError(`${host} is a local host name`);
  return url;
}

function systemResolve(hostname: string): Promise<LookupAddress[]> {
  return new Promise((resolve, reject) => {
    dnsLookup(hostname, { all: true, verbatim: true }, (error, addresses) => (error ? reject(error) : resolve(addresses)));
  });
}

function guardedLookup(policy: FetchPolicy): LookupFunction {
  const resolve = policy.resolve ?? systemResolve;
  return (hostname, options, callback) => {
    resolve(hostname)
      .then((addresses) => {
        if (addresses.length === 0) throw new FetchFailedError(`${hostname} has no address`);
        const blocked = addresses.find((entry) => isBlockedAddress(entry.address, policy.allowLoopback));
        if (blocked) throw new FetchBlockedError(`${hostname} resolves to a private or local address (${blocked.address})`);
        const wanted = options.family === 4 || options.family === 6 ? addresses.filter((entry) => entry.family === options.family) : addresses;
        const usable = wanted.length > 0 ? wanted : addresses;
        if (options.all) callback(null, usable);
        else callback(null, usable[0]!.address, usable[0]!.family);
      })
      .catch((error: unknown) => callback(error instanceof Error ? (error as NodeJS.ErrnoException) : new Error(String(error)), '', 4));
  };
}

function requestLimitMs(policy: FetchPolicy): number {
  if (policy.deadline === undefined) return policy.timeoutMs;
  return Math.max(1, Math.min(policy.timeoutMs, policy.deadline - Date.now()));
}

function requestOnce(url: URL, policy: FetchPolicy): Promise<{ status: number; location: string | null; contentType: string; body: Buffer }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === 'https:' ? https : http;
    let settled = false;
    const finish = (error: Error | null, value?: { status: number; location: string | null; contentType: string; body: Buffer }) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error) reject(error);
      else resolve(value!);
    };
    const req = client.request(
      url,
      {
        method: 'GET',
        lookup: guardedLookup(policy),
        headers: { accept: 'text/html,text/css,*/*;q=0.5', 'accept-encoding': 'identity', 'user-agent': 'DesignStudio/0.1 (design system import)' },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        const location = typeof res.headers.location === 'string' ? res.headers.location : null;
        const contentType = String(res.headers['content-type'] ?? '');
        if (REDIRECTS.has(status)) {
          res.resume();
          finish(null, { status, location, contentType, body: Buffer.alloc(0) });
          return;
        }
        const encoding = String(res.headers['content-encoding'] ?? 'identity').toLowerCase();
        if (encoding !== 'identity' && encoding !== '') {
          res.destroy();
          finish(new FetchFailedError(`${url.host} sent a compressed body (${encoding})`));
          return;
        }
        const chunks: Buffer[] = [];
        let size = 0;
        res.on('data', (chunk: Buffer) => {
          size += chunk.length;
          if (size > policy.maxBytes) {
            res.destroy();
            finish(new FetchFailedError(`${url.href} is larger than ${Math.round(policy.maxBytes / 1024)} KB`));
            return;
          }
          chunks.push(chunk);
        });
        res.on('end', () => finish(null, { status, location, contentType, body: Buffer.concat(chunks) }));
        res.on('error', (error) => finish(error));
      },
    );
    const limitMs = requestLimitMs(policy);
    const timer = setTimeout(() => {
      req.destroy();
      finish(new FetchFailedError(`${url.href} did not answer within ${Math.max(1, Math.round(limitMs / 1000))} s`));
    }, limitMs);
    req.on('error', (error) => finish(error instanceof FetchBlockedError || error instanceof FetchFailedError ? error : new FetchFailedError(`${url.host}: ${error.message}`)));
    req.end();
  });
}

export async function safeFetch(raw: string, policy: FetchPolicy): Promise<FetchedResource> {
  let url = checkUrl(raw, policy.allowLoopback);
  for (let hop = 0; ; hop += 1) {
    if (policy.deadline !== undefined && Date.now() >= policy.deadline) throw new FetchFailedError(`${url.href}: the time limit for this site ran out`);
    const response = await requestOnce(url, policy);
    if (!REDIRECTS.has(response.status)) {
      if (response.status < 200 || response.status >= 300) throw new FetchFailedError(`${url.href} answered ${response.status}`);
      return { url: url.href, status: response.status, contentType: response.contentType, body: response.body };
    }
    if (hop >= policy.maxRedirects) throw new FetchFailedError(`${raw} redirected more than ${policy.maxRedirects} times`);
    if (!response.location) throw new FetchFailedError(`${url.href} redirected with no location`);
    url = checkUrl(new URL(response.location, url).href, policy.allowLoopback);
  }
}
