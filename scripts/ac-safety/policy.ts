import { mkdirSync, mkdtempSync, realpathSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { builtinToolNames, evaluateToolUse, type ToolPolicy } from '../../src/server/agent/permissions.js';

const work = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'ac policy ')));
const workTree = path.join(work, 'tree');
mkdirSync(path.join(workTree, 'src'), { recursive: true });
writeFileSync(path.join(workTree, 'index.html'), '<h1>x</h1>');
symlinkSync('/etc', path.join(workTree, 'etc-link'));

const base: ToolPolicy = { workTree, mode: 'edit', allowBash: false, allowInstall: false };
const bashOn: ToolPolicy = { ...base, allowBash: true };
const bashInstall: ToolPolicy = { ...base, allowBash: true, allowInstall: true };

interface Case {
  label: string;
  policy: ToolPolicy;
  tool: string;
  input: Record<string, unknown>;
  expect: 'allow' | 'deny';
}

const cases: Case[] = [
  { label: 'default: Bash ls', policy: base, tool: 'Bash', input: { command: 'ls' }, expect: 'deny' },
  { label: 'default: Bash npm install', policy: base, tool: 'Bash', input: { command: 'npm install left-pad' }, expect: 'deny' },
  { label: 'default: Read /etc/hosts', policy: base, tool: 'Read', input: { file_path: '/etc/hosts' }, expect: 'deny' },
  { label: 'default: Write ../outside.txt', policy: base, tool: 'Write', input: { file_path: '../outside.txt', content: 'x' }, expect: 'deny' },
  { label: 'default: Read via symlink etc-link/hosts', policy: base, tool: 'Read', input: { file_path: 'etc-link/hosts' }, expect: 'deny' },
  { label: 'default: Glob ../**', policy: base, tool: 'Glob', input: { pattern: '../**' }, expect: 'deny' },
  { label: 'default: Grep path /etc', policy: base, tool: 'Grep', input: { pattern: 'localhost', path: '/etc' }, expect: 'deny' },
  { label: 'default: Write .git/config', policy: base, tool: 'Write', input: { file_path: '.git/config', content: 'x' }, expect: 'deny' },
  { label: 'default: WebFetch', policy: base, tool: 'WebFetch', input: { url: 'https://example.com' }, expect: 'deny' },
  { label: 'default: Write index.html (inside)', policy: base, tool: 'Write', input: { file_path: path.join(workTree, 'index.html'), content: 'x' }, expect: 'allow' },
  { label: 'default: Write vite.config.ts (inside, runs in studio process)', policy: base, tool: 'Write', input: { file_path: path.join(workTree, 'vite.config.ts'), content: 'x' }, expect: 'deny' },
  { label: 'critique: Write index.html', policy: { ...base, mode: 'critique' }, tool: 'Write', input: { file_path: path.join(workTree, 'index.html'), content: 'x' }, expect: 'deny' },
  { label: 'bash on: npm install left-pad', policy: bashOn, tool: 'Bash', input: { command: 'npm install left-pad' }, expect: 'deny' },
  { label: 'bash on: npm i left-pad', policy: bashOn, tool: 'Bash', input: { command: 'npm i left-pad' }, expect: 'deny' },
  { label: 'bash on: npx cowsay', policy: bashOn, tool: 'Bash', input: { command: 'npx cowsay hi' }, expect: 'deny' },
  { label: 'bash on: sh -c "npm install x"', policy: bashOn, tool: 'Bash', input: { command: "sh -c 'npm install left-pad'" }, expect: 'deny' },
  { label: 'bash on: npm --prefix . install x', policy: bashOn, tool: 'Bash', input: { command: 'npm --prefix . install left-pad' }, expect: 'deny' },
  { label: 'bash on: node -e execSync(npm i)', policy: bashOn, tool: 'Bash', input: { command: `node -e "require('child_process').execSync('npm i left-pad')"` }, expect: 'deny' },
  { label: 'bash on: pip install x', policy: bashOn, tool: 'Bash', input: { command: 'pip install requests' }, expect: 'deny' },
  { label: 'bash on: npm run build (project script)', policy: bashOn, tool: 'Bash', input: { command: 'npm run build' }, expect: 'deny' },
  { label: 'bash on: cat /etc/hosts', policy: bashOn, tool: 'Bash', input: { command: 'cat /etc/hosts' }, expect: 'deny' },
  { label: 'bash on: echo x > ../outside.txt', policy: bashOn, tool: 'Bash', input: { command: 'echo x > ../outside.txt' }, expect: 'deny' },
  { label: 'bash+install on: npm install left-pad', policy: bashInstall, tool: 'Bash', input: { command: 'npm install left-pad' }, expect: 'allow' },
];

const rows = cases.map((c) => {
  const result = evaluateToolUse(c.policy, c.tool, c.input);
  const message = result.behavior === 'deny' ? result.message : '';
  return { label: c.label, expected: c.expect, actual: result.behavior, ok: result.behavior === c.expect, message };
});

console.log(JSON.stringify({
  builtins: {
    default: builtinToolNames(base),
    bashOn: builtinToolNames(bashOn),
    critique: builtinToolNames({ ...base, mode: 'critique' }),
  },
  rows,
}, null, 2));
console.log(`[policy] ${rows.filter((r) => r.ok).length}/${rows.length} match the safe expectation`);
