'use strict';
const form = document.querySelector('#settings');
const status = document.querySelector('#status');
const input = name => document.getElementById(name);
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
      throw new Error('Informe um endereço HTTPS ou um servidor local.');
    }
    if (endpoint.username || endpoint.password || endpoint.hash) throw new Error('Remova usuário, senha e # do endereço da API.');
    const model = input('model').value.trim();
    if (!model) throw new Error('Informe o nome exato do modelo.');
    // O pedido de permissão ocorre diretamente a partir do clique no botão Salvar.
    const granted = await chrome.permissions.request({ origins: [endpoint.origin + '/*'] });
    if (!granted) throw new Error('O Chrome não autorizou o domínio da API.');
    await chrome.storage.local.set({
      endpoint: endpoint.href, model,
      apiKey: input('apiKey').value.trim(), enabled: input('enabled').checked
    });
    status.textContent = 'Configuração salva. Abra ou atualize a página do repositório.';
  } catch (e) {
    status.textContent = 'Não foi possível salvar: ' + (e.message || String(e));
  }
});
