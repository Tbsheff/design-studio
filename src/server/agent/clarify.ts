import os from 'node:os';
import type { Options, SDKMessage, query } from '@anthropic-ai/claude-agent-sdk';
import { z } from 'zod';
import type { ClarifyQuestion } from '../../shared/contracts.js';
import { WIREFRAME_MODEL } from '../../shared/run-levels.js';
import { needsQuestions } from '../../shared/clarify.js';
import { extractJson } from './critic.js';

type QueryFn = typeof query;

export const MAX_QUESTIONS = 3;
const CLARIFY_TIMEOUT_MS = 12_000;

const QuestionSchema = z.object({
  question: z.string().trim().min(3).max(160),
  options: z.array(z.string().trim().min(1).max(60)).min(2).max(4),
});

const ReplySchema = z.union([z.array(QuestionSchema), z.object({ questions: z.array(QuestionSchema) }).transform((value) => value.questions)]);

const CLARIFY_SYSTEM = `You help a designer start a design from a short brief. Before the build starts, ask the few questions whose answers change the design the most: audience, the one main action, content or sections, visual tone, data to show. Never ask about things the brief already says. Never ask about tech stack, budget or deadlines.
Answer with JSON only: an array of at most 3 items, each {"question": "short question", "options": ["2 to 4 short likely answers"]}. Questions under 12 words, options under 5 words, sentence case, no numbering.`;

export function toQuestions(raw: Array<{ question: string; options: string[] }>): ClarifyQuestion[] {
  return raw.slice(0, MAX_QUESTIONS).map((item, index) => ({ id: `q${index + 1}`, question: item.question, options: [...new Set(item.options)] }));
}

export function parseClarifyReply(text: string): ClarifyQuestion[] {
  return toQuestions(ReplySchema.parse(extractJson(text)));
}

export function fallbackQuestions(): ClarifyQuestion[] {
  return toQuestions([
    { question: 'Who is it for?', options: ['New customers', 'Existing users', 'Internal team'] },
    { question: 'What is the one main action?', options: ['Sign up', 'Buy', 'Contact us', 'Read more'] },
    { question: 'What tone should it have?', options: ['Calm and minimal', 'Bold and bright', 'Warm and friendly', 'Technical'] },
  ]);
}

function clarifyOptions(env?: Record<string, string | undefined>, claudeExecutable?: string): Options {
  return {
    ...(env ? { env } : {}),
    ...(claudeExecutable ? { pathToClaudeCodeExecutable: claudeExecutable } : {}),
    model: WIREFRAME_MODEL,
    maxTurns: 1,
    tools: [],
    settingSources: [],
    strictMcpConfig: true,
    mcpServers: {},
    persistSession: false,
    permissionMode: 'default',
    cwd: os.tmpdir(),
    systemPrompt: CLARIFY_SYSTEM,
    settings: { disableBundledSkills: true, syncClaudeAiSkills: false, syncClaudeAiPlugins: false },
    skills: [],
  };
}

async function replyText(stream: AsyncIterable<SDKMessage>): Promise<string> {
  let text = '';
  for await (const message of stream) {
    if (message.type === 'assistant') {
      for (const block of message.message.content) if (block.type === 'text') text += block.text;
    } else if (message.type === 'result' && message.subtype === 'success' && message.result) {
      text = message.result;
    }
  }
  return text;
}

export interface ClarifyDeps {
  mode: 'mock' | 'sdk';
  loadQuery?: () => Promise<QueryFn>;
  env?: Record<string, string | undefined>;
  claudeExecutable?: string;
  timeoutMs?: number;
}

export async function askQuestions(prompt: string, deps: ClarifyDeps): Promise<{ questions: ClarifyQuestion[]; source: 'mock' | 'model' | 'fallback' | 'none' }> {
  if (!needsQuestions(prompt)) return { questions: [], source: 'none' };
  if (deps.mode === 'mock') return { questions: fallbackQuestions(), source: 'mock' };
  const loadQuery = deps.loadQuery ?? (async () => (await import('@anthropic-ai/claude-agent-sdk')).query);
  const queryFn = await loadQuery();
  const stream = queryFn({ prompt: `<brief>\n${prompt.trim()}\n</brief>\nReply with the JSON array only.`, options: clarifyOptions(deps.env, deps.claudeExecutable) });
  let timer: NodeJS.Timeout | undefined;
  try {
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(() => reject(new Error('clarify timed out')), deps.timeoutMs ?? CLARIFY_TIMEOUT_MS);
    });
    const questions = parseClarifyReply(await Promise.race([replyText(stream), timeout]));
    return questions.length > 0 ? { questions, source: 'model' } : { questions: fallbackQuestions(), source: 'fallback' };
  } catch (error) {
    console.error('[clarify] model questions failed, using fixed questions', error);
    return { questions: fallbackQuestions(), source: 'fallback' };
  } finally {
    if (timer) clearTimeout(timer);
    stream.close();
  }
}
