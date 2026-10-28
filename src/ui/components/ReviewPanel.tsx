import { REVIEW_KIND_LABEL, REVIEW_KINDS, type ReviewFinding, type ReviewKind, type ReviewSeverity } from '../../shared/review';
import type { ReviewState } from '../useReview';
import { Icon } from './Icon';

interface Props {
  review: ReviewState;
  frameLabel: string;
  live: boolean;
  running: boolean;
  canAsk: boolean;
  onSelect: (finding: ReviewFinding) => void;
  onAsk: (finding: ReviewFinding) => void;
  onClose: () => void;
}

interface Actions {
  fixBlocked: string | null;
  fixing: string[] | null;
  canAsk: boolean;
  onSelect: (finding: ReviewFinding) => void;
  onAsk: (finding: ReviewFinding) => void;
  onFix: (findings: ReviewFinding[]) => void;
}

const SEVERITY_WORD: Record<ReviewSeverity, string> = { high: 'High', medium: 'Medium', low: 'Low' };

function fixBlocked(live: boolean, running: boolean): string | null {
  if (!live) return 'Fixes work on the live design';
  return running ? 'A run is editing this design' : null;
}

function grouped(findings: ReviewFinding[]): [ReviewKind, ReviewFinding[]][] {
  return REVIEW_KINDS.map((kind) => [kind, findings.filter((finding) => finding.kind === kind)] as [ReviewKind, ReviewFinding[]]).filter(([, list]) => list.length > 0);
}

function FindingRow({ finding, a }: { finding: ReviewFinding; a: Actions }) {
  const busy = a.fixing?.includes(finding.id) ?? false;
  return (
    <li className="review-row">
      <button type="button" className="review-target" disabled={!finding.selector} data-tip={finding.selector ? 'Select on the canvas' : undefined} onClick={() => a.onSelect(finding)}>
        <span className={`review-sev ${finding.severity}`} aria-label={SEVERITY_WORD[finding.severity]} />
        <span className="truncate">{finding.element}</span>
        {finding.copies && finding.copies > 1 && <span className="review-copies">{finding.copies} copies</span>}
        {finding.shared && <span className="review-copies">shared</span>}
      </button>
      <p className="review-msg">{finding.message}</p>
      <div className="review-actions">
        {finding.source && <code className="review-src truncate">{finding.source}</code>}
        {finding.fix ? (
          <button type="button" className="btn small" disabled={a.fixBlocked !== null || a.fixing !== null} data-tip={a.fixBlocked ?? (finding.shared ? `Changes the shared file ${finding.shared}, so other pages change too. One version you can undo` : 'Apply this fix as one version you can undo')} data-tip-align="end" onClick={() => a.onFix([finding])}>
            {busy ? <span className="spinner" /> : <Icon name="check" size={12} />}
            <span>{finding.fix.label}</span>
          </button>
        ) : (
          <button type="button" className="btn small" disabled={!a.canAsk} data-tip={a.canAsk ? 'Put this finding in the chat box. You send it.' : 'Chat is not available here'} data-tip-align="end" onClick={() => a.onAsk(finding)}>
            <Icon name="chat" size={12} />
            Ask agent
          </button>
        )}
      </div>
    </li>
  );
}

function Group({ kind, list, a }: { kind: ReviewKind; list: ReviewFinding[]; a: Actions }) {
  const fixable = list.filter((finding) => finding.fix);
  return (
    <section className="review-group" aria-label={REVIEW_KIND_LABEL[kind]}>
      <div className="review-group-head">
        <span className="review-group-name">{REVIEW_KIND_LABEL[kind]}</span>
        <span className="review-count num">{list.length}</span>
        <div className="spacer" />
        {fixable.length > 1 && (
          <button type="button" className="btn small" disabled={a.fixBlocked !== null || a.fixing !== null} data-tip={a.fixBlocked ?? `Apply ${fixable.length} fixes as one version`} data-tip-align="end" onClick={() => a.onFix(fixable)}>
            Fix all {fixable.length}
          </button>
        )}
      </div>
      <ul className="review-list">
        {list.map((finding) => (
          <FindingRow key={finding.id} finding={finding} a={a} />
        ))}
      </ul>
    </section>
  );
}

function Summary({ review }: { review: ReviewState }) {
  const result = review.result;
  if (!result) return null;
  const parts = (['high', 'medium', 'low'] as const).filter((sev) => result.counts[sev] > 0).map((sev) => `${result.counts[sev]} ${sev}`);
  return (
    <div className="review-summary">
      <span>{parts.length > 0 ? parts.join(' · ') : 'No findings'}</span>
      {review.stale && <span className="badge warn">Out of date</span>}
      {result.notes.map((note) => (
        <span key={note} className="muted">
          {note}
        </span>
      ))}
    </div>
  );
}

function Body({ review, live, a }: { review: ReviewState; live: boolean; a: Actions }) {
  const result = review.result;
  return (
    <div className="review-body">
      {!live && <div className="alert">Review checks the live design. Switch the canvas source to Live.</div>}
      {review.error && <div className="alert error">{review.error}</div>}
      {review.busy && !result && (
        <div className="review-wait">
          <span className="spinner" /> Checking the frame…
        </div>
      )}
      {result && result.findings.length === 0 && <div className="review-wait">This frame passes every check.</div>}
      {result && grouped(result.findings).map(([kind, list]) => <Group key={kind} kind={kind} list={list} a={a} />)}
    </div>
  );
}

export default function ReviewPanel(p: Props) {
  const a: Actions = { fixBlocked: fixBlocked(p.live, p.running), fixing: p.review.fixing, canAsk: p.canAsk, onSelect: p.onSelect, onAsk: p.onAsk, onFix: (list) => void p.review.fix(list) };
  return (
    <div className="review-panel" role="region" aria-label="Review">
      <div className="review-head">
        <Icon name="check" />
        <strong>Review</strong>
        <span className="muted truncate">{p.frameLabel}</span>
        <div className="spacer" />
        <button type="button" className="icon-btn" aria-label="Run the review again" data-tip="Run again" disabled={p.review.busy || !p.live} onClick={p.review.run}>
          {p.review.busy ? <span className="spinner" /> : <Icon name="reload" size={14} />}
        </button>
        <button type="button" className="icon-btn" aria-label="Close" data-tip="Close" data-tip-align="end" onClick={p.onClose}>
          <Icon name="close" />
        </button>
      </div>
      <Summary review={p.review} />
      <Body review={p.review} live={p.live} a={a} />
    </div>
  );
}
