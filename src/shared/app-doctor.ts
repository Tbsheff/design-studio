export type DoctorCauseKind = 'env-validation' | 'missing-env-file' | 'port-in-use' | 'install' | 'auth-redirect';

export type DoctorFix =
  | { kind: 'set-env'; label: string; env: Record<string, string> }
  | { kind: 'copy-env-example'; label: string; from: string; to: string }
  | { kind: 'use-url'; label: string; url: string }
  | { kind: 'restart'; label: string };

export interface DoctorCause {
  kind: DoctorCauseKind;
  severity: 'error' | 'info';
  title: string;
  detail: string;
  evidence: string[];
  fix: DoctorFix | null;
  command: string | null;
}

export interface AppDoctorResult {
  checkedAt: number;
  causes: DoctorCause[];
}

export interface AppFixResult {
  applied: string;
  kind: DoctorCauseKind;
}

export const DOCTOR_NOTE = 'The doctor reads the dev server log of the current start and one request to the app root. Fixes only set env keys the studio found in the app env schema or .env.example (with the example values), copy .env.example, switch to a running dev server or restart; they never write secret values.';

export function describeDoctor(result: AppDoctorResult | null | undefined): string {
  if (!result || result.causes.length === 0) return 'The doctor found no problem in the dev server log or the app root response.';
  return result.causes
    .map((cause) => {
      const lines = [`${cause.severity === 'error' ? 'Problem' : 'Note'} (${cause.kind}): ${cause.title}`, cause.detail];
      if (cause.fix) lines.push(`Fix "${cause.kind}": ${cause.fix.label}`);
      if (cause.command) lines.push(`Run: ${cause.command}`);
      if (cause.evidence.length > 0) lines.push(`Log: ${cause.evidence.join(' | ')}`);
      return lines.join('\n');
    })
    .join('\n\n');
}
