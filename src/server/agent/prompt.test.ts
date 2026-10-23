import { rm } from 'node:fs/promises';
import { afterEach, describe, expect, it } from 'vitest';
import type { Project } from '../../shared/contracts.js';
import { buildSystemPrompt } from './prompt.js';
import { createTempProject } from './test-fakes.js';

const roots: string[] = [];

afterEach(async () => {
  while (roots.length) await rm(roots.pop() as string, { recursive: true, force: true });
});

async function project(allowBash = false): Promise<Project> {
  const temp = await createTempProject('html', { allowBash });
  roots.push(temp.root);
  return temp.project;
}

describe('verify rules', () => {
  it('defers checks and loops to the run-level block, keeps the checklist, and forbids removing navigation', async () => {
    const prompt = buildSystemPrompt(await project(), 'edit');
    const verify = prompt.slice(prompt.indexOf('## Verify'), prompt.indexOf('## Replies'));
    expect(verify).toContain('Every message has a <run-level> block');
    expect(verify.indexOf('mcp__studio__render_check')).toBeLessThan(verify.indexOf('mcp__studio__screenshot'));
    expect(verify).toContain('take mobile first, from the top');
    for (const item of ['clipped', 'sideways scrolling', 'Nav items', 'contradicts', 'placeholder', 'spacing rhythm', 'Hierarchy']) expect(verify).toContain(item);
    expect(verify).toContain('Never remove navigation to fix a cut-off or clipped nav');
    expect(verify).toContain('After the last edit of the run, run the final check');
    expect(prompt).not.toContain('Use clear placeholder copy');
    expect(verify.split(/\s+/).length).toBeLessThan(320);
  });

  it('makes a critique run the level checks before it answers', async () => {
    const prompt = buildSystemPrompt(await project(), 'critique');
    const critique = prompt.slice(prompt.indexOf('## Mode: critique'));
    expect(critique).toContain('Before you critique, run the checks the <run-level> block asks for');
    expect(critique).toContain('Tables or rows that need sideways scrolling');
    expect(prompt).not.toContain('## Verify');
  });
});

describe('skills rule', () => {
  it('tells the agent to load every matching skill and the recommended ones, and keeps Bash-only skills for guidance', async () => {
    const off = buildSystemPrompt(await project(false), 'edit', null, 12);
    expect(off).toContain('scan the skill list and load every skill whose description matches the task: design, UI, layout, typography, color, critique, taste');
    expect(off).toContain('<recommended-skills> block');
    expect(off).toContain('Load a skill that uses a shell anyway for its guidance');
    const on = buildSystemPrompt(await project(true), 'edit', null, 12);
    expect(on).not.toContain('Shell commands are off');
  });

  it('keeps the system prompt the same for different requests so the prompt cache holds', async () => {
    const p = await project();
    expect(buildSystemPrompt(p, 'edit', null, 12)).toBe(buildSystemPrompt(structuredClone(p), 'edit', null, 12));
    expect(buildSystemPrompt(p, 'edit', null, 12)).not.toContain('Recommended for this request');
  });
});
