'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../content.js'), 'utf8');
const original = 'Original README documentation, long enough to offer a summary without changing the original.';

function createPage(enabled = true, autoGenerate) {
  const elements = [];
  class Element {
    constructor() {
      this.children = [];
      this.listeners = {};
      this.isConnected = true;
      this.textContent = '';
      this.innerHTML = '';
      elements.push(this);
    }
    append(...children) { this.children.push(...children); }
    replaceChildren(...children) { this.children = children; }
    before() {}
    remove() { this.isConnected = false; }
    addEventListener(event, handler) { this.listeners[event] = handler; }
    setAttribute(key, value) { this[key] = value; }
    click() { if (!this.disabled) this.listeners.click?.(); }
  }
  let article = new Element();
  article.innerText = original;
  article.innerHTML = '<p>' + original + '</p>';
  const events = {};
  const timers = new Map();
  const requests = [];
  let storageChange;
  let mutation;
  let timerId = 0;
  const location = { origin: 'https://github.com', pathname: '/owner/project' };
  const chrome = {
    storage: {
      local: { get(_keys, callback) { callback({ enabled, autoGenerate }); } },
      onChanged: { addListener(fn) { storageChange = fn; } }
    },
    runtime: { sendMessage(message, callback) { requests.push({ message, callback }); } }
  };
  vm.runInNewContext(source, {
    chrome, location, RepoLensI18n: { message: key => key },
    document: {
      querySelector: () => article,
      createElement: () => new Element(),
      createTextNode: textContent => ({ textContent }),
      addEventListener: (event, handler) => { events[event] = handler; },
      documentElement: {}
    },
    window: { addEventListener: (event, handler) => { events[event] = handler; } },
    MutationObserver: class { constructor(handler) { mutation = handler; } observe() {} },
    setTimeout(handler) { timers.set(++timerId, handler); return timerId; },
    clearTimeout(id) { timers.delete(id); }
  });
  return {
    get article() { return article; }, requests, location, chrome,
    replaceArticle() {
      article.isConnected = false;
      article = new Element();
      article.innerText = original;
      article.innerHTML = '<p>' + original + '</p>';
    },
    get toolbar() { return elements.findLast(el => el.className === 'gsl-toolbar' && el.isConnected); },
    get toggle() { return this.toolbar.children[1]; },
    get reload() { return this.toolbar.children[2]; },
    get hint() { return this.toolbar.children[0].children[1]; },
    get mode() { return this.toolbar.children[0].children[0].children[1]; },
    event: name => events[name](),
    mutate: () => mutation(),
    enabled(value) { storageChange({ enabled: { newValue: value } }, 'local'); },
    autoGenerate(value) { storageChange({ autoGenerate: { newValue: value } }, 'local'); },
    flush() { const pending = [...timers.values()]; timers.clear(); pending.forEach(fn => fn()); }
  };
}

test('opening, refreshing, navigation, DOM changes and re-enabling never request a summary', () => {
  for (let refresh = 0; refresh < 2; refresh++) {
    const page = createPage();
    assert.equal(page.toggle.textContent, 'generateSummary');
    assert.equal(page.reload.hidden, true);
    assert.equal(page.article.innerHTML, '<p>' + original + '</p>');
    assert.equal(page.article.children.length, 0);
    page.event('turbo:load');
    page.flush();
    page.event('popstate');
    page.flush();
    page.mutate();
    page.flush();
    page.location.pathname = '/owner/another';
    page.event('turbo:load');
    page.flush();
    page.enabled(false);
    page.flush();
    page.enabled(true);
    page.flush();
    assert.equal(page.requests.length, 0);
  }
  assert.equal(createPage(false).toolbar, undefined);
});

test('automatic generation is opt-in and runs once per prepared page, not per rescan', () => {
  assert.equal(createPage(true, false).requests.length, 0);
  assert.equal(createPage(true, 'true').requests.length, 0);
  assert.equal(createPage(false, true).requests.length, 0);
  const page = createPage(true, true);
  assert.equal(page.requests.length, 1);
  for (const event of ['turbo:load', 'popstate']) { page.event(event); page.flush(); }
  page.mutate();
  page.flush();
  assert.equal(page.requests.length, 1);
  page.requests[0].callback({ markdown: '# Summary' });
  page.mutate();
  page.flush();
  assert.equal(page.requests.length, 1);
  page.replaceArticle();
  page.mutate();
  page.flush();
  assert.equal(page.requests.length, 1);
  page.enabled(false);
  page.flush();
  page.enabled(true);
  page.flush();
  assert.equal(page.requests.length, 1);
  assert.equal(createPage(true, true).requests.length, 1); // A real page reload may generate again.
});

