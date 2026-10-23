import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { projectPreviewHost, projectPreviewOrigin } from '../../shared/contracts.js';
import { startHtmlServer, type HtmlServer } from './html-server.js';

let root: string;
let server: HtmlServer;
let port: number;

function freePort(): Promise<number> {
  return new Promise((resolve) => {
    const probe = net.createServer();
    probe.listen(0, '127.0.0.1', () => {
      const address = probe.address() as net.AddressInfo;
      probe.close(() => resolve(address.port));
    });
  });
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'studio-html-origin-'));
  for (const pid of ['ProjA_1-x', 'projb22']) {
    await mkdir(path.join(root, pid), { recursive: true });
    await writeFile(path.join(root, pid, 'index.html'), `<h1>${pid}</h1>`);
  }
  await mkdir(path.join(root, 'projb22', 'design-system'), { recursive: true });
  await writeFile(path.join(root, 'projb22', 'design-system', 'tokens.json'), '{}');
  await writeFile(path.join(root, 'projb22', 'design-system', 'pack.json'), '{}');
  await writeFile(path.join(root, 'projb22', 'linked.html'), '<html><head><link rel="stylesheet" href="design-system/tokens.css"></head><body></body></html>');
  port = await freePort();
  server = await startHtmlServer({
    port,
    studioOrigin: 'http://127.0.0.1:4170',
    bridgeScript: async () => '',
    resolveRoot: async (_kind, projectId) => (['ProjA_1-x', 'projb22'].includes(projectId) ? path.join(root, projectId) : null),
  });
});

afterAll(async () => {
  await server.close();
  await rm(root, { recursive: true, force: true });
});

describe('html preview origins', () => {
  it('gives each project its own lowercase *.localhost host', () => {
    expect(projectPreviewHost('ProjA_1-x')).toMatch(/^p-[0-9a-f]+\.localhost$/);
    expect(projectPreviewHost('ProjA_1-x')).not.toBe(projectPreviewHost('proja_1-x'));
  });

  it('serves a project only on its own origin', async () => {
    const own = await fetch(`${projectPreviewOrigin('ProjA_1-x', port)}/d/ProjA_1-x/main/index.html`);
    expect(own.status).toBe(200);
    expect(await own.text()).toContain('ProjA_1-x');
    expect(own.headers.get('access-control-allow-origin')).toBeNull();
    expect(own.headers.get('cross-origin-resource-policy')).toBe('same-origin');
  });

  it('refuses another project path on a project origin, and project paths on the bare host', async () => {
    const cross = await fetch(`${projectPreviewOrigin('ProjA_1-x', port)}/d/projb22/main/index.html`);
    expect(cross.status).toBe(403);
    const crossSnapshot = await fetch(`${projectPreviewOrigin('ProjA_1-x', port)}/s/projb22/abc/index.html`);
    expect(crossSnapshot.status).toBe(403);
    const bare = await fetch(`http://127.0.0.1:${port}/d/projb22/main/index.html`);
    expect(bare.status).toBe(403);
  });

  it('injects the tokens.css link into served html of a project with tokens.json', async () => {
    const served = await (await fetch(`${projectPreviewOrigin('projb22', port)}/d/projb22/main/index.html`)).text();
    expect(served).toContain('<link rel="stylesheet" href="design-system/tokens.css">');
    const linked = await (await fetch(`${projectPreviewOrigin('projb22', port)}/d/projb22/main/linked.html`)).text();
    expect(linked.match(/tokens\.css/g)).toHaveLength(1);
    const plain = await (await fetch(`${projectPreviewOrigin('ProjA_1-x', port)}/d/ProjA_1-x/main/index.html`)).text();
    expect(plain).not.toContain('tokens.css');
  });
});
