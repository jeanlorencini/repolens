'use strict';

importScripts('i18n.js');
const t = (key, values) => RepoLensI18n.message(key, values);

function validateEndpoint(raw) {
  const url = new URL(raw);
  const allowed = url.protocol === 'https:' ||
    (url.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(url.hostname));
  if (!allowed || url.username || url.password || url.hash) {
    throw new Error(t('invalidEndpoint'));
  }
  return url;
}

chrome.runtime.onInstalled.addListener(({ reason }) => {
  if (reason === 'install') chrome.runtime.openOptionsPage();
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || message.type !== 'SIMPLIFY_README') return false;
  (async () => {
    const pageUrl = new URL(sender.tab?.url || message.url || 'https://example.invalid');
    if (pageUrl.hostname !== 'github.com' || !/^\/[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+\/?$/.test(pageUrl.pathname)) {
      throw new Error(t('repositoryOnly'));
    }
    const config = await chrome.storage.local.get(['endpoint', 'apiKey', 'model', 'enabled']);
    if (config.enabled === false) throw new Error(t('enableExtension'));
    if (!config.endpoint || !config.model) throw new Error(t('configureApi'));
    const endpoint = validateEndpoint(config.endpoint);
    const permitted = await chrome.permissions.contains({ origins: [endpoint.origin + '/*'] });
    if (!permitted) throw new Error(t('permissionMissing'));
    const raw = typeof message.text === 'string' ? message.text : '';
    if (raw.trim().length < 40) throw new Error(t('readmeTooShort'));
    const cutoff = 50000;
    const text = raw.slice(0, cutoff);
    const note = raw.length > cutoff ? t('truncatedNotice') : '';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90000);
    let response;
    try {
      response = await fetch(endpoint.toString(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(config.apiKey ? { 'Authorization': 'Bearer ' + config.apiKey } : {})
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            { role: 'system', content: t('summaryPrompt') },
            { role: 'user', content: t('readmeRequest', [pageUrl.origin + pageUrl.pathname, text]) + note }
          ],
          max_tokens: 3000
        }),
        signal: controller.signal
      });
    } finally {
      clearTimeout(timeout);
    }
    if (!response.ok) {
      const code = response.status;
      if (code === 401 || code === 403) throw new Error(t('apiAuthError', String(code)));
      if (code === 429) throw new Error(t('apiRateError'));
      throw new Error(t('apiHttpError', String(code)));
    }
    const data = await response.json();
    let answer = data?.choices?.[0]?.message?.content;
    if (Array.isArray(answer)) answer = answer.map(part => part?.text || '').join('\n');
    if (typeof answer !== 'string' || !answer.trim()) {
      throw new Error(t('emptyApiResponse'));
    }
    return { markdown: answer.replace(/<think>[\s\S]*?<\/think>/gi, '').trim(), truncated: raw.length > cutoff };
  })().then(sendResponse).catch(e => sendResponse({
    error: e?.name === 'AbortError' ? t('apiTimeout')
      : e?.name === 'TypeError' ? t('apiNetworkError')
      : (e?.message || t('unknownApiError'))
  }));
  return true;
});
