import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import type { RenderCheckResult } from '../../../src/shared/contracts';
import { createProjectViaUi, frontFrame, mainDirection, openHome } from '../../support/studio';
import { saveResult } from './helpers';

const BROKEN_PAGE = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Broken</title>
<style>body{margin:0;font-family:system-ui} .wide{width:1200px;height:40px;background:#c33}</style></head>
<body>
<h1>Broken page</h1>
<div class="wide">too wide for mobile</div>
<script>window.addEventListener('load', () => { undefinedFunctionCall(); });</script>
</body>
</html>
`;

test('AC-42: render check reports JS error and overflow at desktop and mobile', async ({ page }) => {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, 'Render check target', 'html');
  await api.waitForRuns(project.id, 1);
  await expect(frontFrame(page).locator('h1')).toHaveText('Render check target');
  writeFileSync(path.join(mainDirection(project).workTree, 'index.html'), BROKEN_PAGE);
  await expect(frontFrame(page).locator('h1')).toHaveText('Broken page');

  const results = await api.call<RenderCheckResult[]>('POST', `/api/projects/${project.id}/d/main/check`);
  const desktop = results.find((r) => r.viewport === 'desktop');
  const mobile = results.find((r) => r.viewport === 'mobile');
  expect(desktop).toBeTruthy();
  expect(mobile).toBeTruthy();
  for (const r of [desktop!, mobile!]) {
    expect(r.ok).toBe(false);
    expect(r.pageErrors.join('\n')).toContain('undefinedFunctionCall');
  }
  expect(mobile!.horizontalOverflow).toBe(true);

  await page.getByRole('button', { name: 'Check render' }).click();
  const panel = page.getByRole('region', { name: 'Render check results' });
  await expect(panel.locator('.badge.fail')).toHaveCount(2, { timeout: 60_000 });
  await expect(panel.getByText('Horizontal overflow').first()).toBeVisible();
  await expect(panel.locator('.check-errors li').first()).toContainText('undefinedFunctionCall');
  const uiText = await panel.innerText();
  saveResult('ac42', {
    api: results.map((r) => ({ viewport: r.viewport, size: `${r.width}x${r.height}`, ok: r.ok, pageErrors: r.pageErrors.map((e) => e.split('\n')[0]), consoleErrors: r.consoleErrors, horizontalOverflow: r.horizontalOverflow, screenshotPath: r.screenshotPath })),
    uiText,
  });
});
