import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { plainAttachmentName } from '../../shared/reference.js';
import type { AgentRunContext, PreviewService } from '../types.js';
import { COMPARE_TO_REFERENCE_TEXT, scoreOutput } from '../mcp/reference-tools.js';
import { compareToReference, referenceAttachment } from './reference-check.js';
import { resolveShotTarget, type TargetDeps } from './run-target.js';

type ToolResult = { content: ({ type: 'text'; text: string } | { type: 'image'; data: string; mimeType: string })[]; isError?: boolean };

export const compareReferenceShape = {
  attachment: z.string().trim().min(1).max(300).optional().describe('Name of an attached image to compare with. Leave out for the image the user marked as the reference.'),
  frame: z.string().trim().min(1).max(80).optional().describe('Frame id or @label from canvas_list. Leave out for the frame of this run.'),
  path: z.string().trim().max(500).optional().describe('Page path instead of the frame page.'),
};

export const COMPARE_REFERENCE_DESCRIPTION = `${COMPARE_TO_REFERENCE_TEXT.replace('Compare a canvas frame with a reference picture', 'Compare a canvas frame with the reference picture the user attached')} Returns the diff sheet as an image too. Use it after you rebuild a screenshot or mock, and again after each fix.`;

export interface ReferenceToolDeps {
  preview: PreviewService;
  ctx: AgentRunContext;
  runsDir: string;
  runId: string;
  targets: TargetDeps | null;
}

function failed(message: string): ToolResult {
  return { content: [{ type: 'text', text: `compare_to_reference: ${message}` }], isError: true };
}

function pickAttachment(ctx: AgentRunContext, name: string | undefined) {
  if (!name) return referenceAttachment(ctx.attachments) ?? ctx.attachments.find((item) => item.mime.startsWith('image/')) ?? null;
  return ctx.attachments.find((item) => item.name === name || plainAttachmentName(item.name) === name) ?? null;
}

let calls = 0;

export async function runCompareToReference(deps: ReferenceToolDeps, args: { attachment?: string | undefined; frame?: string | undefined; path?: string | undefined }): Promise<ToolResult> {
  const parsed = z.object(compareReferenceShape).strict().safeParse(args);
  if (!parsed.success) return failed(parsed.error.issues.map((issue) => `${issue.path.join('.') || 'input'}: ${issue.message}`).join('; '));
  const attachment = pickAttachment(deps.ctx, parsed.data.attachment);
  if (!attachment) return failed(parsed.data.attachment ? `no attached image named ${parsed.data.attachment}.` : 'this run has no attached image.');
  try {
    const shot = await resolveShotTarget(deps.targets, deps.ctx, { ...(parsed.data.frame ? { frame: parsed.data.frame } : {}), ...(parsed.data.path !== undefined ? { path: parsed.data.path } : {}) });
    if (!shot) return failed('the preview is not running for this direction.');
    calls += 1;
    const score = await compareToReference({ preview: deps.preview, url: shot.url, file: attachment.path, mime: attachment.mime, ...(shot.size ? { frameWidth: shot.size.width } : {}), outDir: deps.runsDir, stem: `${deps.runId}-compare-${calls}` });
    const sheet = (await readFile(score.diffPath)).toString('base64');
    return { content: [{ type: 'image', data: sheet, mimeType: 'image/png' }, { type: 'text', text: JSON.stringify({ reference: plainAttachmentName(attachment.name), frame: shot.label, ...scoreOutput(score) }, null, 2) }] };
  } catch (error) {
    return failed(error instanceof Error ? error.message : String(error));
  }
}