test('changing automatic preference only affects future pages or navigations', () => {
  const page = createPage();
  page.autoGenerate(true);
  page.mutate();
  page.flush();
  assert.equal(page.requests.length, 0);
  page.location.pathname = '/owner/another';
  page.event('turbo:load');
  page.flush();
  assert.equal(page.requests.length, 1);
  page.autoGenerate(false);
  page.location.pathname = '/owner/manual';
  page.event('turbo:load');
  page.flush();
  assert.equal(page.requests.length, 1);
});

test('only explicit generation and regeneration send requests; toggles reuse the summary', () => {
  const page = createPage();
  page.toggle.click();
  assert.equal(page.requests.length, 1);
  assert.equal(page.requests[0].message.text, original);
  assert.equal(page.requests[0].message.type, 'SIMPLIFY_README');
  assert.equal(page.reload.disabled, true);
  page.reload.click();
  page.toggle.click(); // Return to the original while the request is pending.
  assert.equal(page.toggle.disabled, true);
  page.toggle.click();
  assert.equal(page.requests.length, 1);
  page.requests[0].callback({ markdown: '# Summary' });
  assert.equal(page.toggle.textContent, 'showSummary');
  page.toggle.click();
  const summary = page.article.children[0];
  page.toggle.click();
  page.toggle.click();
  assert.equal(page.article.children[0], summary);
  assert.equal(page.requests.length, 1);
  page.reload.click();
  assert.equal(page.requests.length, 2);
  page.requests[1].callback({ markdown: '# New summary' });
  assert.notEqual(page.article.children[0], summary);
});

for (const [name, response] of [['API error', { error: 'Try again later' }], ['empty response', {}]]) {
  test(`${name} offers explicit retry without automatic requests`, () => {
    const page = createPage();
    page.toggle.click();
    page.requests[0].callback(response);
    assert.equal(page.article.children[0].role, 'alert');
    assert.equal(page.reload.disabled, false);
    page.mutate();
    page.flush();
    assert.equal(page.requests.length, 1);
    page.toggle.click();
    assert.equal(page.toggle.textContent, 'retrySummary');
    page.toggle.click();
    assert.equal(page.requests.length, 2);
  });
}

test('reading panel exposes original, loading, summary and error states', () => {
  const page = createPage();
  assert.equal(page.mode.textContent, 'originalMode');
  assert.equal(page.hint.textContent, 'manualSummaryHint');
  assert.equal(page.article['aria-busy'], 'false');
  page.toggle.click();
  assert.equal(page.mode.textContent, 'generating');
  assert.equal(page.hint.textContent, 'loadingSummaryHint');
  assert.equal(page.article['aria-busy'], 'true');
  page.requests[0].callback({ markdown: '# Clear explanation' });
  assert.equal(page.mode.textContent, 'summaryMode');
  assert.equal(page.hint.textContent, 'summaryReadyHint');
  assert.equal(page.article['aria-busy'], 'false');
  const summary = page.article.children[0];
  assert.equal(summary.role, 'region');
  assert.equal(summary['aria-label'], 'summaryMode');
  assert.equal(summary.children.at(-1).textContent, 'summaryDisclaimer');
  assert.equal(summary.children.some(el => el.className === 'gsl-summary-warning'), false);
  page.reload.click();
  page.requests[1].callback({ error: 'Provider unavailable' });
  assert.equal(page.mode.textContent, 'summaryFailed');
  assert.equal(page.hint.textContent, 'Provider unavailable');
  assert.equal(page.toolbar['data-state'], 'error');
  assert.equal(page.reload.textContent, 'retrySummary');
  assert.equal(page.article['aria-busy'], 'false');
});

test('a failed pending request keeps the original visible and offers retry', () => {
  const page = createPage();
  page.toggle.click();
  page.toggle.click();
  assert.equal(page.article['aria-busy'], 'false');
  const childrenBeforeResponse = page.article.children;
  page.requests[0].callback({ error: 'Provider unavailable' });
  assert.equal(page.article.innerHTML, '<p>' + original + '</p>');
  assert.equal(page.article.children, childrenBeforeResponse);
  assert.equal(page.hint.textContent, 'Provider unavailable');
  assert.equal(page.toggle.textContent, 'retrySummary');
  assert.equal(page.reload.hidden, true);
  page.toggle.click();
  assert.equal(page.requests.length, 2);
  assert.equal(page.mode.textContent, 'generating');
});

test('truncated summaries disclose incomplete source coverage', () => {
  const page = createPage();
  page.toggle.click();
  page.requests[0].callback({ markdown: '# Partial explanation', truncated: true });
  const summary = page.article.children[0];
  assert.equal(summary.children.at(-1).className, 'gsl-summary-warning');
  assert.equal(summary.children.at(-1).textContent, 'summaryTruncatedHint');
  page.toggle.click();
  page.toggle.click();
  assert.equal(page.article.children[0], summary);
  assert.equal(page.requests.length, 1);
});
