'use strict';
(() => {
  function locale() {
    let uiLanguage = 'en';
    try {
      uiLanguage = chrome.i18n.getUILanguage() || 'en';
    } catch (_) {}
    return /^pt(?:[-_]|$)/i.test(uiLanguage) ? 'pt_BR' : 'en';
  }

  function message(key, substitutions) {
    const translated = chrome.i18n.getMessage(key, substitutions);
    return translated || key;
  }

  const api = { locale, message };
  globalThis.RepoLensI18n = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})();
