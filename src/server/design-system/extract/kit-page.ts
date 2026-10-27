import { REQUIRED_TOKENS } from '../../../shared/contracts.js';

export const KIT_PAGE_FILE = 'index.html';

export type KitGroup = 'colors' | 'type' | 'spacing' | 'radius' | 'components';

export const KIT_GROUPS: readonly KitGroup[] = ['colors', 'type', 'spacing', 'radius', 'components'];

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const STYLE = `
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--fg); font-family: var(--font-body); font-size: var(--text-base); line-height: 1.5; }
    .kit { max-width: 1120px; margin: 0 auto; padding: var(--space-12) var(--space-8); display: grid; gap: var(--space-12); }
    .kit-head h1 { font-family: var(--font-display); font-size: var(--text-4xl); line-height: 1.1; margin: 0 0 var(--space-2); }
    .kit-head p, .kit-note { color: var(--fg-muted); margin: 0; }
    .kit-logo { display: inline-grid; gap: var(--space-2); margin: var(--space-4) 0 0; padding: var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-md); background: var(--surface); }
    .kit-logo img { display: block; max-height: 64px; max-width: 240px; }
    .kit-logo figcaption { font-size: var(--text-xs); color: var(--fg-muted); }
    section > h2 { font-family: var(--font-display); font-size: var(--text-xl); margin: 0 0 var(--space-4); }
    .palettes { display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: var(--space-6); }
    .palette { background: var(--bg); color: var(--fg); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-5); }
    .palette h3 { font-size: var(--text-sm); margin: 0 0 var(--space-4); color: var(--fg-muted); font-weight: 600; }
    .swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: var(--space-3); }
    .swatch { display: grid; gap: var(--space-1); font-size: var(--text-xs); }
    .chip { height: 48px; border-radius: var(--radius-md); border: 1px solid var(--border); }
    .swatch code { font-family: var(--font-mono); color: var(--fg-muted); }
    .type-row { display: grid; grid-template-columns: 72px 1fr; align-items: baseline; gap: var(--space-4); padding: var(--space-2) 0; border-bottom: 1px solid var(--border); }
    .type-row code, .scale-row code { font-family: var(--font-mono); font-size: var(--text-xs); color: var(--fg-muted); }
    .families { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: var(--space-4); margin-bottom: var(--space-6); }
    .family { background: var(--surface); border-radius: var(--radius-md); padding: var(--space-4); }
    .family strong { display: block; font-size: var(--text-2xl); }
    .scale-row { display: flex; align-items: center; gap: var(--space-4); padding: var(--space-1) 0; }
    .bar { height: var(--space-3); background: var(--primary); border-radius: var(--radius-sm); }
    .boxes { display: flex; flex-wrap: wrap; gap: var(--space-6); }
    .box { width: 120px; height: 88px; background: var(--surface); border: 1px solid var(--border); display: grid; place-items: center; font-size: var(--text-xs); color: var(--fg-muted); }
    .components { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: var(--space-6); }
    .panel { display: grid; gap: var(--space-3); align-content: start; }
    .row { display: flex; flex-wrap: wrap; gap: var(--space-3); align-items: center; }
    .btn { font: inherit; font-size: var(--text-sm); font-weight: 600; padding: var(--space-2) var(--space-4); border-radius: var(--radius-md); border: 1px solid transparent; cursor: pointer; }
    .btn-primary { background: var(--primary); color: var(--primary-fg); }
    .btn-secondary { background: var(--surface); color: var(--fg); border-color: var(--border); }
    .btn-accent { background: var(--accent); color: var(--accent-fg); }
    .btn-danger { background: var(--danger); color: var(--primary-fg); }
    .btn-pill { border-radius: var(--radius-pill); }
    .btn:focus-visible, .input:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
    label { display: grid; gap: var(--space-1); font-size: var(--text-sm); font-weight: 500; }
    .input { font: inherit; font-size: var(--text-sm); padding: var(--space-2) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--bg); color: var(--fg); }
    .card { background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: var(--space-5); box-shadow: var(--shadow-sm); display: grid; gap: var(--space-2); }
    .card h3 { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); }
    .card p { margin: 0; color: var(--fg-muted); font-size: var(--text-sm); }
    .alert { border-radius: var(--radius-md); padding: var(--space-3) var(--space-4); font-size: var(--text-sm); border: 1px solid var(--border); background: var(--surface); }
    .alert-success { border-left: 4px solid var(--success); }
    .alert-warning { border-left: 4px solid var(--warning); }
    .alert-danger { border-left: 4px solid var(--danger); }
    .nav { display: flex; align-items: center; gap: var(--space-6); padding: var(--space-3) var(--space-5); background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius-lg); }
    .nav strong { font-family: var(--font-display); margin-right: auto; }
    .nav a { color: var(--fg-muted); text-decoration: none; font-size: var(--text-sm); }
    .nav a[aria-current] { color: var(--primary); font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: var(--text-sm); }
    th, td { text-align: left; padding: var(--space-2) var(--space-3); border-bottom: 1px solid var(--border); }
    th { color: var(--fg-muted); font-weight: 600; }
    .tag { display: inline-block; padding: 0 var(--space-2); border-radius: var(--radius-pill); background: var(--accent); color: var(--accent-fg); font-size: var(--text-xs); }`;

