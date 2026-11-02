'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const en = require('../_locales/en/messages.json');
const pt = require('../_locales/pt_BR/messages.json');

function createBackground(language, response = { ok: true, json: async () => ({ choices: [{ message: { content: '# Summary' } }] }) }) {
  let listener;
  let sentBody;
  const catalog = language.startsWith('pt') ? pt : en;
  const chrome = {
    i18n: {
      getUILanguage: () => language,
      getMessage: (key, substitutions) => {
        let value = catalog[key]?.message || '';
        (Array.isArray(substitutions) ? substitutions : [substitutions]).forEach((x, i) => {
          value = value.replaceAll('$' + (i + 1), String(x));
        });
        return value;
      }
    },
    action: { onClicked: { addListener() {} } },
    runtime: {
      onInstalled: { addListener() {} },
      onMessage: { addListener(fn) { listener = fn; } },
      openOptionsPage() {}
    },
    storage: { local: { get: async () => ({ endpoint: 'https://ai.example/v1/chat', model: 'model', enabled: undefined }) } },
    permissions: { contains: async () => true }
  };
  const context = {
    chrome, URL, AbortController, setTimeout, clearTimeout,
    importScripts() { vm.runInNewContext(fs.readFileSync(require.resolve('../i18n.js'), 'utf8'), context); },
    fetch: async (_url, options) => { sentBody = JSON.parse(options.body); return response; }
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), context);
  return {
    body: () => sentBody,
    async send() {
      return new Promise(resolve => listener(
        { type: 'SIMPLIFY_README', url: 'https://github.com/owner/project', text: 'x'.repeat(80) },
        { tab: { url: 'https://github.com/owner/project' } }, resolve
      ));
    }
  };
}

test('outgoing AI prompt uses selected language and undefined enabled defaults to enabled', async () => {
  const enRun = createBackground('en-US');
  const enResult = await enRun.send();
  assert.equal(enResult.markdown, '# Summary');
  assert.match(enRun.body().messages[0].content, /Always write in English/);
  assert.match(enRun.body().messages[1].content, /^Repository: https:\/\/github.com\/owner\/project/);

  const ptRun = createBackground('pt-BR');
  const ptResult = await ptRun.send();
  assert.equal(ptResult.markdown, '# Summary');
  assert.match(ptRun.body().messages[0].content, /português brasileiro/);
  assert.match(ptRun.body().messages[1].content, /^Repositório: https:\/\/github.com\/owner\/project/);
});

test('API authorization, rate limit, and general failures are localized', async t => {
  for (const [status, key] of [[401, 'apiAuthError'], [429, 'apiRateError'], [500, 'apiHttpError']]) {
    await t.test(`HTTP ${status}`, async () => {
      const response = { ok: false, status };
      const runner = createBackground('en', response);
      const result = await runner.send();
      assert.match(result.error, status === 429 ? /credits reached/ : /API HTTP/);
      assert.equal(result.error, status === 429 ? en[key].message : en[key].message.replace('$1', String(status)));
    });
  }
});

test('connection failures return a localized message instead of browser error text', async () => {
  const contextResult = await (async () => {
    let listener;
    const catalog = pt;
    const chrome = {
      i18n: {
        getUILanguage: () => 'pt-BR',
        getMessage: key => catalog[key]?.message || ''
      },
      action: { onClicked: { addListener() {} } },
      runtime: { onInstalled: { addListener() {} }, onMessage: { addListener(fn) { listener = fn; } } },
      storage: { local: { get: async () => ({ endpoint: 'https://ai.example/v1/chat', model: 'model' }) } },
      permissions: { contains: async () => true }
    };
    const context = {
      chrome, URL, AbortController, setTimeout, clearTimeout,
      importScripts() { vm.runInNewContext(fs.readFileSync(require.resolve('../i18n.js'), 'utf8'), context); },
      fetch: async () => { throw new TypeError('Failed to fetch'); }
    };
    vm.runInNewContext(fs.readFileSync(require.resolve('../background.js'), 'utf8'), context);
    return new Promise(resolve => listener(
      { type: 'SIMPLIFY_README', url: 'https://github.com/owner/project', text: 'x'.repeat(80) },
      { tab: { url: 'https://github.com/owner/project' } }, resolve
    ));
  })();
  assert.equal(contextResult.error, pt.apiNetworkError.message);
});
