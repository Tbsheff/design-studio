const SETTLE_MS = 120;
const BLOCK_STYLE = "width:max-content;min-width:200px;max-width:320px";

const PREVIEW_STYLE =
  "<style>html,body{margin:0;min-height:0!important;height:auto!important}#studio-preview{display:inline-block;padding:16px;max-width:640px;box-sizing:content-box}</style>";

const setupExpression = (
  pagePath: string,
  head: Record<string, string> | null
): string =>
  `(async () => {
    window.addEventListener('error', (event) => { window.__studioPreviewError = window.__studioPreviewError || event.message; });
    window.addEventListener('unhandledrejection', (event) => { window.__studioPreviewError = window.__studioPreviewError || String(event.reason && event.reason.message || event.reason); });
    let head = ${JSON.stringify(head)};
    if (!head) {
      let doc = null;
      try {
        const res = await fetch(${JSON.stringify(pagePath)}, { credentials: 'include', headers: { accept: 'text/html' } });
        doc = new DOMParser().parseFromString(await res.text(), 'text/html');
      } catch (error) {}
      const nodes = doc ? [...doc.querySelectorAll('link[rel="stylesheet"], head style')] : [];
      head = { html: nodes.map((node) => node.outerHTML).join(''), htmlClass: doc ? doc.documentElement.className : '', htmlStyle: doc ? doc.documentElement.getAttribute('style') || '' : '', bodyClass: doc ? doc.body.className : '' };
    }
    document.documentElement.className = head.htmlClass;
    document.documentElement.setAttribute('style', head.htmlStyle);
    document.head.innerHTML = '<meta charset="utf-8">' + head.html + ${JSON.stringify(PREVIEW_STYLE)};
    document.body.className = head.bodyClass;
    document.body.innerHTML = '';
    await Promise.all([...document.querySelectorAll('link[rel="stylesheet"]')].map((link) => link.sheet ? true : new Promise((resolve) => { link.onload = link.onerror = resolve; setTimeout(resolve, 8000); })));
    return head;
  })()`;

const renderExpression = (code: string): string =>
  `(async () => {
    const frames = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    if (window.__studioPreviewUnmount) { try { window.__studioPreviewUnmount(); } catch (error) {} }
    window.__studioPreviewUnmount = null;
    window.__studioPreviewError = null;
    document.body.innerHTML = '<div id="studio-preview"></div>';
    const script = document.createElement('script');
    script.textContent = ${JSON.stringify(code)};
    document.body.appendChild(script);
    await frames();
    await new Promise((resolve) => setTimeout(resolve, ${SETTLE_MS}));
    if (document.fonts) await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1500))]);
    const root = document.getElementById('studio-preview');
    const first = root.firstElementChild;
    if (first && !getComputedStyle(first).display.startsWith('inline')) {
      root.style.cssText = '${BLOCK_STYLE}';
      await frames();
    }
    const box = root.getBoundingClientRect();
    const empty = !first && !root.textContent.trim();
    return { error: window.__studioPreviewError, empty, x: box.left + window.scrollX, y: box.top + window.scrollY, width: box.width, height: box.height };
  })()`;

export { renderExpression, setupExpression };