const PENDING_STYLE = `
    .kit-reading { display: inline-flex; align-items: center; gap: var(--space-2); margin-top: var(--space-3); padding: var(--space-1) var(--space-3); border: 1px solid var(--border); border-radius: var(--radius-pill); color: var(--fg-muted); font-size: var(--text-sm); }
    .kit-reading::before { content: ""; width: var(--space-2); height: var(--space-2); border-radius: var(--radius-pill); background: var(--primary); animation: kit-pulse 1.2s ease-in-out infinite; }
    section[data-pending] > h2::after { content: " · reading sources"; color: var(--fg-muted); font-family: var(--font-body); font-size: var(--text-sm); font-weight: 400; }
    .skel-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(88px, 1fr)); gap: var(--space-3); }
    .skel-rows { display: grid; gap: var(--space-3); }
    .skel { height: 48px; border-radius: var(--radius-md); background: var(--surface); border: 1px solid var(--border); animation: kit-pulse 1.4s ease-in-out infinite; }
    .skel.line { height: var(--space-4); }
    .skel.wide { height: 120px; }
    @keyframes kit-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.45; } }
    @media (prefers-reduced-motion: reduce) { .skel, .kit-reading::before { animation: none; } }`;

function skeleton(group: KitGroup): string {
  if (group === 'colors') return `        <div class="skel-grid">\n${Array.from({ length: 12 }, () => '          <div class="skel"></div>').join('\n')}\n        </div>`;
  if (group === 'components') return `        <div class="skel-grid">\n${Array.from({ length: 3 }, () => '          <div class="skel wide"></div>').join('\n')}\n        </div>`;
  const rows = group === 'type' ? 6 : 4;
  return `        <div class="skel-rows">\n${Array.from({ length: rows }, () => '          <div class="skel line"></div>').join('\n')}\n        </div>`;
}

function section(label: string, group: KitGroup, pending: ReadonlySet<KitGroup>, body: string): string {
  if (!pending.has(group)) return `      <section aria-label="${label}">\n        <h2>${label}</h2>\n${body}\n      </section>`;
  return `      <section aria-label="${label}" data-pending="${group}" aria-busy="true">\n        <h2>${label}</h2>\n${skeleton(group)}\n      </section>`;
}

function swatches(): string {
  return REQUIRED_TOKENS.color
    .map((name) => `          <div class="swatch" data-token="${name}"><div class="chip" style="background: var(--${name})"></div><span>${name}</span><code>--${name}</code></div>`)
    .join('\n');
}

function palette(title: string, extraClass: string): string {
  return `      <div class="palette${extraClass}" data-palette="${extraClass.trim() || 'light'}">
        <h3>${title}</h3>
        <div class="swatches">
${swatches()}
        </div>
      </div>`;
}

