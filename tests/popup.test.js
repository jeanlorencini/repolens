'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('../popup.js'), 'utf8');

async function createPopup(store = {}, failures = {}) {
  const elements = Object.fromEntries(['auto-generate', 'status', 'provider-settings', 'extension-disabled', 'current-mode'].map(id => [id, {
    checked: false, disabled: true, hidden: true, dataset: {}, listeners: {},
    addEventListener(name, callback) { this.listeners[name] = callback; }
  }]));
  const writes = [];
  let opened = 0;
  const chrome = {
    i18n: {},
    storage: { local: {
      async get() {
        if (failures.beforeGet) failures.beforeGet(elements);
        if (failures.get) throw new Error('Storage read failed');
        return { ...store };
      },
      async set(value) {
        writes.push(value);
        if (failures.set) throw new Error('Storage write failed');
        Object.assign(store, value);
      }
    } },
    runtime: { async openOptionsPage() {
      opened++;
      if (failures.options) throw new Error('Options could not open');
    } }
  };
  await vm.runInNewContext(source, {
    chrome,
    RepoLensI18n: { message: key => key, locale: () => 'pt_BR' },
    document: { getElementById: id => elements[id], documentElement: {}, querySelectorAll: () => [] }
  });
  return { elements, writes, opened: () => opened };
}

test('popup defaults to manual, does not generate and opens provider settings', async () => {
  const popup = await createPopup();
  assert.equal(popup.elements['auto-generate'].checked, false);
  assert.equal(popup.elements['auto-generate'].disabled, false);
  assert.equal(popup.elements.status.textContent, 'popupAutoOff');
  assert.equal(popup.elements.status.dataset.state, 'ready');
  assert.equal(popup.elements['current-mode'].textContent, 'popupModeManual');
  assert.equal(popup.elements['current-mode'].dataset.mode, 'manual');
  assert.equal(popup.elements['current-mode'].hidden, false);
  assert.equal(popup.writes.length, 0);
  await popup.elements['provider-settings'].listeners.click();
  assert.equal(popup.opened(), 1);
});

test('popup persists the explicit automatic preference across reopen and can turn it off', async () => {
  const store = { enabled: false, endpoint: 'https://provider.test/v1/chat' };
  const first = await createPopup(store);
  assert.equal(first.elements['extension-disabled'].hidden, false);
  first.elements['auto-generate'].checked = true;
  const save = first.elements['auto-generate'].listeners.change();
  assert.equal(first.elements['auto-generate'].disabled, true);
  assert.equal(first.elements.status.textContent, 'popupSaving');
  assert.equal(first.elements.status.dataset.state, 'saving');
  assert.equal(first.elements['current-mode'].textContent, 'popupModeManual');
  await save;
  assert.equal(store.autoGenerate, true);
  assert.equal(store.enabled, false);
  assert.equal(store.endpoint, 'https://provider.test/v1/chat');
  assert.equal(first.elements.status.textContent, 'popupAutoOn');
  assert.equal(first.elements['current-mode'].textContent, 'popupModeAuto');
  assert.equal(first.elements['current-mode'].dataset.mode, 'auto');
  const reopened = await createPopup(store);
  assert.equal(reopened.elements['auto-generate'].checked, true);
  assert.equal(reopened.elements['current-mode'].textContent, 'popupModeAuto');
  reopened.elements['auto-generate'].checked = false;
  await reopened.elements['auto-generate'].listeners.change();
  assert.equal(store.autoGenerate, false);
  assert.equal(reopened.elements.status.textContent, 'popupAutoOff');
  assert.equal(reopened.elements['current-mode'].textContent, 'popupModeManual');
  assert.equal(reopened.elements['current-mode'].dataset.mode, 'manual');
});

test('failed save restores the previous switch state and reports failure', async () => {
  const store = { autoGenerate: true };
  const popup = await createPopup(store, { set: true });
  popup.elements['auto-generate'].checked = false;
  await popup.elements['auto-generate'].listeners.change();
  assert.equal(popup.elements['auto-generate'].checked, true);
  assert.equal(popup.elements['auto-generate'].disabled, false);
  assert.equal(popup.elements.status.textContent, 'popupSaveError');
  assert.equal(popup.elements.status.dataset.error, 'true');
  assert.equal(popup.elements.status.dataset.state, 'error');
  assert.equal(popup.elements['current-mode'].textContent, 'popupModeAuto');
  assert.equal(popup.elements['current-mode'].dataset.mode, 'auto');
  assert.equal(store.autoGenerate, true);
});

test('failed load leaves the switch disabled without claiming a saved preference', async () => {
  const popup = await createPopup({}, { get: true });
  assert.equal(popup.elements['auto-generate'].disabled, true);
  assert.equal(popup.elements.status.textContent, 'popupLoadError');
  assert.equal(popup.elements.status.dataset.error, 'true');
  assert.equal(popup.elements['current-mode'].hidden, true);
  assert.equal(popup.writes.length, 0);
});

test('loading does not label an unread preference as manual', async () => {
  let observedLoading = false;
  await createPopup({ autoGenerate: true }, { beforeGet(elements) {
    observedLoading = true;
    assert.equal(elements['auto-generate'].disabled, true);
    assert.equal(elements['current-mode'].hidden, true);
    assert.equal(elements.status.textContent, 'popupLoading');
    assert.equal(elements.status.dataset.state, 'loading');
    assert.equal(elements.status.dataset.error, 'false');
  } });
  assert.equal(observedLoading, true);
});

test('failed opt-in keeps the manual badge and a later successful save clears the error', async () => {
  const store = {};
  const failures = { set: true };
  const popup = await createPopup(store, failures);
  const toggle = popup.elements['auto-generate'];
  toggle.checked = true;
  await toggle.listeners.change();
  assert.equal(toggle.checked, false);
  assert.equal(store.autoGenerate, undefined);
  assert.equal(popup.elements['current-mode'].dataset.mode, 'manual');
  assert.equal(popup.elements.status.dataset.error, 'true');
  failures.set = false;
  toggle.checked = true;
  const save = toggle.listeners.change();
  assert.equal(popup.elements.status.dataset.state, 'saving');
  assert.equal(popup.elements.status.dataset.error, 'false');
  assert.equal(popup.elements['current-mode'].dataset.mode, 'manual');
  await save;
  assert.equal(store.autoGenerate, true);
  assert.equal(popup.elements['current-mode'].dataset.mode, 'auto');
  assert.equal(popup.elements.status.dataset.state, 'ready');
});

test('failed options opening reports an error without changing the saved mode and permits retry', async () => {
  const failures = { options: true };
  const popup = await createPopup({ autoGenerate: true }, failures);
  const settings = popup.elements['provider-settings'];
  const opening = settings.listeners.click();
  assert.equal(settings.disabled, true);
  await opening;
  assert.equal(settings.disabled, false);
  assert.equal(popup.elements.status.textContent, 'popupSettingsError');
  assert.equal(popup.elements.status.dataset.state, 'error');
  assert.equal(popup.elements['current-mode'].dataset.mode, 'auto');
  assert.equal(popup.elements['auto-generate'].checked, true);
  assert.equal(popup.writes.length, 0);
  failures.options = false;
  await settings.listeners.click();
  assert.equal(popup.opened(), 2);
  assert.equal(settings.disabled, false);
  assert.equal(popup.elements.status.textContent, 'popupSettingsError');
});
