import { z } from 'zod';
import { describeDoctor, DOCTOR_NOTE, type AppFixResult } from '../../shared/app-doctor.js';
import type { DoctorView } from '../http/doctor-routes.js';
import { loadTarget, studioCall } from './edit-deps.js';
import { defineTool, projectId } from './edit-kit.js';

const KINDS = ['env-validation', 'missing-env-file', 'port-in-use', 'install', 'auth-redirect'] as const;

function statusLine(view: DoctorView): string {
  const status = view.status;
  return `Dev server: ${status.state}${status.upstream ? ` at ${status.upstream}` : ''}${status.message ? ` (${status.message})` : ''}.`;
}

const appDoctor = defineTool(
  'app_doctor',
  z.object({ projectId, fresh: z.boolean().optional().describe('Request the app root again before the check. Default false: use the last request.') }).strict(),
  {
    title: 'App doctor',
    description: `Read only. For an attached app: name the cause when the dev server fails or a frame shows an error overlay, with the same server code as the doctor card in the studio: env-validation (and the env key that skips it, such as SKIP_ENV_VALIDATION=true), missing-env-file, port-in-use, install (with the command) and auth-redirect. Each problem has a kind; pass it to apply_app_fix when it has a fix. ${DOCTOR_NOTE}`,
    readOnly: true,
    idempotent: true,
  },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const view = await studioCall<DoctorView>(deps, 'GET', `/api/projects/${encodeURIComponent(project.id)}/app/doctor${input.fresh ? '?fresh=1' : ''}`);
    return { result: { content: [{ type: 'text', text: `${statusLine(view)}\n\n${describeDoctor(view.doctor)}` }] } };
  },
);

const applyAppFix = defineTool(
  'apply_app_fix',
  z.object({ projectId, kind: z.enum(KINDS).describe('Problem kind from app_doctor.') }).strict(),
  {
    title: 'Apply app fix',
    description: `Apply the one-click fix of one app_doctor problem, with the same server code as the fix button on the studio doctor card, then restart the dev server. The studio runs the doctor again and applies only the fix it computed: set env keys found in the app env schema or .env.example (example values only), copy .env.example to .env.local, use a running dev server URL, or restart. You cannot pass env values; ask the user for secrets. Wait for the restart, then call app_doctor again. ${DOCTOR_NOTE}`,
  },
  async (deps, input) => {
    const { project } = await loadTarget(deps, input.projectId);
    const done = await studioCall<AppFixResult>(deps, 'POST', `/api/projects/${encodeURIComponent(project.id)}/app/doctor/fix`, { kind: input.kind });
    return {
      result: { content: [{ type: 'text', text: done.applied }] },
      activity: { projectId: project.id, directionId: null, summary: `Applied the ${done.kind} app fix` },
    };
  },
);

export const DOCTOR_TOOLS = [appDoctor, applyAppFix];
