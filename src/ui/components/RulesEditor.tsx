import { useEffect, useState } from 'react';
import { DESIGN_RULE_KIND_LABEL, type DesignRule, type DesignRuleHit, type DesignRulesState, type DesignRulesTestResult } from '../../shared/design-rules';
import { errorText, rulesApi } from '../api';
import '../styles/rules.css';

interface Props {
  projectId: string;
  directionId: string;
}

const PLACEHOLDER = 'One rule per line, for example:\ncontrols: h-9 rounded-md\ncards: rounded-xl p-6\nno raw hex\nfont: Inter\nuse Button from @/components/ui/button, not <button>\nKeep labels short and plain.';

function originText(state: DesignRulesState): string {
  if (state.origin === 'design-md') return 'Saved in the rules block of DESIGN.md. Save makes a version you can undo.';
  if (state.origin === 'studio') return 'Saved in the studio. The app repo does not change.';
  if (state.origin === 'app-docs') return `Read from ${state.file ?? 'the app docs'}. Save keeps your copy in the studio; the app repo does not change.`;
  return 'No rules yet. Write some, or import them from the project docs.';
}

function hitText(rule: DesignRule, hit: DesignRuleHit | undefined): string {
  if (rule.kind === 'text') return 'Agent and critic only';
  if (!hit) return 'Not tested';
  return hit.count === 0 ? 'No breaks' : `${hit.count} ${hit.count === 1 ? 'break' : 'breaks'}`;
}

function RuleRow({ rule, hit }: { rule: DesignRule; hit: DesignRuleHit | undefined }) {
  const tone = rule.kind === 'text' || !hit ? 'idle' : hit.count === 0 ? 'ok' : 'bad';
  const sample = hit?.samples[0];
  return (
    <li className="rules-row" data-tone={tone}>
      <span className="ui-chip rules-kind">{DESIGN_RULE_KIND_LABEL[rule.kind]}</span>
      <span className="rules-text">{rule.text}</span>
      <span className="rules-hits" data-tip={sample ? `${sample.element}${sample.source ? ` at ${sample.source}` : ''}` : undefined} data-tip-align="end">
        {hitText(rule, hit)}
      </span>
    </li>
  );
}

function withImport(text: string, imported: string): string {
  return text.trim() ? `${text.trimEnd()}\n\n${imported}` : imported;
}

export default function RulesEditor({ projectId, directionId }: Props) {
  const [state, setState] = useState<DesignRulesState | null>(null);
  const [text, setText] = useState('');
  const [result, setResult] = useState<DesignRulesTestResult | null>(null);
  const [busy, setBusy] = useState<'test' | 'save' | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    rulesApi.get(projectId, directionId).then(
      (next) => {
        if (!live) return;
        setState(next);
        setText(next.text);
      },
      (err: unknown) => live && setError(errorText(err)),
    );
    return () => {
      live = false;
    };
  }, [projectId, directionId]);

  const run = async (kind: 'test' | 'save') => {
    setBusy(kind);
    setError(null);
    setNote(null);
    try {
      if (kind === 'test') {
        setResult(await rulesApi.test(projectId, directionId, text));
      } else {
        const saved = await rulesApi.save(projectId, directionId, text);
        setState(saved.state);
        setText(saved.state.text);
        setNote(saved.versionId ? 'Saved as a new version.' : 'Saved.');
      }
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(null);
    }
  };

  if (!state) return <section className="rules-editor" aria-label="Design rules">{error ? <p className="rules-error">{error}</p> : <p className="pane-system-text">Loading rules…</p>}</section>;
  const dirty = text.trim() !== state.text.trim();
  const hits = new Map(result?.hits.map((hit) => [hit.ruleId, hit]) ?? []);
  const rules = result?.rules ?? state.rules;
  const imported = state.imported;
  return (
    <section className="rules-editor" aria-label="Design rules">
      <div className="rules-head">
        <h3>Design rules</h3>
        {imported && (
          <button type="button" className="btn small ghost" data-tip={`Add the rules found in ${state.importFrom.join(', ')}. Check them, then save.`} data-tip-align="end" onClick={() => setText(withImport(text, imported))}>
            Import from docs
          </button>
        )}
      </div>
      <p className="pane-system-text">{originText(state)} The agent follows every rule. Review checks class, token, font and component rules.</p>
      <textarea className="rules-input" aria-label="Rules, one per line" spellCheck={false} rows={8} value={text} placeholder={PLACEHOLDER} onChange={(event) => setText(event.target.value)} />
      <div className="pane-system-actions">
        <button type="button" className="btn small" disabled={busy !== null || !text.trim()} data-tip="Check these rules on the live frame. Nothing is saved." onClick={() => void run('test')}>
          {busy === 'test' ? 'Testing…' : 'Test on frame'}
        </button>
        <button type="button" className="btn small primary" disabled={busy !== null || !dirty} onClick={() => void run('save')}>
          {busy === 'save' ? 'Saving…' : 'Save'}
        </button>
        {note && <span className="pane-system-text">{note}</span>}
      </div>
      {error && <p className="rules-error">{error}</p>}
      {result && result.notes.map((line) => <p key={line} className="pane-system-text">{line}</p>)}
      {rules.length > 0 && (
        <ul className="rules-list" aria-label="Parsed rules">
          {rules.map((rule) => (
            <RuleRow key={rule.id} rule={rule} hit={hits.get(rule.id)} />
          ))}
        </ul>
      )}
    </section>
  );
}
