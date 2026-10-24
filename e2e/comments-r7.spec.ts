import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, test, type Locator, type Page } from '@playwright/test';
import type { Attachment, DesignComment, Project } from '../src/shared/contracts';
import { readState } from './support/server';
import { createProjectViaUi, frontFrame, mainDirection, openHome, type StudioApi } from './support/studio';

function base(project: Project): string {
  return `/api/projects/${project.id}/d/${mainDirection(project).id}/comments`;
}

function comments(api: StudioApi, project: Project): Promise<DesignComment[]> {
  return api.call('GET', base(project));
}

function pin(page: Page, n: number): Locator {
  return page.locator('[data-testid="comment-pin"]', { hasText: new RegExp(`^${n}$`) });
}

async function newProject(page: Page, name: string): Promise<{ api: StudioApi; project: Project }> {
  const api = await openHome(page);
  const project = await createProjectViaUi(page, api, name, 'html');
  await expect(frontFrame(page).locator('h1')).toHaveText(name);
  await api.waitForRuns(project.id, 1);
  return { api, project };
}

async function stroke(page: Page, from: { x: number; y: number }, to: { x: number; y: number }): Promise<void> {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.mouse.move(to.x, to.y, { steps: 24 });
  await page.mouse.up();
}

async function pixelAt(page: Page, file: string, x: number, y: number): Promise<{ width: number; height: number; rgba: number[]; around: number }> {
  const data = readFileSync(file).toString('base64');
  return page.evaluate(
    async ({ data, x, y }) => {
      const bytes = Uint8Array.from(atob(data), (char) => char.charCodeAt(0));
      const bitmap = await createImageBitmap(new Blob([bytes], { type: 'image/png' }));
      const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
      const ctx = canvas.getContext('2d') as OffscreenCanvasRenderingContext2D;
      ctx.drawImage(bitmap, 0, 0);
      const rgba = Array.from(ctx.getImageData(x, y, 1, 1).data);
      const corner = ctx.getImageData(0, 0, 20, 20).data;
      let around = 0;
      for (let i = 3; i < corner.length; i += 4) around += corner[i] as number;
      return { width: bitmap.width, height: bitmap.height, rgba, around };
    },
    { data, x, y },
  );
}

function expectDrawingComment(comment: DesignComment): void {
  expect(comment.status).toBe('queued');
  expect(comment.attachmentIds).toHaveLength(1);
  expect(comment.drawing?.strokes).toHaveLength(1);
  expect(comment.target.selector).toBe('body');
  const drawn = comment.drawing?.box;
  expect(drawn && drawn.x <= 200 && drawn.x + drawn.width >= 590).toBe(true);

}

async function expectSentImage(page: Page, api: StudioApi, project: Project, comment: DesignComment, y: number): Promise<void> {
  const runId = (await comments(api, project))[0]?.runId as string;
  const log = await api.call<{ sent: { imageCount: number; text: string }[]; summary: { request: { attachmentIds?: string[] } } }>('GET', `/api/runs/${runId}`);
  expect(log.sent.length).toBeGreaterThan(0);
  expect(log.sent[0]?.imageCount).toBe(1);
  expect(log.sent[0]?.text).toContain('<drawing>');
  expect(log.summary.request.attachmentIds).toEqual(comment.attachmentIds);

  const attachmentId = comment.attachmentIds?.[0] as string;
  const meta = JSON.parse(readFileSync(path.join(readState().dataDir, 'projects', project.id, 'attachments', `${attachmentId}.json`), 'utf8')) as Attachment;
  expect(meta.mime).toBe('image/png');
  const pixel = await pixelAt(page, meta.path, 400, y);
  expect([pixel.width, pixel.height]).toEqual([comment.drawing?.frame.width, comment.drawing?.frame.height]);
  expect(pixel.rgba[3]).toBeGreaterThan(200);
  expect(pixel.rgba[0]).toBeGreaterThan(200);
  expect(pixel.rgba[1]).toBeLessThan(120);
  expect(pixel.around).toBe(0);
}

test('Draw: a stroke plus a comment sends one image attachment that shows the stroke', async ({ page }) => {
  const { api, project } = await newProject(page, 'Harbor Draw');
  const drawButton = page.getByRole('button', { name: 'Draw', exact: true });
  await expect(drawButton).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('p');
  await expect(drawButton).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('draw-bar')).toBeVisible();
  const surface = page.getByTestId('draw-canvas');
  const box = await surface.boundingBox();
  if (!box) throw new Error('no drawing surface');
  const frameWidth = Number(await surface.evaluate((el) => (el as HTMLCanvasElement).style.width.replace('px', '')));
  const scale = box.width / frameWidth;

  await stroke(page, { x: box.x + 100 * scale, y: box.y + 500 * scale }, { x: box.x + 400 * scale, y: box.y + 700 * scale });
  await expect(page.getByTestId('draw-compose')).toBeVisible();
  await expect(page.getByTestId('draw-bar')).toContainText('1 stroke');
  await page.getByTestId('draw-compose').getByRole('textbox').blur();
  await page.keyboard.press('ControlOrMeta+z');
  await expect(page.getByTestId('draw-compose')).toHaveCount(0);
  await expect(page.getByTestId('draw-bar')).toContainText('Draw on the design');

  const y = 240;
  await stroke(page, { x: box.x + 200 * scale, y: box.y + y * scale }, { x: box.x + 600 * scale, y: box.y + y * scale });
  const compose = page.getByTestId('draw-compose');
  await expect(compose).toBeVisible();
  const input = compose.getByRole('textbox', { name: 'Comment on drawing' });
  await expect(input).toBeFocused();
  await input.fill('Make this heading shorter');
  await input.press('Enter');
  await expect(compose).toHaveCount(0);
  await expect(drawButton).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('draw-bar')).toHaveCount(0);

  await expect.poll(async () => (await comments(api, project)).length).toBe(1);
  const [comment] = await comments(api, project);
  expectDrawingComment(comment as DesignComment);

  await expect(pin(page, 1)).toBeVisible();
  await expect(pin(page, 1).locator('.pin-pen')).toHaveCount(1);
  await pin(page, 1).click();
  await expect(page.getByTestId('comment-open')).toBeVisible();
  await expect(page.getByTestId('comment-drawing')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('comment-drawing')).toHaveCount(0);

  await page.getByRole('tab', { name: 'Comments' }).click();
  await expect(page.getByTestId('comment-row')).toContainText('Drawing ·');
  await page.getByRole('button', { name: 'Send 1 queued' }).click();
  await expect.poll(async () => (await comments(api, project))[0]?.status, { timeout: 30_000 }).toBe('resolved');
  await expectSentImage(page, api, project, comment as DesignComment, y);
});

