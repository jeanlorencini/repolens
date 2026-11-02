'use strict';
const form = document.querySelector('#settings');
const status = document.querySelector('#status');
const input = name => document.getElementById(name);
const t = (key, values) => RepoLensI18n.message(key, values);

document.documentElement.lang = RepoLensI18n.locale() === 'pt_BR' ? 'pt-BR' : 'en';
document.title = t('optionsTitle');
document.querySelectorAll('[data-i18n]').forEach(element => {
  element.textContent = t(element.dataset.i18n);
});
document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
  element.placeholder = t(element.dataset.i18nPlaceholder);
});

chrome.storage.local.get(['endpoint', 'model', 'apiKey', 'enabled'], saved => {
  input('endpoint').value = saved.endpoint || '';
  input('model').value = saved.model || '';
  input('apiKey').value = saved.apiKey || '';
  input('enabled').checked = saved.enabled !== false;
});
form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  try {
    const endpoint = new URL(input('endpoint').value.trim());
    if (!(endpoint.protocol === 'https:' ||
      (endpoint.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(endpoint.hostname)))) {
      throw new Error(t('invalidEndpoint'));
    }
    if (endpoint.username || endpoint.password || endpoint.hash) throw new Error(t('invalidEndpointParts'));
    const model = input('model').value.trim();
    if (!model) throw new Error(t('missingModel'));
    const granted = await chrome.permissions.request({ origins: [endpoint.origin + '/*'] });
    if (!granted) throw new Error(t('permissionDenied'));
    await chrome.storage.local.set({
      endpoint: endpoint.href, model,
      apiKey: input('apiKey').value.trim(), enabled: input('enabled').checked
    });
    status.textContent = t('saveSuccess');
  } catch (e) {
    status.textContent = t('savePrefix') + (e.message || String(e));
  }
});
