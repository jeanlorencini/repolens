'use strict';
(async () => {
  const toggle = document.getElementById('auto-generate');
  const status = document.getElementById('status');
  const settings = document.getElementById('provider-settings');
  const mode = document.getElementById('current-mode');
  if (!globalThis.chrome?.storage?.local || !globalThis.chrome?.i18n) {
    status.textContent = 'Open this panel from the RepoLens extension icon.';
    status.dataset.state = 'error';
    status.dataset.error = 'true';
    return;
  }
  const t = key => RepoLensI18n.message(key);
  document.documentElement.lang = RepoLensI18n.locale() === 'pt_BR' ? 'pt-BR' : 'en';
  document.title = t('popupDocumentTitle');
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  let saved = false;
  function showMode() {
    mode.textContent = t(saved ? 'popupModeAuto' : 'popupModeManual');
    mode.dataset.mode = saved ? 'auto' : 'manual';
    mode.hidden = false;
  }
  function showStatus(key, state = 'ready') {
    status.textContent = t(key);
    status.dataset.state = state;
    status.dataset.error = String(state === 'error');
  }
  showStatus('popupLoading', 'loading');
  settings.disabled = false;
  settings.addEventListener('click', async () => {
    const restoreFocus = document.activeElement === settings;
    settings.disabled = true;
    try {
      await chrome.runtime.openOptionsPage();
    } catch (_) {
      showStatus('popupSettingsError', 'error');
    } finally {
      settings.disabled = false;
      if (restoreFocus && document.activeElement === document.body) settings.focus();
    }
  });
  try {
    const result = await chrome.storage.local.get(['autoGenerate', 'enabled']);
    saved = result.autoGenerate === true;
    toggle.checked = saved;
    showMode();
    document.getElementById('extension-disabled').hidden = result.enabled !== false;
    toggle.disabled = false;
    showStatus(saved ? 'popupAutoOn' : 'popupAutoOff');
  } catch (_) {
    showStatus('popupLoadError', 'error');
    return;
  }
  toggle.addEventListener('change', async () => {
    const desired = toggle.checked;
    const restoreFocus = document.activeElement === toggle;
    toggle.disabled = true;
    showStatus('popupSaving', 'saving');
    try {
      await chrome.storage.local.set({ autoGenerate: desired });
      saved = desired;
      showMode();
      showStatus(saved ? 'popupAutoOn' : 'popupAutoOff');
    } catch (_) {
      toggle.checked = saved;
      showMode();
      showStatus('popupSaveError', 'error');
    } finally {
      toggle.disabled = false;
      if (restoreFocus && document.activeElement === document.body) toggle.focus();
    }
  });
})();
