import { describeDoctor, DOCTOR_NOTE } from '../../shared/app-doctor.js';
import type { AgentRunContext, PreviewService } from '../types.js';

type ToolText = { content: { type: 'text'; text: string }[]; isError?: boolean };

export const APP_DOCTOR_DESCRIPTION = `Attached apps only. Read only. Name the cause when the app dev server fails or a frame shows an error overlay, with the same server code as the doctor card in the studio and the MCP app_doctor tool: env validation (with the env key that skips it), missing .env, port in use, missing install, sign-in redirect. fresh: true requests the app root again first. You cannot apply the fix; tell the user to press the fix button on the doctor card. ${DOCTOR_NOTE}`;

export async function runAppDoctor(deps: { preview: PreviewService; ctx: AgentRunContext }, fresh: boolean): Promise<ToolText> {
  const project = deps.ctx.project;
  const doctor = deps.preview.apps?.doctor;
  if (!project.app || !doctor) return { content: [{ type: 'text', text: 'app_doctor works only in an attached app project.' }], isError: true };
  try {
    const result = await doctor(project, fresh);
    const status = deps.preview.apps?.status(project);
    const head = status ? `Dev server: ${status.state}${status.upstream ? ` at ${status.upstream}` : ''}${status.message ? ` (${status.message})` : ''}.` : '';
    return { content: [{ type: 'text', text: [head, describeDoctor(result)].filter(Boolean).join('\n\n') }] };
  } catch (error) {
    return { content: [{ type: 'text', text: `app_doctor failed: ${error instanceof Error ? error.message : String(error)}` }], isError: true };
  }
}