function components(name: string): string {
  return `        <div class="components">
          <div class="panel">
            <div class="row">
              <button class="btn btn-primary" type="button">Primary</button>
              <button class="btn btn-secondary" type="button">Secondary</button>
              <button class="btn btn-accent" type="button">Accent</button>
              <button class="btn btn-danger btn-pill" type="button">Delete</button>
            </div>
            <label>Email<input class="input" type="email" placeholder="you@example.com"></label>
            <label>Message<textarea class="input" rows="3" placeholder="Write a message"></textarea></label>
          </div>
          <div class="panel">
            <article class="card">
              <span class="tag">New</span>
              <h3>Card title</h3>
              <p>Cards use the surface color, a border, a large radius and the small shadow.</p>
              <div class="row"><button class="btn btn-primary" type="button">Open</button></div>
            </article>
          </div>
          <div class="panel">
            <div class="alert alert-success" role="status">Saved. Your changes are live.</div>
            <div class="alert alert-warning" role="status">Your trial ends in 3 days.</div>
            <div class="alert alert-danger" role="alert">Payment failed. Check your card.</div>
          </div>
        </div>
        <nav class="nav" aria-label="Example navigation" style="margin-top: var(--space-6)">
          <strong>${name}</strong>
          <a href="#" aria-current="page">Overview</a>
          <a href="#">Projects</a>
          <a href="#">Settings</a>
        </nav>
        <table style="margin-top: var(--space-6)">
          <thead><tr><th>Name</th><th>Status</th><th>Updated</th></tr></thead>
          <tbody>
            <tr><td>Landing page</td><td><span class="tag">Live</span></td><td>Today</td></tr>
            <tr><td>Pricing</td><td>Draft</td><td>Yesterday</td></tr>
            <tr><td>Docs</td><td>Review</td><td>Mon</td></tr>
          </tbody>
        </table>`;
}

function logoBlock(src: string | undefined): string {
  if (!src) return '';
  return `\n        <figure class="kit-logo"><img src="${escapeHtml(src)}" alt="Logo from the website"><figcaption>Logo from the website</figcaption></figure>`;
}

export function renderKitPage(input: { name: string; mode: 'light' | 'dark'; googleFontsUrl?: string; pending?: readonly KitGroup[]; logo?: string }): string {
  const name = escapeHtml(input.name);
  const pending = new Set(input.pending ?? []);
  const reading = pending.size > 0 ? '\n        <p class="kit-reading" role="status">Reading your sources. Each group fills in when a source is read.</p>' : '';
  const fonts = input.googleFontsUrl
    ? `\n    <link rel="preconnect" href="https://fonts.googleapis.com">\n    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>\n    <link rel="stylesheet" href="${escapeHtml(input.googleFontsUrl)}">`
    : '';
  const palettes = input.mode === 'dark' ? palette('Colors', '') : `${palette('Light', '')}\n${palette('Dark', ' dark')}`;
  const typeRows = [...REQUIRED_TOKENS.text]
    .reverse()
    .map((step) => `        <div class="type-row"><code>--text-${step}</code><span style="font-size: var(--text-${step})">The quick brown fox</span></div>`)
    .join('\n');
  const spaceRows = REQUIRED_TOKENS.space.map((step) => `        <div class="scale-row"><code>--space-${step}</code><div class="bar" style="width: var(--space-${step})"></div></div>`).join('\n');
  const radii = REQUIRED_TOKENS.radius.map((step) => `        <div class="box" style="border-radius: var(--radius-${step})">--radius-${step}</div>`).join('\n');
  const shadows = REQUIRED_TOKENS.shadow.map((step) => `        <div class="box" style="box-shadow: var(--shadow-${step}); border-radius: var(--radius-md)">--shadow-${step}</div>`).join('\n');
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${name} kit</title>${fonts}
    <link rel="stylesheet" href="design-system/tokens.css">
    <style>${STYLE}${pending.size > 0 ? PENDING_STYLE : ''}
    </style>
  </head>
  <body>
    <main class="kit">
      <header class="kit-head">
        <h1>${name}</h1>
        <p>Design system kit. Every value on this page comes from design-system/tokens.css.</p>${reading}${logoBlock(input.logo)}
      </header>
${section('Colors', 'colors', pending, `        <div class="palettes">\n${palettes}\n        </div>`)}
${section('Typography', 'type', pending, `        <div class="families">
          <div class="family" style="font-family: var(--font-display)"><code>--font-display</code><strong>Aa Display</strong></div>
          <div class="family" style="font-family: var(--font-body)"><code>--font-body</code><strong>Aa Body</strong></div>
          <div class="family" style="font-family: var(--font-mono)"><code>--font-mono</code><strong>Aa Mono</strong></div>
        </div>
${typeRows}`)}
${section('Spacing', 'spacing', pending, spaceRows)}
${section('Radius', 'radius', pending, `        <div class="boxes">\n${radii}\n        </div>`)}
${section('Elevation', 'radius', pending, `        <div class="boxes">\n${shadows}\n        </div>`)}
${section('Components', 'components', pending, components(name))}
    </main>
  </body>
</html>
`;
}
