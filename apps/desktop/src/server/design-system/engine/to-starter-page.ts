interface StarterPageSource {
  readonly googleFontsUrl: string | null;
  readonly packName: string;
  readonly title: string;
}

const SAFE_FONTS_URL = /^https:\/\/fonts\.googleapis\.com\/[^\s"'()<>]+$/u;

const toEscapedText = (text: string): string =>
  text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

const toFontImport = (url: string | null): string => {
  if (url === null || !SAFE_FONTS_URL.test(url)) {
    return "";
  }

  return `\n      @import url("${url}");`;
};

const STARTER_STYLE = `
      * { box-sizing: border-box; }
      body { margin: 0; background: var(--bg, #ffffff); color: var(--fg, #111111); font-family: var(--font-body, system-ui, sans-serif); font-size: var(--text-base, 16px); line-height: 1.5; }
      main { max-width: 1040px; margin: 0 auto; padding: var(--space-12, 48px) var(--space-6, 24px); display: grid; gap: var(--space-10, 40px); }
      .hero { display: grid; gap: var(--space-4, 16px); }
      .badge { justify-self: start; padding: var(--space-1, 4px) var(--space-3, 12px); border-radius: var(--radius-pill, 999px); background: var(--accent, #eeeeee); color: var(--accent-fg, #111111); font-size: var(--text-xs, 12px); font-weight: 600; }
      h1 { margin: 0; font-family: var(--font-display, inherit); font-size: var(--text-4xl, 40px); line-height: 1.1; }
      .lead { margin: 0; max-width: 60ch; color: var(--fg-muted, #555555); font-size: var(--text-lg, 18px); }
      .actions { display: flex; flex-wrap: wrap; gap: var(--space-3, 12px); }
      .button { padding: var(--space-3, 12px) var(--space-5, 20px); border: 1px solid transparent; border-radius: var(--radius-md, 8px); font: inherit; font-weight: 600; cursor: pointer; }
      .button-primary { background: var(--primary, #111111); color: var(--primary-fg, #ffffff); }
      .button-secondary { background: transparent; color: var(--fg, #111111); border-color: var(--border, #dddddd); }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: var(--space-4, 16px); }
      .card { display: grid; gap: var(--space-2, 8px); padding: var(--space-6, 24px); background: var(--surface, #fafafa); border: 1px solid var(--border, #dddddd); border-radius: var(--radius-lg, 12px); box-shadow: var(--shadow-sm, none); }
      .card h2 { margin: 0; font-family: var(--font-display, inherit); font-size: var(--text-xl, 20px); }
      .card p { margin: 0; color: var(--fg-muted, #555555); }
    `;

const toStarterPage = (source: StarterPageSource): string => {
  const title = toEscapedText(source.title);
  const packName = toEscapedText(source.packName);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${title}</title>
    <link rel="stylesheet" href="design-system/tokens.css">
    <style>${toFontImport(source.googleFontsUrl)}${STARTER_STYLE}</style>
  </head>
  <body>
    <main>
      <section class="hero">
        <span class="badge">${packName}</span>
        <h1>${title}</h1>
        <p class="lead">A starter page that uses the ${packName} design system tokens. Replace it with your design.</p>
        <div class="actions">
          <button class="button button-primary" type="button">Get started</button>
          <button class="button button-secondary" type="button">Learn more</button>
        </div>
      </section>
      <section class="cards">
        <article class="card"><h2>Colors</h2><p>Page, surface, text and brand colors come from the tokens.</p></article>
        <article class="card"><h2>Type</h2><p>Headings use the display font. Body text uses the body font.</p></article>
        <article class="card"><h2>Shape</h2><p>Radius, spacing and shadow come from the same token set.</p></article>
      </section>
    </main>
  </body>
</html>
`;
};

export { toStarterPage };

export type { StarterPageSource };
