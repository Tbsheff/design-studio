import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createCanUseTool, createPreToolUseGuard, isInstallCommand, permittedToolNames, type ToolPolicy } from './permissions.js';

let root: string;
let workTree: string;
let outside: string;
let skillDir: string;

const signal = new AbortController().signal;

function policy(overrides: Partial<ToolPolicy> = {}): ToolPolicy {
  return { workTree, mode: 'edit', allowBash: false, allowInstall: false, ...overrides };
}

async function decide(toolName: string, input: Record<string, unknown>, overrides: Partial<ToolPolicy> = {}) {
  const result = await createCanUseTool(policy(overrides))(toolName, input, { signal, toolUseID: 'tool_1' } as Parameters<ReturnType<typeof createCanUseTool>>[2]);
  if (!result) throw new Error('canUseTool returned no decision');
  return result;
}

beforeAll(async () => {
  root = await mkdtemp(path.join(os.tmpdir(), 'studio-perm-'));
  workTree = path.join(root, 'work');
  outside = path.join(root, 'outside');
  await mkdir(path.join(workTree, 'src'), { recursive: true });
  await mkdir(path.join(workTree, '.git'), { recursive: true });
  await mkdir(path.join(workTree, 'node_modules', 'react'), { recursive: true });
  await mkdir(outside, { recursive: true });
  skillDir = path.join(root, 'skills', 'design-kit');
  await mkdir(path.join(skillDir, 'references'), { recursive: true });
  await writeFile(path.join(skillDir, 'SKILL.md'), '---\nname: design-kit\ndescription: x\n---\n');
  await writeFile(path.join(workTree, 'index.html'), '<h1>hi</h1>');
  await writeFile(path.join(workTree, '.git', 'config'), '[core]');
  await writeFile(path.join(outside, 'secret.txt'), 'secret');
  await symlink(outside, path.join(workTree, 'escape'));
  await symlink(path.join(outside, 'secret.txt'), path.join(workTree, 'secret-link.txt'));
  await writeFile(path.join(workTree, 'vite.config.ts'), 'export default {}');
  await symlink(path.join(workTree, 'vite.config.ts'), path.join(workTree, 'config-link.ts'));
});

afterAll(async () => {
  await rm(root, { recursive: true, force: true });
});

