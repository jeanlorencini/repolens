'use strict';
// Real popup markup/scripts in an isolated browser; Chrome storage/runtime are explicit mocks.
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts/popup');
fs.mkdirSync(output, { recursive: true });
const native = process.argv.includes('--native');

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.HYPERFRAMES_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: !native,
    ...(native ? {
      enableExtensions: true,
      defaultViewport: null,
      args: [`--load-extension=${root}`, `--disable-extensions-except=${root}`]
    } : {})
  });
  try {
    if (native) {
      await browser.waitForTarget(target => target.type() === 'service_worker' && target.url().endsWith('/background.js'), { timeout: 15000 });
      const extension = [...(await browser.extensions()).values()].find(item => item.name === 'RepoLens');
      assert.ok(extension, 'RepoLens must be loaded as an unpacked extension');
      const tab = await browser.newPage();
      await tab.goto('about:blank');
      const opened = browser.waitForTarget(target => target.url().endsWith('/popup.html'), { timeout: 15000 });
      await extension.triggerAction(tab);
      const popup = await (await opened).asPage();
      await popup.waitForSelector('#auto-generate:not(:disabled)');
      // Do not setViewport: only the browser may size this real toolbar popup.
      await popup.waitForFunction(() => innerWidth >= 360, { timeout: 5000 });
      const dimensions = await popup.evaluate(() => ({
        viewport: innerWidth,
        root: document.documentElement.getBoundingClientRect().width,
        scroll: document.documentElement.scrollWidth,
        titleHeight: document.querySelector('h1').getBoundingClientRect().height,
        titleLineHeight: parseFloat(getComputedStyle(document.querySelector('h1')).lineHeight)
      }));
      assert.equal(dimensions.root, 360);
      assert.ok(dimensions.scroll <= dimensions.viewport, 'No native horizontal overflow');
      assert.ok(dimensions.titleHeight <= dimensions.titleLineHeight * 2, 'Title must not break into individual letters');
      await popup.screenshot({ path: path.join(output, 'native-fixed.png'), fullPage: true });
      console.log('Native toolbar popup, no viewport override:', JSON.stringify(dimensions));
      return;
    }
    for (const locale of ['en', 'pt_BR']) {
      const catalog = JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json')));
      const page = await browser.newPage();
      const errors = [];
      let saved = {};
      let failWrite = false;
      let openedSettings = 0;
      const writes = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.exposeFunction('readPreference', () => saved);
      await page.exposeFunction('writePreference', value => {
        writes.push(value);
        if (failWrite) throw new Error('Simulated storage failure');
        saved = { ...saved, ...value };
      });
      let acknowledgeSettings;
      const settingsOpened = new Promise(resolve => { acknowledgeSettings = resolve; });
      await page.exposeFunction('openProviderSettings', () => { openedSettings++; acknowledgeSettings(); });
      await page.evaluateOnNewDocument(({ catalog, locale }) => {
        window.chrome = {
          i18n: { getUILanguage: () => locale === 'pt_BR' ? 'pt-BR' : 'en', getMessage: key => catalog[key]?.message || key },
          storage: { local: { get: () => window.readPreference(), set: value => window.writePreference(value) } },
          runtime: { openOptionsPage: () => window.openProviderSettings() }
        };
      }, { catalog, locale });
      await page.goto(pathToFileURL(path.join(root, 'popup.html')).href);
      await page.waitForSelector('#auto-generate:not(:disabled)');
      assert.equal(await page.$eval('#auto-generate', el => el.checked), false);
      assert.equal(await page.$eval('#current-mode', el => el.textContent), catalog.popupModeManual.message);
      assert.equal(writes.length, 0);
      // A native popup starts with a provisional narrow viewport. Its intrinsic
      // width must remain 360px instead of feeding that viewport back into CSS.
      await page.setViewport({ width: 80, height: 600 });
      assert.equal(await page.$eval('html', el => el.getBoundingClientRect().width), 360);
      assert.ok(await page.$eval('h1', el => el.getBoundingClientRect().height <= parseFloat(getComputedStyle(el).lineHeight) * 2));
      for (const [width, height, theme] of [[360,640,'light'],[360,640,'dark'],[360,420,'light'],[390,480,'dark']]) {
        await page.setViewport({ width, height });
        await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: theme }]);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        await page.screenshot({ path: path.join(output, `${locale}-${width}-${theme}.png`), fullPage: true });
      }
      await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
      assert.equal(await page.$eval('#auto-generate', el => getComputedStyle(el, '::before').transitionDuration), '0s');
      await page.emulateMediaFeatures([{ name: 'forced-colors', value: 'active' }]);
      assert.equal(await page.$eval('#auto-generate', el => getComputedStyle(el).appearance), 'auto');
      await page.screenshot({ path: path.join(output, `${locale}-forced-colors.png`), fullPage: true });
      await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
      await page.focus('#auto-generate');
      await page.keyboard.press('Space');
      await page.waitForFunction(text => document.getElementById('status').textContent === text, {}, catalog.popupAutoOn.message);
      assert.equal(saved.autoGenerate, true);
      assert.equal(await page.$eval('#current-mode', el => el.textContent), catalog.popupModeAuto.message);
      assert.deepEqual(Object.keys(writes[0]), ['autoGenerate']);
      await page.reload();
      await page.waitForSelector('#auto-generate:not(:disabled)');
      assert.equal(await page.$eval('#auto-generate', el => el.checked), true);
      failWrite = true;
      await page.focus('#auto-generate');
      await page.keyboard.press('Space');
      await page.waitForFunction(() => document.getElementById('status').dataset.error === 'true');
      assert.equal(await page.$eval('#auto-generate', el => el.checked), true);
      assert.equal(saved.autoGenerate, true);
      assert.equal(await page.$eval('#current-mode', el => el.dataset.mode), 'auto');
      await page.screenshot({ path: path.join(output, `${locale}-save-error.png`), fullPage: true });
      failWrite = false;
      await page.keyboard.press('Space');
      await page.waitForFunction(text => document.getElementById('status').textContent === text, {}, catalog.popupAutoOff.message);
      assert.equal(saved.autoGenerate, false);
      assert.equal(await page.$eval('#current-mode', el => el.textContent), catalog.popupModeManual.message);
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => document.activeElement.id), 'provider-settings');
      await page.keyboard.press('Enter');
      await settingsOpened;
      assert.equal(openedSettings, 1);
      assert.deepEqual(errors, []);
      console.log(`Popup ${locale}: 80px bootstrap retains 360px intrinsic width; confirmed mode; keyboard; persistence; rollback; settings; light/dark; reduced motion; forced colors; short viewport passed`);
      await page.close();
    }
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
