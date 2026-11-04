import type { RemoteComment } from "@design-studio/actions/publish-remote";

export function escapeHtml(text: string): string {
  return text.replaceAll(/[&<>"']/g, (ch) => `&#${ch.charCodeAt(0)};`);
}

const STYLE = `:root{color-scheme:light dark;--bg:#faf9f5;--panel:#fff;--line:rgb(28 27 25 / .12);--text:rgb(28 27 25 / .94);--muted:rgb(28 27 25 / .66);--accent:#c96442}
@media (prefers-color-scheme:dark){:root{--bg:#1c1b19;--panel:#222220;--line:rgb(250 249 245 / .12);--text:rgb(250 249 245 / .92);--muted:rgb(250 249 245 / .6)}}
*{box-sizing:border-box}body{margin:0;min-height:100vh;font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",system-ui,sans-serif;background:var(--bg);color:var(--text)}
main{max-width:520px;margin:0 auto;padding:48px 24px}h1{font-size:16px;margin:0 0 8px}p{margin:0 0 12px;color:var(--muted)}
form{display:flex;flex-direction:column;gap:8px;margin:16px 0}label{display:flex;flex-direction:column;gap:4px;font-size:13px}
input,textarea{font:inherit;padding:8px 10px;border:1px solid var(--line);border-radius:8px;background:var(--panel);color:var(--text)}textarea{min-height:96px;resize:vertical}
button{align-self:flex-start;font:inherit;font-weight:600;padding:6px 14px;border:0;border-radius:8px;background:var(--accent);color:#fff;cursor:pointer}
.err{color:#d14343}ol{list-style:none;margin:16px 0 0;padding:0;display:flex;flex-direction:column;gap:8px}
li{padding:10px 12px;border:1px solid var(--line);border-radius:8px;background:var(--panel)}li p{margin:4px 0 0;color:var(--text);white-space:pre-wrap;overflow-wrap:anywhere}
.who{font-weight:600}.when{color:var(--muted);font-size:12px;margin-left:6px}a{color:inherit}`;

function shell(title: string, body: string): string {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="referrer" content="no-referrer"><link rel="icon" href="data:,"><title>${escapeHtml(title)}</title><style>${STYLE}</style></head><body><main>${body}</main></body></html>`;
}

function html(
  status: number,
  text: string,
  extra: Record<string, string> = {}
): Response {
  return new Response(text, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/html; charset=utf-8",
      ...extra,
    },
    status,
  });
}

export function messagePage(
  status: number,
  heading: string,
  text: string
): Response {
  return html(
    status,
    shell(heading, `<h1>${escapeHtml(heading)}</h1><p>${escapeHtml(text)}</p>`)
  );
}

export function gatePage(
  title: string,
  action: string,
  error: string | null,
  status = 401
): Response {
  const err = error
    ? `<p class="err" role="alert">${escapeHtml(error)}</p>`
    : "";

  const body = `<h1>${escapeHtml(title)}</h1><p>This design needs a password. Ask the owner for it.</p>${err}<form method="post" action="${escapeHtml(action)}"><label>Password<input type="password" name="password" autocomplete="current-password" required autofocus maxlength="128"></label><button type="submit">Open design</button></form>`;

  return html(status, shell(title, body));
}

export interface CommentsPageInput {
  title: string;
  designHref: string;
  action: string;
  comments: RemoteComment[];
  error: string | null;
  sent: boolean;
}

export function commentsPage(input: CommentsPageInput, status = 200): Response {
  const list = input.comments
    .map(
      (c) =>
        `<li><span class="who">${escapeHtml(c.author)}</span><span class="when">${new Date(c.createdAt).toISOString().slice(0, 10)}</span><p>${escapeHtml(c.body)}</p></li>`
    )
    .join("");

  const note = input.error
    ? `<p class="err" role="alert">${escapeHtml(input.error)}</p>`
    : input.sent
      ? '<p role="status">Thanks. The owner can see your comment now.</p>'
      : "";

  const body = `<h1>Comments on ${escapeHtml(input.title)}</h1><p><a href="${escapeHtml(input.designHref)}">Back to the design</a></p>${note}<form method="post" action="${escapeHtml(input.action)}"><label>Your name<input name="author" required maxlength="60"></label><label>Comment<textarea name="body" required maxlength="2000"></textarea></label><button type="submit">Send comment</button></form><ol>${list}</ol>`;

  return html(status, shell(`Comments on ${input.title}`, body));
}
