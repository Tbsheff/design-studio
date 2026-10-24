import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import type { ClarifyQuestion } from '../../shared/contracts';
import { Icon } from './Icon';
import { useRovingRadioGroup } from './LevelControl';

function ClarifyQuestionField({ item, answer, onAnswer, first }: { item: ClarifyQuestion; answer: string; onAnswer: (value: string) => void; first: boolean }) {
  const legendId = useId();
  const picked = item.options.includes(answer) ? answer : '';
  const radios = useRovingRadioGroup(item.options, picked, onAnswer);
  const firstRef = useRef<HTMLButtonElement | null>(null);
  useEffect(() => {
    if (first) firstRef.current?.focus();
  }, [first]);
  return (
    <div className="clarify-q">
      <span className="clarify-legend" id={legendId}>
        {item.question}
      </span>
      <div className="clarify-options">
        <div className="clarify-choices" role="radiogroup" aria-labelledby={legendId} onKeyDown={radios.onKeyDown}>
          {item.options.map((option, index) => {
            const props = radios.item(option);
            const on = picked === option;
            return (
              <button
                key={option}
                type="button"
                role="radio"
                aria-checked={on}
                className={`chip-toggle${on ? ' on' : ''}`}
                tabIndex={picked === '' ? (index === 0 ? 0 : -1) : props.tabIndex}
                ref={(element) => {
                  props.ref(element);
                  if (index === 0) firstRef.current = element;
                }}
                onClick={() => onAnswer(option)}
              >
                {on && <Icon name="check" size={12} />}
                {option}
              </button>
            );
          })}
        </div>
        <input className="clarify-other" aria-label={`Other answer: ${item.question}`} placeholder="Or type an answer" value={picked ? '' : answer} onChange={(event) => onAnswer(event.target.value)} />
      </div>
    </div>
  );
}

export function ClarifyForm({ questions, busy, onBuild, onSkip, onCancel }: { questions: ClarifyQuestion[]; busy: boolean; onBuild: (answers: Array<{ question: string; answer: string }>) => void; onSkip: () => void; onCancel: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const submit = (event: FormEvent) => {
    event.preventDefault();
    onBuild(questions.map((item) => ({ question: item.question, answer: answers[item.id] ?? '' })));
  };
  const set = (id: string, value: string) => setAnswers((current) => ({ ...current, [id]: value }));
  return (
    <form className="clarify" aria-labelledby="clarify-heading" onSubmit={submit} onKeyDown={(event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    }}>
      <div className="clarify-head">
        <Icon name="sparkle" size={14} />
        <h2 id="clarify-heading">A few quick questions</h2>
        <span className="clarify-hint">Short briefs build better with these answers. All are optional.</span>
      </div>
      {questions.map((item, index) => (
        <ClarifyQuestionField key={item.id} item={item} answer={answers[item.id] ?? ''} onAnswer={(value) => set(item.id, value)} first={index === 0} />
      ))}
      <div className="clarify-foot">
        <button type="button" className="btn ghost small" onClick={onSkip} disabled={busy}>
          Skip questions
        </button>
        <button type="submit" className="btn primary small has-icon" disabled={busy}>
          {busy ? <span className="spinner" /> : <Icon name="arrowUp" size={14} />}
          {busy ? 'Creating…' : 'Build with answers'}
        </button>
      </div>
    </form>
  );
}