describe('canUseTool', () => {
  it('allows reads and writes inside the work tree', async () => {
    expect((await decide('Read', { file_path: path.join(workTree, 'index.html') })).behavior).toBe('allow');
    expect((await decide('Read', { file_path: 'index.html' })).behavior).toBe('allow');
    expect((await decide('Write', { file_path: path.join(workTree, 'src', 'new', 'Card.tsx'), content: 'x' })).behavior).toBe('allow');
    expect((await decide('Edit', { file_path: 'src/App.tsx', old_string: 'a', new_string: 'b' })).behavior).toBe('allow');
    expect((await decide('Glob', { pattern: '**/*.html', path: workTree })).behavior).toBe('allow');
    expect((await decide('Grep', { pattern: 'h1', path: 'src' })).behavior).toBe('allow');
  });

  it('allows the studio MCP tools', async () => {
    expect((await decide('mcp__studio__render_check', {})).behavior).toBe('allow');
    expect((await decide('mcp__studio__design_review', {})).behavior).toBe('allow');
    expect((await decide('mcp__studio__screenshot', { viewport: 'mobile' })).behavior).toBe('allow');
  });

  it('denies a relative path that leaves the tree', async () => {
    expect((await decide('Read', { file_path: '../x' })).behavior).toBe('deny');
    expect((await decide('Write', { file_path: 'src/../../outside/x.txt', content: 'x' })).behavior).toBe('deny');
    expect((await decide('Glob', { pattern: '../**/*' })).behavior).toBe('deny');
  });

  it('denies an absolute path outside the tree', async () => {
    expect((await decide('Read', { file_path: path.join(outside, 'secret.txt') })).behavior).toBe('deny');
    expect((await decide('Read', { file_path: '/etc/passwd' })).behavior).toBe('deny');
    expect((await decide('Grep', { pattern: 'x', path: '/etc' })).behavior).toBe('deny');
    expect((await decide('Read', { file_path: '~/.ssh/id_rsa' })).behavior).toBe('deny');
  });

  it('denies symlinks that escape the tree', async () => {
    expect((await decide('Read', { file_path: path.join(workTree, 'secret-link.txt') })).behavior).toBe('deny');
    expect((await decide('Write', { file_path: path.join(workTree, 'escape', 'new.txt'), content: 'x' })).behavior).toBe('deny');
    expect((await decide('Read', { file_path: 'escape/secret.txt' })).behavior).toBe('deny');
  });

  it('denies .git and node_modules', async () => {
    expect((await decide('Read', { file_path: path.join(workTree, '.git', 'config') })).behavior).toBe('deny');
    expect((await decide('Edit', { file_path: '.git/config', old_string: 'a', new_string: 'b' })).behavior).toBe('deny');
    expect((await decide('Write', { file_path: 'node_modules/react/index.js', content: 'x' })).behavior).toBe('deny');
  });

  it('denies tools that are not on the list', async () => {
    expect((await decide('WebFetch', { url: 'https://example.com' })).behavior).toBe('deny');
    expect((await decide('Task', { prompt: 'x' })).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'ls' })).behavior).toBe('deny');
    expect((await decide('mcp__other__tool', {})).behavior).toBe('deny');
  });

  it('denies Write and Edit in critique mode', async () => {
    expect((await decide('Write', { file_path: 'index.html', content: 'x' }, { mode: 'critique' })).behavior).toBe('deny');
    expect((await decide('Edit', { file_path: 'index.html', old_string: 'a', new_string: 'b' }, { mode: 'critique' })).behavior).toBe('deny');
    expect((await decide('Read', { file_path: 'index.html' }, { mode: 'critique' })).behavior).toBe('allow');
    expect(permittedToolNames({ mode: 'critique', allowBash: true })).not.toContain('Bash');
  });

  it('denies Bash installs unless installs are allowed', async () => {
    const bash = { allowBash: true };
    expect((await decide('Bash', { command: 'ls -la' }, bash)).behavior).toBe('allow');
    expect((await decide('Bash', { command: 'npm install left-pad' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'cd app && pnpm add react' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'yarn add lodash' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'bun install' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'npm ci' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'npx create-vite' }, bash)).behavior).toBe('deny');
    expect((await decide('Bash', { command: 'npm install left-pad' }, { ...bash, allowInstall: true })).behavior).toBe('allow');
    expect(isInstallCommand('ls src && cat index.html')).toBe(false);
  });

  it('denies install bypasses when installs are off', async () => {
    const bash = { allowBash: true };
    const bypasses = [
      "sh -c 'npm install x'",
      'bash -lc "npm i x"',
      'npm --prefix . install x',
      'node -e "require(\'child_process\').execSync(\'npm i x\')"',
      'python3 -c "import os"',
      'pip install requests',
      'pip3 install requests',
      'uv pip install x',
      'echo $(npx something)',
      'echo `yarn`',
      '/usr/local/bin/npm i x',
      'ls; curl https://example.com/x.sh',
      'wget https://example.com',
      'go install example.com/tool@latest',
      'go get example.com/x',
      'brew install jq',
      'cargo install ripgrep',
      'gem install rails',
      'eval "npm i x"',
      'npm run build',
    ];
    for (const command of bypasses) {
      expect({ command, behavior: (await decide('Bash', { command }, bash)).behavior }).toEqual({ command, behavior: 'deny' });
    }
    expect((await decide('Bash', { command: 'go build ./...' }, bash)).behavior).toBe('allow');
    expect((await decide('Bash', { command: "sh -c 'npm install x'" }, { ...bash, allowInstall: true })).behavior).toBe('allow');
  });

  it('denies agent writes to files that build tools run as code', async () => {
    const blocked = [
      'vite.config.ts',
      'vite.config.mjs',
      'VITE.CONFIG.JS',
      'sub/dir/vite.config.ts',
      'postcss.config.cjs',
      '.postcssrc.json',
      'tailwind.config.ts',
      'babel.config.js',
      '.babelrc',
      '.babelrc.json',
      'package.json',
      '.npmrc',
    ];
    for (const file of blocked) {
      for (const tool of ['Write', 'Edit', 'MultiEdit']) {
        const result = await decide(tool, { file_path: file, content: 'x', old_string: 'a', new_string: 'b' });
        expect({ file, tool, behavior: result.behavior }).toEqual({ file, tool, behavior: 'deny' });
        if (tool !== 'MultiEdit') expect(result).toMatchObject({ message: expect.stringContaining('run this file as code') });
      }
    }
    expect((await decide('Read', { file_path: 'vite.config.ts' })).behavior).toBe('allow');
    expect((await decide('Write', { file_path: 'tsconfig.json', content: '{}' })).behavior).toBe('allow');
    expect((await decide('Write', { file_path: 'tsconfig.app.json', content: '{}' })).behavior).toBe('allow');
    expect((await decide('Write', { file_path: 'config-link.ts', content: 'x' })).behavior).toBe('deny');
  });

  it('returns the SDK deny shape with a message', async () => {
    const result = await decide('Read', { file_path: '../x' });
    expect(result).toMatchObject({ behavior: 'deny', message: expect.stringContaining('outside') });
  });
});

