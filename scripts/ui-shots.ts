import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, realpathSync, rmSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, type ElectronApplication, type Page } from '@playwright/test';
import { desktopEnv, launchDesktop } from '../e2e/support/desktop-app';

const out = path.resolve(process.argv[2] ?? 'design-review/shots');
mkdirSync(out, { recursive: true });

async function auditDrag(page: Page, name: string): Promise<void> {
  const swallowed = await page.evaluate<string[]>(`(() => {
    const region = (el) => {
      const style = getComputedStyle(el);
      return style.appRegion || style.webkitAppRegion || 'none';
    };
    const effective = (el) => {
      for (let node = el; node; node = node.parentElement) {
        const value = region(node);
        if (value === 'drag' || value === 'no-drag') return value;
      }
      return 'none';
    };
    const targets = document.querySelectorAll('button, a, input, select, textarea, [role="tab"], [role="button"], [tabindex]');
    const bands = [...document.querySelectorAll('*')].filter((el) => region(el) === 'drag').length;
    return ['bands=' + bands, ...[...targets].filter((el) => el.offsetParent !== null && effective(el) === 'drag').map((el) => el.outerHTML.slice(0, 80))];
  })()`);
  console.log(`${name}: ${swallowed.shift()} ${swallowed.length} controls inside a drag region${swallowed.length ? `\n  ${swallowed.join('\n  ')}` : ''}`);
}

async function shoot(app: ElectronApplication, page: Page, name: string): Promise<void> {
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(out, `${name}.png`) });
  await auditDrag(page, name);
  const sourceId = await app.evaluate(({ BrowserWindow }) => {
    const win = BrowserWindow.getAllWindows().find((candidate) => candidate.isVisible())!;
    return win.getMediaSourceId();
  });
  const windowId = sourceId.split(':')[1];
  try {
    execFileSync('screencapture', ['-x', '-o', `-l${windowId}`, path.join(out, `${name}-native.png`)]);
  } catch (noScreenRecordingPermission) {
    console.warn(`native capture skipped: ${String(noScreenRecordingPermission)}`);
  }
}

async function main(): Promise<void> {
  const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio shots ')));
  const started = Date.now();
  const app = await launchDesktop(desktopEnv(work));
  const page = await app.firstWindow({ timeout: 120_000 });
  console.log(`first window after ${Date.now() - started}ms`);
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible({ timeout: 60_000 });
  console.log(`home visible after ${Date.now() - started}ms`);
  await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0]!.setBounds({ x: 80, y: 60, width: 1440, height: 900 }));
  await shoot(app, page, '01-home-empty');

  await page.getByLabel('Describe the design').fill('Harbor coffee landing page');
  await page.getByRole('radio', { name: 'HTML' }).click();
  await page.getByRole('button', { name: 'Create', exact: true }).click();
  await expect(page.locator('.topbar')).toBeVisible();
  await expect(page.frameLocator('iframe.frame.front').locator('h1')).toBeVisible({ timeout: 60_000 });
  await page.waitForTimeout(2500);
  await shoot(app, page, '02-canvas-chat');

  const select = page.getByRole('button', { name: /^Select/ });
  await select.click();
  await page.frameLocator('iframe.frame.front').locator('h1').first().click();
  await expect(page.locator('.overlay .box.selected')).toHaveCount(1);
  await shoot(app, page, '03-inspector');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await shoot(app, page, '04-settings');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'New project' })).toBeVisible();
  await shoot(app, page, '05-home-projects');
  await app.close();
  rmSync(work, { recursive: true, force: true });

  const setupWork = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'studio shots setup ')));
  const setupApp = await launchDesktop(desktopEnv(setupWork, { STUDIO_DESKTOP_SETUP: 'always' }));
  const setup = await setupApp.firstWindow({ timeout: 120_000 });
  await setup.waitForLoadState('domcontentloaded');
  await setup.waitForTimeout(2500);
  await shoot(setupApp, setup, '06-setup');
  await setupApp.close();
  rmSync(setupWork, { recursive: true, force: true });
}

main().then(
  () => process.exit(0),
  (error: unknown) => {
    console.error(error);
    process.exit(1);
  },
);
