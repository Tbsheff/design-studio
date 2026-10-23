import { describe, expect, it } from 'vitest';
import type { SkillInfo } from '../../shared/contracts.js';
import { LOAD_ORDER, recommendedSkillsBlock, recommendSkills, termsOf } from './skill-match.js';

function skill(id: string, description: string, extra: Partial<SkillInfo> = {}): SkillInfo {
  return { id, name: id.split(':')[1] ?? id, description, origin: 'personal', sourcePath: `/skills/${id}`, needsBash: false, modelInvocable: true, ...extra };
}

const CATALOG: SkillInfo[] = [
  skill('personal:atelier', 'Design, redesign, critique and polish a frontend interface: layout, typography, color, hierarchy, responsive dashboards and landing pages.'),
  skill('personal:taste-guide', "Apply a person's design taste when building or redesigning a user interface, and review UI against it.", { needsBash: true }),
  skill('personal:palette-kit', 'Build a color palette and contrast tokens for an interface design.'),
  skill('personal:abstraction-coach', 'Help design and refactor software abstractions in TypeScript.'),
  skill('personal:seam-planning', 'Plan multi-file changes where design seams and interfaces matter.'),
  skill('personal:git-helper', 'Commit and push branches.'),
  skill('personal:manual-ui', 'A UI design layout typography color skill that only the user can start.', { modelInvocable: false }),
];
const ALL_IDS = CATALOG.map((entry) => entry.id);

describe('recommendSkills', () => {
  it('ranks UI skills first and leaves decoys that only share the word design out', () => {
    const ids = recommendSkills(CATALOG, ALL_IDS, { prompt: 'A dashboard home for a home-energy monitor', mode: 'edit' });
    expect(ids[0]).toBe('personal:atelier');
    expect(ids).toContain('personal:taste-guide');
    expect(ids).not.toContain('personal:abstraction-coach');
    expect(ids).not.toContain('personal:seam-planning');
    expect(ids).not.toContain('personal:git-helper');
  });

  it('keeps skills that need Bash, drops manual-only and disabled skills, and caps the list', () => {
    const enabled = ALL_IDS.filter((id) => id !== 'personal:palette-kit');
    const ids = recommendSkills(CATALOG, enabled, { prompt: 'Restyle the color palette', mode: 'critique' }, 2);
    expect(ids).toEqual(['personal:atelier', 'personal:taste-guide']);
    expect(recommendSkills(CATALOG, ALL_IDS, { prompt: 'x', mode: 'edit' })).not.toContain('personal:manual-ui');
  });

  it('orders ties by id so the prefix is stable from run to run', () => {
    const twins = [skill('personal:b-ui', 'UI layout typography color interface'), skill('personal:a-ui', 'UI layout typography color interface')];
    const ids = twins.map((entry) => entry.id);
    expect(recommendSkills(twins, ids, { prompt: 'page', mode: 'edit' })).toEqual(['personal:a-ui', 'personal:b-ui']);
  });

  it('stems plurals and skips stopwords', () => {
    expect([...termsOf('The interfaces and dashboards for UI')]).toEqual(['interface', 'dashboard', 'ui']);
  });

  it('formats a block only when there is something to recommend', () => {
    expect(recommendedSkillsBlock([])).toBe('');
    expect(recommendedSkillsBlock(['personal:atelier', 'personal:taste-guide'])).toBe(
      `<recommended-skills>\nRecommended for this request: personal:atelier, personal:taste-guide\n${LOAD_ORDER}\n</recommended-skills>`,
    );
  });
});

describe('recommendation cap', () => {
  it('recommends at most three skills by default even when more match', () => {
    const many = ['a', 'b', 'c', 'd', 'e'].map((letter) => skill(`personal:${letter}-ui`, 'UI interface design layout typography color critique taste frontend.'));
    expect(recommendSkills(many, many.map((entry) => entry.id), { prompt: 'Build a landing page', mode: 'edit' })).toEqual(['personal:a-ui', 'personal:b-ui', 'personal:c-ui']);
  });
});
