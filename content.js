'use strict';
(() => {
  const IGNORE = Symbol('ignore');
  let config = { enabled: true };
  let state = null;
  let scanTimer;

  function isRepoRoot() {
    return /^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(location.pathname);
  }

  function findArticle() {
    if (!isRepoRoot()) return null;
    // O GitHub também apresenta READMEs em contêineres sem #readme.
    // A página já foi restringida à raiz do repositório por isRepoRoot().
    return document.querySelector([
      '#readme article.markdown-body',
      '[data-testid="readme"] article.markdown-body',
      'main article.markdown-body.entry-content[itemprop="text"]',
      'article.markdown-body.entry-content[itemprop="text"]'
    ].join(', '));
  }

  function escapeLikeInlineMarkup(target, line) {
    // Interpreta apenas negrito e código, sem inserir HTML retornado pela IA.
    const regex = /(\*\*([^*]+)\*\*|`([^`]+)`)/g;
    let pos = 0, match;
    while ((match = regex.exec(line))) {
      if (match.index > pos) target.append(document.createTextNode(line.slice(pos, match.index)));
      const el = document.createElement(match[2] ? 'strong' : 'code');
      el.textContent = match[2] || match[3];
      target.append(el);
      pos = regex.lastIndex;
    }
    if (pos < line.length) target.append(document.createTextNode(line.slice(pos)));
  }

  function renderMarkdown(markdown) {
    const root = document.createElement('div');
    root.className = 'gsl-resumo';
    const listLines = markdown.replace(/\r/g, '').split('\n');
    let list = null;
    for (const raw of listLines) {
      const line = raw.trim();
      if (!line || /^```/.test(line)) { list = null; continue; }
      const heading = /^(#{1,4})\s+(.+)$/.exec(line);
      if (heading) {
        list = null;
        const el = document.createElement('h' + Math.min(heading[1].length, 3));
        escapeLikeInlineMarkup(el, heading[2]);
        root.append(el);
        continue;
      }
      const bullet = /^[-*]\s+(.+)$/.exec(line);
      if (bullet) {
        if (!list) { list = document.createElement('ul'); root.append(list); }
        const li = document.createElement('li');
        escapeLikeInlineMarkup(li, bullet[1]);
        list.append(li);
        continue;
      }
      list = null;
      const p = document.createElement('p');
      escapeLikeInlineMarkup(p, line);
      root.append(p);
    }
    return root;
  }

  function updateToolbar() {
    if (!state) return;
    state.toggle.textContent = state.phase === 'original'
      ? (state.markdown ? RepoLensI18n.message('showSummary') : RepoLensI18n.message('summaryGenerating'))
      : RepoLensI18n.message('showOriginal');
    state.reload.disabled = state.loading;
    state.reload.textContent = state.loading ? RepoLensI18n.message('generating') : RepoLensI18n.message('generateAgain');
  }

  function showOriginal() {
    if (!state) return;
    state.article.innerHTML = state.originalHTML;
    state.phase = 'original';
    updateToolbar();
  }

  function showSummary() {
    if (!state || !state.markdown) return;
    state.article.replaceChildren(renderMarkdown(state.markdown));
    state.phase = 'simple';
    updateToolbar();
  }

  function showStatus(message, isError = false) {
    if (!state) return;
    const box = document.createElement('div');
    box.className = isError ? 'gsl-status gsl-error' : 'gsl-status';
    box.textContent = message;
    state.article.replaceChildren(box);
  }

  function generate(target) {
    if (target.loading) return;
    target.loading = true;
    target.markdown = '';
    target.phase = 'loading';
    showStatus(RepoLensI18n.message('preparing'));
    updateToolbar();
    chrome.runtime.sendMessage({
      type: 'SIMPLIFY_README',
      url: target.url,
      text: target.originalText
    }, response => {
      if (state !== target) return;
      target.loading = false;
      if (chrome.runtime.lastError) {
        showStatus(RepoLensI18n.message('communicationError'), true);
      } else if (response?.error) {
        showStatus(response.error, true);
      } else if (response?.markdown) {
        target.markdown = response.markdown;
        target.truncated = Boolean(response.truncated);
        if (target.phase !== 'original') showSummary();
      } else {
        showStatus(RepoLensI18n.message('emptySummary'), true);
      }
      updateToolbar();
    });
  }

  function prepare(article) {
    if (state?.article === article && state.url === location.origin + location.pathname) return;
    if (state?.toolbar?.isConnected) state.toolbar.remove();
    const originalText = article.innerText || article.textContent || '';
    if (originalText.trim().length < 40) return;
    const toolbar = document.createElement('div');
    toolbar.className = 'gsl-toolbar';
    const label = document.createElement('span');
    label.textContent = RepoLensI18n.message('toolbarBrand');
    label.className = 'gsl-label';
    const toggle = document.createElement('button');
    toggle.type = 'button';
    const reload = document.createElement('button');
    reload.type = 'button';
    toolbar.append(label, toggle, reload);
    article.before(toolbar);
    state = {
      url: location.origin + location.pathname,
      article,
      toolbar,
      toggle,
      reload,
      originalHTML: article.innerHTML,
      originalText,
      markdown: '',
      phase: 'loading',
      loading: false,
      truncated: false
    };
    toggle.addEventListener('click', () => {
      if (state?.article !== article) return;
      if (state.phase === 'original') {
        if (state.markdown) showSummary();
        else if (!state.loading) generate(state);
      } else showOriginal();
    });
    reload.addEventListener('click', () => {
      if (state?.article === article) generate(state);
    });
    generate(state);
  }

  function scan() {
    clearTimeout(scanTimer);
    if (!config.enabled) {
      if (state && state.article?.isConnected) showOriginal();
      state?.toolbar?.remove();
      state = null;
      return;
    }
    const article = findArticle();
    if (article) prepare(article);
  }

  function scheduleScan() {
    clearTimeout(scanTimer);
    scanTimer = setTimeout(scan, 250);
  }

  chrome.storage.local.get(['enabled'], result => {
    config = { enabled: result.enabled !== false };
    scan();
  });
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace === 'local' && changes.enabled) {
      config.enabled = changes.enabled.newValue;
      scheduleScan();
    }
  });
  document.addEventListener('turbo:load', scheduleScan);
  window.addEventListener('popstate', scheduleScan);
  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
})();
