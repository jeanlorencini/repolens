// Isolated headless browser check. Never opens the user's Chrome profile.
const puppeteer = require('puppeteer-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const output = path.join(root, 'artifacts', (process.env.REPOLENS_TEST_LANGUAGE || 'default').replace(/[^a-zA-Z0-9-]/g, '_'));
fs.mkdirSync(output, { recursive:true });

(async () => {
  const browser = await puppeteer.launch({
    executablePath: process.env.HYPERFRAMES_BROWSER_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless:true,
    ignoreDefaultArgs:['--disable-extensions'],
    args:[`--disable-extensions-except=${root}`, `--load-extension=${root}`, '--disable-features=DisableLoadExtensionCommandLineSwitch', `--lang=${process.env.REPOLENS_TEST_LANGUAGE || 'en-US'}`]
  });
  try {
    const worker = await browser.waitForTarget(t => t.type() === 'service_worker' && t.url().endsWith('/background.js'), { timeout:15000 });
    const origin = worker.url().replace(/\/background\.js$/, '');
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setViewport({ width:1080, height:1100 });
    await page.goto(origin + '/options.html');
    await page.waitForSelector('input#endpoint');
    assert.equal(await page.$eval('h1', el => el.textContent.trim()), 'RepoLens');
    const uiLanguage = await page.evaluate(() => chrome.i18n.getUILanguage());
    if(process.env.REPOLENS_TEST_LANGUAGE) assert.equal(uiLanguage, process.env.REPOLENS_TEST_LANGUAGE);
    const nativeCatalog = JSON.parse(fs.readFileSync(path.join(root, '_locales', uiLanguage.startsWith('pt') ? 'pt_BR' : 'en', 'messages.json')));
    assert.equal(await page.$eval('button[type=submit]', el => el.textContent), nativeCatalog.saveButton.message);
    console.log('Native Chrome MV3 extension loaded; UI locale:', uiLanguage);
    await page.screenshot({ path:path.join(output,'options-native.png'), fullPage:true });
    // Exercise both complete catalogs in the actual options DOM. Native Chrome
    // itself picks one locale per browser session, so these are explicit mocks.
    for(const [locale, lang] of [['en','en-US'],['pt_BR','pt-BR']]) {
      await page.reload();
      const catalog = JSON.parse(fs.readFileSync(path.join(root, '_locales', locale, 'messages.json')));
      await page.evaluate(({catalog,lang}) => {
        chrome.i18n.getUILanguage = () => lang;
        chrome.i18n.getMessage = (key, values) => {
          let value = catalog[key]?.message || '';
          (Array.isArray(values) ? values : [values]).forEach((v,i) => {
            value = value.replaceAll('$'+(i+1), String(v));
          });
          return value;
        };
        document.documentElement.lang = RepoLensI18n.locale() === 'pt_BR' ? 'pt-BR' : 'en';
        document.title = RepoLensI18n.message('optionsTitle');
        document.querySelectorAll('[data-i18n]').forEach(el => el.textContent = RepoLensI18n.message(el.dataset.i18n));
        document.querySelectorAll('[data-i18n-placeholder]').forEach(el => el.placeholder = RepoLensI18n.message(el.dataset.i18nPlaceholder));
      }, {catalog,lang});
      for(const [width,theme] of [[1080,'light'],[390,'light'],[1080,'dark']]) {
        await page.setViewport({ width, height:1100 });
        await page.emulateMediaFeatures([{name:'prefers-color-scheme',value:theme}]);
        const dimensions = await page.evaluate(() => ({width:innerWidth, scroll:document.documentElement.scrollWidth, image:document.querySelector('h1 img').naturalWidth}));
        assert.ok(dimensions.scroll <= dimensions.width, `${locale} ${width}px horizontal overflow`);
        assert.equal(dimensions.image, 48);
        await page.screenshot({path:path.join(output, `options-${locale}-${width}-${theme}.png`), fullPage:true});
      }
      console.log('Options visual checks:',locale,'desktop, mobile, dark; no horizontal overflow');
    }
    assert.deepEqual(errors, []);
    const fixture = await browser.newPage();
    await fixture.setViewport({width:1080,height:760});
    await fixture.setRequestInterception(true);
    fixture.on('request', request => request.respond({status:200,contentType:'text/html',body:'<!doctype html><html lang="en"><body><main><div id="readme"><article class="markdown-body"><h1>Original project</h1><p>This is the original README, preserved exactly for the reader to recover later.</p></article></div></main></body></html>'}));
    await fixture.goto('https://repolens.test/owner/project');
    await fixture.addStyleTag({path:path.join(root,'content.css')});
    const contentSource = fs.readFileSync(path.join(root,'content.js'),'utf8');
    for(const locale of ['en','pt_BR']) {
      await fixture.reload();
      await fixture.addStyleTag({path:path.join(root,'content.css')});
      const catalog = JSON.parse(fs.readFileSync(path.join(root,'_locales',locale,'messages.json')));
      await fixture.evaluate(({contentSource,catalog}) => {
        const mockChrome = {
          storage:{local:{get(_keys,callback){callback({enabled:true});}},onChanged:{addListener(){}}},
          runtime:{sendMessage(_message,callback){callback({markdown:'# Clear summary\n### What is it?\nA readable explanation.\n<img src=x onerror="window.injected=1">\n**Strong words** and `code`'});}}
        };
        const i18n = {message:key => catalog[key]?.message || key};
        new Function('chrome','RepoLensI18n',contentSource)(mockChrome,i18n);
      },{contentSource,catalog});
      await fixture.waitForSelector('.gsl-resumo');
      assert.equal(await fixture.$eval('.gsl-toolbar button', el => el.textContent), catalog.showOriginal.message);
      assert.equal(await fixture.$('article img'), null);
      assert.equal(await fixture.evaluate(() => window.injected), undefined);
      await fixture.screenshot({path:path.join(output,`content-${locale}.png`)});
      await fixture.click('.gsl-toolbar button');
      assert.equal(await fixture.$eval('article h1', el => el.textContent), 'Original project');
      await fixture.click('.gsl-toolbar button');
      await fixture.waitForSelector('.gsl-resumo');
      assert.equal(await fixture.$eval('article h1', el => el.textContent), 'Clear summary');
      console.log('Content fixture:',locale,'localized controls, original/summary toggle, model HTML rendered as text');
    }
    console.log('No browser script errors. No API credentials or requests used.');
  } finally { await browser.close(); }
})().catch(e => { console.error(e.message); process.exitCode=1; });
