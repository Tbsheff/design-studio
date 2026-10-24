import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterEach, describe, expect, it } from 'vitest';
import { FetchBlockedError, FetchFailedError, checkUrl, isBlockedAddress, safeFetch } from './safe-fetch.js';
import type { FetchPolicy } from './safe-fetch.js';

const servers: http.Server[] = [];

async function serve(handler: http.RequestListener): Promise<string> {
  const server = http.createServer(handler);
  servers.push(server);
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  return `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
}

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => new Promise((resolve) => server.close(resolve))));
});

const policy = (extra: Partial<FetchPolicy> = {}): FetchPolicy => ({ allowLoopback: false, timeoutMs: 2000, maxBytes: 1024 * 1024, maxRedirects: 3, ...extra });

describe('address checks', () => {
  it('blocks private, loopback, link-local, metadata and mapped addresses', () => {
    for (const address of ['127.0.0.1', '127.8.9.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '100.64.0.1', '0.0.0.0', '224.0.0.1', '::1', '::', 'fe80::1', 'fd00::1', 'fc00::5', '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:7f00:1', '64:ff9b::a00:1']) {
      expect(isBlockedAddress(address, false), address).toBe(true);
    }
    for (const address of ['93.184.216.34', '8.8.8.8', '172.32.0.1', '2606:4700::1111']) expect(isBlockedAddress(address, false), address).toBe(false);
  });

  it('the loopback allow opens only loopback', () => {
    expect(isBlockedAddress('127.0.0.1', true)).toBe(false);
    expect(isBlockedAddress('::1', true)).toBe(false);
    expect(isBlockedAddress('10.0.0.1', true)).toBe(true);
    expect(isBlockedAddress('169.254.169.254', true)).toBe(true);
  });

  it('refuses bad schemes, credentials and local names before any request', () => {
    for (const url of ['file:///etc/passwd', 'ftp://example.com/', 'javascript:alert(1)', 'http://user:pw@example.com/', 'http://localhost:4170/', 'http://app.localhost/', 'http://printer.local/', 'http://intranet/', 'http://[::1]/', 'http://127.0.0.1/', 'http://10.0.0.8/', 'http://0x7f000001/', 'not a url']) {
      expect(() => checkUrl(url, false), url).toThrow(FetchBlockedError);
    }
    expect(checkUrl('https://example.com/a', false).href).toBe('https://example.com/a');
    expect(checkUrl('http://localhost:9/', true).hostname).toBe('localhost');
    expect(() => checkUrl('http://10.0.0.8/', true)).toThrow(FetchBlockedError);
  });
});

describe('safeFetch', () => {
  it('blocks a loopback server unless the test allow is on', async () => {
    const base = await serve((_req, res) => res.end('<html></html>'));
    await expect(safeFetch(`${base}/`, policy())).rejects.toThrow(FetchBlockedError);
    const fetched = await safeFetch(`${base}/`, policy({ allowLoopback: true }));
    expect(fetched.body.toString()).toBe('<html></html>');
  });

  it('checks every resolved address of a public-looking name', async () => {
    const resolve = async () => [
      { address: '93.184.216.34', family: 4 },
      { address: '10.0.0.7', family: 4 },
    ];
    await expect(safeFetch('http://rebind.example.com/', policy({ resolve }))).rejects.toThrow(/private or local address \(10\.0\.0\.7\)/);
  });

  it('pins the checked address: a name that resolves to loopback is refused at connect time', async () => {
    const base = await serve((_req, res) => res.end('secret'));
    const port = new URL(base).port;
    const resolve = async () => [{ address: '127.0.0.1', family: 4 }];
    await expect(safeFetch(`http://good.example.com:${port}/`, policy({ resolve }))).rejects.toThrow(FetchBlockedError);
  });

  it('re-checks every redirect hop and blocks a redirect to a private host', async () => {
    const base = await serve((req, res) => {
      if (req.url === '/to-private') res.writeHead(302, { location: 'http://10.0.0.1/admin' }).end();
      else if (req.url === '/to-metadata') res.writeHead(301, { location: 'http://169.254.169.254/latest/meta-data/' }).end();
      else if (req.url === '/to-file') res.writeHead(302, { location: 'file:///etc/passwd' }).end();
      else if (req.url === '/hop') res.writeHead(302, { location: '/ok' }).end();
      else res.end('ok');
    });
    const loopback = policy({ allowLoopback: true });
    await expect(safeFetch(`${base}/to-private`, loopback)).rejects.toThrow(FetchBlockedError);
    await expect(safeFetch(`${base}/to-metadata`, loopback)).rejects.toThrow(FetchBlockedError);
    await expect(safeFetch(`${base}/to-file`, loopback)).rejects.toThrow(FetchBlockedError);
    expect((await safeFetch(`${base}/hop`, loopback)).url).toBe(`${base}/ok`);
  });

  it('stops after 3 redirects', async () => {
    const base = await serve((req, res) => {
      const n = Number(req.url?.slice(1) ?? 0);
      res.writeHead(302, { location: `/${n + 1}` }).end();
    });
    await expect(safeFetch(`${base}/0`, policy({ allowLoopback: true }))).rejects.toThrow(/more than 3 times/);
  });

  it('caps the body size even without content-length', async () => {
    const base = await serve((_req, res) => {
      res.write(Buffer.alloc(600 * 1024, 97));
      res.end(Buffer.alloc(600 * 1024, 97));
    });
    await expect(safeFetch(`${base}/`, policy({ allowLoopback: true, maxBytes: 1024 * 1024 }))).rejects.toThrow(FetchFailedError);
  });

  it('times out a server that never answers', async () => {
    const base = await serve(() => undefined);
    await expect(safeFetch(`${base}/`, policy({ allowLoopback: true, timeoutMs: 200 }))).rejects.toThrow(/did not answer/);
  });

  it('a site deadline cuts the request timer and stops before a new hop', async () => {
    const base = await serve(() => undefined);
    const started = Date.now();
    await expect(safeFetch(`${base}/`, policy({ allowLoopback: true, timeoutMs: 10_000, deadline: Date.now() + 150 }))).rejects.toThrow(/did not answer/);
    expect(Date.now() - started).toBeLessThan(2000);
    await expect(safeFetch(`${base}/`, policy({ allowLoopback: true, deadline: Date.now() - 1 }))).rejects.toThrow(/time limit/);
  });

  it('refuses a compressed body and non-2xx answers', async () => {
    const base = await serve((req, res) => {
      if (req.url === '/gz') res.writeHead(200, { 'content-encoding': 'gzip' }).end('x');
      else res.writeHead(404).end('no');
    });
    await expect(safeFetch(`${base}/gz`, policy({ allowLoopback: true }))).rejects.toThrow(/compressed/);
    await expect(safeFetch(`${base}/missing`, policy({ allowLoopback: true }))).rejects.toThrow(/answered 404/);
  });
});
