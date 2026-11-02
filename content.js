'use strict';
(() => {
  let config = { enabled: true, autoGenerate: false };
  let state = null;
  let lastAutoUrl = null;
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
    state.toolbar.setAttribute('data-state', state.loading ? 'loading' : state.error ? 'error' : state.phase);
    state.article.setAttribute('aria-busy', String(state.loading && state.phase !== 'original'));
    state.mode.textContent = RepoLensI18n.message(state.loading ? 'generating' : state.error ? 'summaryFailed' : state.phase === 'simple' ? 'summaryMode' : 'originalMode');
    state.hint.textContent = state.error || RepoLensI18n.message(state.loading ? 'loadingSummaryHint' : state.markdown ? 'summaryReadyHint' : config.autoGenerate ? 'autoSummaryHint' : 'manualSummaryHint');
    state.toggle.textContent = state.phase === 'original'
      ? RepoLensI18n.message(state.markdown ? 'showSummary' : state.loading ? 'generating' : state.error ? 'retrySummary' : 'generateSummary')
      : RepoLensI18n.message('showOriginal');
    state.toggle.disabled = state.phase === 'original' && state.loading;
    state.reload.hidden = !state.markdown && state.phase === 'original';
    state.reload.disabled = state.loading;
    state.reload.textContent = RepoLensI18n.message(state.loading ? 'generating' : state.error ? 'retrySummary' : 'generateAgain');
  }

  function showOriginal() {
    if (!state) return;
    state.article.innerHTML = state.originalHTML;
    state.phase = 'original';
    updateToolbar();
  }

  function showSummary() {
    if (!state || !state.markdown) return;
    if (!state.summary) {
      state.summary = renderMarkdown(state.markdown);
      state.summary.setAttribute('role', 'region');
      state.summary.setAttribute('aria-label', RepoLensI18n.message('summaryMode'));
      const note = document.createElement('p');
      note.className = 'gsl-summary-note';
      note.textContent = RepoLensI18n.message('summaryDisclaimer');
      state.summary.append(note);
      if (state.truncated) {
        const warning = document.createElement('p');
        warning.className = 'gsl-summary-warning';
        warning.textContent = RepoLensI18n.message('summaryTruncatedHint');
        state.summary.append(warning);
      }
    }
    state.article.replaceChildren(state.summary);
    state.phase = 'simple';
    updateToolbar();
  }

  function showStatus(message, isError = false) {
    if (!state) return;
    const box = document.createElement('div');
    box.className = isError ? 'gsl-status gsl-error' : 'gsl-status';
    box.setAttribute('role', isError ? 'alert' : 'status');
    box.textContent = message;
    state.article.replaceChildren(box);
  }

  function generate(target) {
    if (target.loading) return;
    target.loading = true;
    target.error = '';
    target.markdown = '';
    target.summary = null;
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
        target.error = RepoLensI18n.message('communicationError');
      } else if (response?.error) {
        target.error = response.error;
      } else if (response?.markdown) {
        target.markdown = response.markdown;
        target.truncated = Boolean(response.truncated);
        if (target.phase !== 'original') showSummary();
      } else {
        target.error = RepoLensI18n.message('emptySummary');
      }
      if (target.error && target.phase !== 'original') showStatus(target.error, true);
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
    toolbar.setAttribute('role', 'region');
    toolbar.setAttribute('aria-label', RepoLensI18n.message('toolbarBrand'));
    const label = document.createElement('div');
    label.className = 'gsl-label';
    const brand = document.createElement('span');
    brand.className = 'gsl-brand';
    brand.textContent = RepoLensI18n.message('toolbarBrand');
    const toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.className = 'gsl-toggle';
    const reload = document.createElement('button');
    reload.type = 'button';
    reload.className = 'gsl-reload';
    const mode = document.createElement('span');
    mode.className = 'gsl-mode';
    const heading = document.createElement('div');
    heading.className = 'gsl-heading';
    heading.append(brand, mode);
    const hint = document.createElement('span');
    hint.className = 'gsl-hint';
    hint.setAttribute('aria-live', 'polite');
    label.append(heading, hint);
    toolbar.append(label, toggle, reload);
    article.before(toolbar);
    state = {
      url: location.origin + location.pathname,
      article,
      toolbar,
      mode,
      hint,
      toggle,
      reload,
      originalHTML: article.innerHTML,
      originalText,
      markdown: '',
      phase: 'original',
      loading: false,
      error: '',
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
    updateToolbar();
    if (config.autoGenerate && lastAutoUrl !== state.url) {
      lastAutoUrl = state.url;
      generate(state);
    }
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

  chrome.storage.local.get(['enabled', 'autoGenerate'], result => {
    config = { enabled: result.enabled !== false, autoGenerate: result.autoGenerate === true };
    scan();
  });
  chrome.storage.onChanged.addListener((changes, namespace) => {
    if (namespace !== 'local') return;
    // Alterar a preferência não autoriza uma nova chamada na página atual.
    if (changes.autoGenerate) config.autoGenerate = changes.autoGenerate.newValue === true;
    if (changes.enabled) {
      config.enabled = changes.enabled.newValue;
      scheduleScan();
    }
  });
  document.addEventListener('turbo:load', scheduleScan);
  window.addEventListener('popstate', scheduleScan);
  new MutationObserver(scheduleScan).observe(document.documentElement, { childList: true, subtree: true });
})();
