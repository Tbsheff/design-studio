import type { SDKMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { describe, expect, it } from 'vitest';
import { formatAnswers, needsQuestions } from '../../shared/clarify.js';
import { askQuestions, parseClarifyReply } from './clarify.js';

function fakeQuery(text: string): () => Promise<typeof query> {
  const fn = (() => {
    const stream = (async function* reply() {
      yield { type: 'result', subtype: 'success', result: text } as unknown as SDKMessage;
    })();
    return Object.assign(stream, { close: () => undefined });
  }) as unknown as typeof query;
  return async () => fn;
}

describe('clarify', () => {
  it('asks only when the prompt has fewer than 12 words', () => {
    expect(needsQuestions('A bakery page')).toBe(true);
    expect(needsQuestions('one two three four five six seven eight nine ten eleven')).toBe(true);
    expect(needsQuestions('one two three four five six seven eight nine ten eleven twelve')).toBe(false);
    expect(needsQuestions('   ')).toBe(false);
  });

  it('reads at most three questions from the model reply', () => {
    const reply = '```json\n[{"question":"Who buys?","options":["Shops","Homes"]},{"question":"Tone?","options":["Calm","Bold"]},{"question":"Main action?","options":["Order","Visit"]},{"question":"Extra?","options":["A","B"]}]\n```';
    const questions = parseClarifyReply(reply);
    expect(questions.map((item) => item.id)).toEqual(['q1', 'q2', 'q3']);
    expect(questions[0]).toEqual({ id: 'q1', question: 'Who buys?', options: ['Shops', 'Homes'] });
  });

  it('uses the model questions and falls back to fixed ones on a bad reply', async () => {
    const good = await askQuestions('A bakery page', { mode: 'sdk', loadQuery: fakeQuery('[{"question":"Which city?","options":["Austin","Boston"]}]') });
    expect(good).toEqual({ source: 'model', questions: [{ id: 'q1', question: 'Which city?', options: ['Austin', 'Boston'] }] });
    const bad = await askQuestions('A bakery page', { mode: 'sdk', loadQuery: fakeQuery('no json here') });
    expect(bad.source).toBe('fallback');
    expect(bad.questions).toHaveLength(3);
  });

  it('adds the answers under the prompt', () => {
    expect(formatAnswers('A bakery page', [{ question: 'Who is it for?', answer: 'Locals' }, { question: 'Tone?', answer: ' ' }])).toBe('A bakery page\n\nAnswers to your questions:\n- Who is it for? Locals');
    expect(formatAnswers('A bakery page ', [])).toBe('A bakery page');
  });
});
