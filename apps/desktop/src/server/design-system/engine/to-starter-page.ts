import type { StarterRoles } from "./to-starter-roles.js";

interface StarterPageSource {
  readonly googleFontsUrl: string | null;
  readonly packName: string;
  readonly roles: StarterRoles | null;
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

const toRef = (
  roles: StarterRoles | null,
  role: string,
  fallback: string
): string => roles?.get(role) ?? `var(--${role}, ${fallback})`;

const toStarterStyle = (roles: StarterRoles | null): string => `
      * { box-sizing: border-box; }
      body { margin: 0; background: ${toRef(roles, "bg", "#ffffff")}; color: ${toRef(roles, "fg", "#111111")}; font-family: ${toRef(roles, "font-body", "system-ui, sans-serif")}; font-size: var(--text-base, 16px); line-height: 1.5; }
      main { max-width: 1040px; margin: 0 auto; padding: ${toRef(roles, "space-12", "48px")} ${toRef(roles, "space-6", "24px")}; display: grid; gap: ${toRef(roles, "space-10", "40px")}; }
      .hero { display: grid; gap: ${toRef(roles, "space-4", "16px")}; }
      .badge { justify-self: start; padding: ${toRef(roles, "space-1", "4px")} ${toRef(roles, "space-3", "12px")}; border-radius: var(--radius-pill, 999px); background: ${toRef(roles, "accent", "#eeeeee")}; color: ${toRef(roles, "accent-fg", "#111111")}; font-size: var(--text-xs, 12px); font-weight: 600; }
      h1 { margin: 0; font-family: ${toRef(roles, "font-display", "inherit")}; font-size: var(--text-4xl, 40px); line-height: 1.1; }
      .lead { margin: 0; max-width: 60ch; color: ${toRef(roles, "fg-muted", "#555555")}; font-size: var(--text-lg, 18px); }
      .actions { display: flex; flex-wrap: wrap; gap: ${toRef(roles, "space-3", "12px")}; }
      .button { padding: ${toRef(roles, "space-3", "12px")} ${toRef(roles, "space-5", "20px")}; border: 1px solid transparent; border-radius: ${toRef(roles, "radius-md", "8px")}; font: inherit; font-weight: 600; cursor: pointer; }
      .button-primary { background: ${toRef(roles, "primary", "#111111")}; color: ${toRef(roles, "primary-fg", "#ffffff")}; }
      .button-secondary { background: transparent; color: ${toRef(roles, "fg", "#111111")}; border-color: ${toRef(roles, "border", "#dddddd")}; }
      .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: ${toRef(roles, "space-4", "16px")}; }
      .card { display: grid; gap: ${toRef(roles, "space-2", "8px")}; padding: ${toRef(roles, "space-6", "24px")}; background: ${toRef(roles, "surface", "#fafafa")}; border: 1px solid ${toRef(roles, "border", "#dddddd")}; border-radius: ${toRef(roles, "radius-lg", "12px")}; box-shadow: var(--shadow-sm, none); }
      .card h2 { margin: 0; font-family: ${toRef(roles, "font-display", "inherit")}; font-size: var(--text-xl, 20px); }
      .card p { margin: 0; color: ${toRef(roles, "fg-muted", "#555555")}; }
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
    <style>${toFontImport(source.googleFontsUrl)}${toStarterStyle(source.roles)}</style>
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
