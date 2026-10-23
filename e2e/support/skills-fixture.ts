import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

export const FIXTURE_SKILLS = {
  brand: 'personal:brand-voice',
  deck: 'personal:deck-scripts',
  review: 'demo-plugin:demo-review',
};

function skill(dir: string, name: string, description: string, body: string): void {
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: ${description}\n---\n\n${body}\n`);
}

export function claudeHomeFor(dataDir: string): string {
  return path.join(path.dirname(dataDir), 'claude-home');
}

export function writeSkillsFixture(home: string): void {
  if (existsSync(path.join(home, 'settings.json'))) return;
  skill(path.join(home, 'skills', 'brand-voice'), 'brand-voice', 'Write product copy in a calm, plain brand voice.', 'Use short sentences.');
  skill(path.join(home, 'skills', 'deck-scripts'), 'deck-scripts', 'Build slide decks with the helper scripts.', 'Run `bash scripts/build.sh` to render.');
  mkdirSync(path.join(home, 'skills', 'notes-only'), { recursive: true });
  const plugin = path.join(home, 'plugins', 'cache', 'demo', 'demo-plugin', '1.0.0');
  mkdirSync(path.join(plugin, '.claude-plugin'), { recursive: true });
  writeFileSync(path.join(plugin, '.claude-plugin', 'plugin.json'), JSON.stringify({ name: 'demo-plugin', mcpServers: { demo: { command: 'false' } } }));
  skill(path.join(plugin, 'skills', 'demo-review'), 'demo-review', 'Review a layout for spacing and hierarchy.', 'Check the grid.');
  writeFileSync(
    path.join(home, 'plugins', 'installed_plugins.json'),
    JSON.stringify({ version: 2, plugins: { 'demo-plugin@demo': [{ scope: 'user', installPath: plugin }] } }),
  );
  writeFileSync(path.join(home, 'settings.json'), JSON.stringify({ enabledPlugins: { 'demo-plugin@demo': true } }));
}
