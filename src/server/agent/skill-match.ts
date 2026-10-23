import type { RunMode, SkillInfo } from '../../shared/contracts.js';

const MAX_RECOMMENDED_SKILLS = 5;
const MIN_SCORE = 6;
const BASE_QUERY = 'ui design interface layout typography color critique taste frontend';
const MODE_QUERY: Record<RunMode, string> = { edit: 'build redesign', critique: 'critique review audit' };

const STOPWORDS = new Set(
  'the and for with from that this your you are use when into over than then them they their what which who how why all any can its not but out per via one two three four five six more most some such only also just like make made new add get set has have had was were will would should could may might each other about after before while where there here been being does done very much many own same both few off'.split(
    ' ',
  ),
);

const UI_TERMS = new Set(
  'ui ux interface design redesign layout typography type font color colour palette contrast critique taste frontend landing dashboard screen visual polish accessibility responsive mobile component spacing hierarchy style theme motion animation'.split(' '),
);

const LIGHT_TERMS = new Set(['design']);

function stem(word: string): string {
  if (word.length > 4 && word.endsWith('ies')) return `${word.slice(0, -3)}y`;
  if (word.length > 4 && word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1);
  return word;
}

export function termsOf(text: string): Set<string> {
  const words = text.toLowerCase().split(/[^a-z0-9]+/);
  const terms = new Set<string>();
  for (const word of words) {
    if (!word || STOPWORDS.has(word)) continue;
    if (word.length < 3 && !UI_TERMS.has(word)) continue;
    terms.add(stem(word));
  }
  return terms;
}

function termWeight(term: string): number {
  if (LIGHT_TERMS.has(term)) return 1;
  return UI_TERMS.has(term) ? 2 : 1;
}

function scoreSkill(skill: Pick<SkillInfo, 'name' | 'description'>, query: Set<string>): number {
  const nameTerms = termsOf(skill.name);
  const skillTerms = termsOf(`${skill.name} ${skill.description}`);
  let score = 0;
  for (const term of query) {
    if (!skillTerms.has(term)) continue;
    score += termWeight(term) + (nameTerms.has(term) ? 1 : 0);
  }
  return score;
}

interface SkillRequest {
  prompt: string;
  mode: RunMode;
}

export function recommendSkills(skills: SkillInfo[], enabled: readonly string[], request: SkillRequest, limit = MAX_RECOMMENDED_SKILLS): string[] {
  const on = new Set(enabled);
  const query = termsOf(`${request.prompt} ${MODE_QUERY[request.mode]} ${BASE_QUERY}`);
  return skills
    .filter((skill) => skill.modelInvocable && on.has(skill.id))
    .map((skill) => ({ id: skill.id, score: scoreSkill(skill, query) }))
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id))
    .slice(0, limit)
    .map((entry) => entry.id);
}

export const LOAD_ORDER = 'Before you write any file, call the Skill tool for each of these that fits the request.';

export function recommendedSkillsBlock(ids: readonly string[]): string {
  if (ids.length === 0) return '';
  return `<recommended-skills>\nRecommended for this request: ${ids.join(', ')}\n${LOAD_ORDER}\n</recommended-skills>`;
}
