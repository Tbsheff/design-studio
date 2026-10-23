interface CheckResult {
  id: string;
  label: string;
  status: 'ok' | 'warn' | 'fail';
  required: boolean;
  detail: string;
  fixes: string[];
}

interface SetupBridge {
  run(): Promise<CheckResult[]>;
  fix(action: string): Promise<void>;
  info(): Promise<{ continueLabel: string } | null>;
  done(): Promise<void>;
}

const bridge = (window as unknown as { studioSetup: SetupBridge }).studioSetup;
const MARKS = { ok: '✓', warn: '!', fail: '✕' };
const FIX_LABELS: Record<string, string> = {
  'install-clt': 'Install Command Line Tools',
  'copy-claude': 'Copy “claude”',
  'open-terminal': 'Open Terminal',
  'reveal-data': 'Show data folder',
};

function element<K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  node.className = className;
  node.textContent = text;
  return node;
}

function fixButton(action: string): HTMLButtonElement {
  const button = element('button', 'fix', FIX_LABELS[action] ?? action);
  button.type = 'button';
  button.dataset.fix = action;
  button.addEventListener('click', () => void bridge.fix(action));
  return button;
}

function row(result: CheckResult): HTMLLIElement {
  const item = element('li', 'check', '');
  item.dataset.check = result.id;
  item.dataset.status = result.status;
  const label = element('span', 'label', result.label);
  if (!result.required) label.append(element('span', 'optional', ' (optional)'));
  item.append(element('span', 'mark', MARKS[result.status]), label, element('span', 'detail', result.detail));
  if (result.fixes.length > 0) {
    const fixes = element('div', 'fixes', '');
    fixes.append(...result.fixes.map(fixButton));
    item.append(fixes);
  }
  return item;
}

async function refresh(): Promise<void> {
  const list = document.getElementById('checks');
  if (!list) return;
  list.replaceChildren(element('li', 'pending', 'Checking…'));
  const results = await bridge.run();
  list.replaceChildren(...results.map(row));
  document.body.dataset.ready = 'true';
}

async function start(): Promise<void> {
  const info = await bridge.info();
  const next = document.getElementById('continue');
  if (next && info) next.textContent = info.continueLabel;
  next?.addEventListener('click', () => void bridge.done());
  document.getElementById('recheck')?.addEventListener('click', () => void refresh());
  await refresh();
}

void start();