test('Draw: P and C switch tools, Esc leaves the pen', async ({ page }) => {
  await newProject(page, 'Harbor Pen Keys');
  const draw = page.getByRole('button', { name: 'Draw', exact: true });
  const comment = page.getByRole('button', { name: 'Comment', exact: true });
  await page.keyboard.press('c');
  await expect(comment).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('p');
  await expect(draw).toHaveAttribute('aria-pressed', 'true');
  await expect(comment).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('c');
  await expect(draw).toHaveAttribute('aria-pressed', 'false');
  await expect(comment).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('p');
  await page.keyboard.press('Escape');
  await expect(draw).toHaveAttribute('aria-pressed', 'false');
  await expect(page.getByTestId('draw-canvas')).toHaveCount(0);
});

test('Comments: replies under a comment, Resolve and Reopen, and the Show resolved filter', async ({ page }) => {
  const { api, project } = await newProject(page, 'Harbor Replies');
  await page.keyboard.press('c');
  await frontFrame(page).locator('h1').click();
  await page.getByTestId('comment-compose').getByRole('textbox').fill('Warmer title');
  await page.getByTestId('comment-compose').getByRole('textbox').press('Enter');
  await frontFrame(page).locator('.lede').click();
  await page.getByTestId('comment-compose').getByRole('textbox').fill('Shorter lede');
  await page.getByTestId('comment-compose').getByRole('textbox').press('Enter');
  await page.keyboard.press('Escape');
  await expect(page.getByTestId('comment-pin')).toHaveCount(2);

  await pin(page, 1).click();
  const opened = page.getByTestId('comment-open');
  const reply = opened.getByRole('textbox', { name: 'Reply to comment 1' });
  await reply.fill('Use the brand orange');
  await reply.press('Enter');
  await expect(opened.getByTestId('comment-reply')).toHaveText(['Use the brand orange']);
  await expect(reply).toHaveValue('');
  await reply.fill('Keep it one line');
  await reply.press('Enter');
  await expect(opened.getByTestId('comment-reply')).toHaveCount(2);
  await page.keyboard.press('Escape');

  await page.getByRole('tab', { name: 'Comments' }).click();
  const panel = page.getByTestId('comments-panel');
  const first = panel.getByTestId('comment-row').filter({ hasText: 'Warmer title' });
  await expect(first.getByTestId('comment-reply')).toHaveText(['Use the brand orange', 'Keep it one line']);
  await page.reload();
  await page.getByRole('tab', { name: 'Comments' }).click();
  await expect(first.getByTestId('comment-reply')).toHaveText(['Use the brand orange', 'Keep it one line']);
  await first.getByRole('button', { name: 'Delete reply 2 to comment 1' }).click();
  await expect(first.getByTestId('comment-reply')).toHaveText(['Use the brand orange']);

  await panel.getByRole('button', { name: 'Resolve comment 2' }).click();
  await expect.poll(async () => (await comments(api, project)).map((c) => c.status)).toEqual(['queued', 'resolved']);
  const toggle = panel.getByRole('checkbox', { name: 'Show resolved' });
  await expect(toggle).not.toBeChecked();
  await expect(panel.getByTestId('resolved-hidden')).toHaveText('1 hidden');
  await expect(panel.locator('[data-status="resolved"]')).toHaveCount(0);
  await expect(page.getByTestId('comment-pin')).toHaveCount(1);

  await toggle.check();
  await expect(panel.locator('[data-status="resolved"]')).toHaveCount(1);
  await expect(page.locator('.comment-pin.resolved')).toHaveCount(1);
  await page.reload();
  await page.getByRole('tab', { name: 'Comments' }).click();
  await expect(panel.getByRole('checkbox', { name: 'Show resolved' })).toBeChecked();
  await expect(panel.locator('[data-status="resolved"]')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Reopen comment 2' }).click();
  await expect.poll(async () => (await comments(api, project)).map((c) => c.status)).toEqual(['queued', 'queued']);
  await panel.getByRole('button', { name: 'Resolve comment 2' }).click();
  await panel.getByRole('checkbox', { name: 'Show resolved' }).uncheck();
  await expect(panel.locator('[data-status="resolved"]')).toHaveCount(0);
  await expect(page.locator('.comment-pin.resolved')).toHaveCount(0);

  await panel.getByRole('button', { name: 'Send 1 queued' }).click();
  await expect.poll(async () => (await comments(api, project))[0]?.status, { timeout: 30_000 }).toBe('resolved');
  const runs = await api.runs(project.id);
  const run = runs.find((candidate) => candidate.request.comments?.length === 1);
  expect(run?.request.comments?.[0]?.text).toBe('Warmer title\nReplies:\n- Use the brand orange');
});
