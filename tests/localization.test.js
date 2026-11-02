'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

const en = require('../_locales/en/messages.json');
const pt = require('../_locales/pt_BR/messages.json');
const i18nSource = fs.readFileSync(require.resolve('../i18n.js'), 'utf8');

function loadI18n(language) {
  const catalog = language.toLowerCase().startsWith('pt') ? pt : en;
  const chrome = {
    i18n: {
      getUILanguage: () => language,
      getMessage: (key, substitutions) => {
        let message = catalog[key]?.message || '';
        const values = Array.isArray(substitutions) ? substitutions : [substitutions];
        values.forEach((value, i) => { message = message.replaceAll('$' + (i + 1), value); });
        return message;
      }
    }
  };
  const context = { chrome };
  vm.runInNewContext(i18nSource, context);
  return context.RepoLensI18n;
}

test('locale selection uses Chrome UI language and defaults every non-Portuguese locale to English', () => {
  assert.equal(loadI18n('pt-BR').locale(), 'pt_BR');
  assert.equal(loadI18n('pt-PT').locale(), 'pt_BR');
  assert.equal(loadI18n('en-US').locale(), 'en');
  assert.equal(loadI18n('fr').locale(), 'en');
});

test('locale catalogs have identical keys and localized options/content text', () => {
  assert.deepEqual(require('../_locales/pt_PT/messages.json'), pt);
  assert.deepEqual(Object.keys(en).sort(), Object.keys(pt).sort());
  assert.equal(loadI18n('en').message('saveButton'), 'Save and allow access to provider');
  assert.equal(loadI18n('pt-BR').message('saveButton'), 'Salvar e permitir acesso ao provedor');
  assert.equal(loadI18n('en').message('showOriginal'), 'View original README');
  assert.equal(loadI18n('pt-BR').message('showOriginal'), 'Ver README original');
});

test('manifest translations and requested icon paths are configured', () => {
  const manifest = require('../manifest.json');
  assert.equal(manifest.version, '1.1.0');
  assert.equal(manifest.default_locale, 'en');
  assert.equal(manifest.name, '__MSG_extensionName__');
  assert.equal(manifest.description, '__MSG_extensionDescription__');
  assert.equal(manifest.action.default_title, '__MSG_actionTitle__');
  for (const size of [16, 32, 48, 128]) assert.equal(manifest.icons[size], `icons/icon-${size}.png`);
});

test('content renderer inserts model output as text and never assigns it as HTML', () => {
  const source = fs.readFileSync(require.resolve('../content.js'), 'utf8');
  assert.match(source, /el\.textContent\s*=\s*match\[2\]\s*\|\|\s*match\[3\]/);
  assert.match(source, /document\.createTextNode\(line\.slice/);
  assert.doesNotMatch(source, /innerHTML\s*=\s*state\.markdown/);
});