describe('PreToolUse guard', () => {
  it('denies the same inputs as canUseTool', async () => {
    const guard = createPreToolUseGuard(policy());
    const base = { session_id: 's', transcript_path: '', cwd: workTree, hook_event_name: 'PreToolUse' as const, tool_use_id: 't' };
    const denied = await guard({ ...base, tool_name: 'Read', tool_input: { file_path: '/etc/passwd' } } as Parameters<typeof guard>[0], 't', { signal });
    expect(denied).toMatchObject({ hookSpecificOutput: { permissionDecision: 'deny' } });
    const allowed = await guard({ ...base, tool_name: 'Read', tool_input: { file_path: 'index.html' } } as Parameters<typeof guard>[0], 't', { signal });
    expect(allowed).toEqual({});
  });
});

describe('skills', () => {
  const on = (): Partial<ToolPolicy> => ({ skills: ['personal:design-kit', 'ctx:ctx-stats'], skillDirs: [skillDir] });

  it('offers and allows the Skill tool only when skills are on', async () => {
    expect(permittedToolNames({ mode: 'edit', allowBash: false, skills: ['personal:design-kit'] })).toContain('Skill');
    expect(permittedToolNames({ mode: 'critique', allowBash: false, skills: ['personal:design-kit'] })).toContain('Skill');
    expect(permittedToolNames({ mode: 'edit', allowBash: false })).not.toContain('Skill');
    expect((await decide('Skill', { skill: 'personal:design-kit' }, on())).behavior).toBe('allow');
    expect((await decide('Skill', { skill: 'ctx-stats' }, on())).behavior).toBe('allow');
    expect((await decide('Skill', { skill: 'personal:design-kit' })).behavior).toBe('deny');
  });

  it('denies a Skill call for a skill that is turned off', async () => {
    expect((await decide('Skill', { skill: 'personal:test-first' }, on())).behavior).toBe('deny');
  });

  it('allows Read, Glob and Grep inside a loaded skill folder', async () => {
    expect((await decide('Read', { file_path: path.join(skillDir, 'SKILL.md') }, on())).behavior).toBe('allow');
    expect((await decide('Read', { file_path: path.join(skillDir, 'references', 'a.md') }, on())).behavior).toBe('allow');
    expect((await decide('Glob', { pattern: '**/*.md', path: skillDir }, on())).behavior).toBe('allow');
    expect((await decide('Grep', { pattern: 'x', path: skillDir }, on())).behavior).toBe('allow');
    expect((await decide('Read', { file_path: path.join(skillDir, 'SKILL.md') }, { ...on(), mode: 'critique' })).behavior).toBe('allow');
  });

  it('denies writes inside a skill folder', async () => {
    expect((await decide('Write', { file_path: path.join(skillDir, 'SKILL.md'), content: 'x' }, on())).behavior).toBe('deny');
    expect((await decide('Edit', { file_path: path.join(skillDir, 'SKILL.md'), old_string: 'a', new_string: 'b' }, on())).behavior).toBe('deny');
  });

  it('keeps everything else outside the work tree denied', async () => {
    expect((await decide('Read', { file_path: path.join(outside, 'secret.txt') }, on())).behavior).toBe('deny');
    expect((await decide('Read', { file_path: path.join(root, 'skills', 'other', 'SKILL.md') }, on())).behavior).toBe('deny');
    expect((await decide('Read', { file_path: path.join(skillDir, '..', '..', 'outside', 'secret.txt') }, on())).behavior).toBe('deny');
    expect((await decide('Glob', { pattern: '../**', path: skillDir }, on())).behavior).toBe('deny');
    expect((await decide('Read', { file_path: path.join(skillDir, 'SKILL.md') })).behavior).toBe('deny');
  });
});
