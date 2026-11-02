# Validation

## Visual refresh in version 1.1.1

The Headspace reference screens were inspected in Mobbin's enlarged viewer through OpenCLI. The options layout now includes a warm welcome panel, original static lens/document artwork, a numbered setup guide and a blue capsule action. The README toolbar, icon and documentation animation use the same palette. Reference URLs and the adaptation rationale are recorded in [design.md](design.md).

The existing native Chrome checks were rerun for English and Brazilian Portuguese at desktop, 600px and 390px widths, including dark appearance and original/summary recovery. Reference captures and product screenshots remain local in ignored `artifacts/` folders. No Mobbin artwork is shipped in the extension.

## Original bilingual release

Checks performed on 2026-11-02:

- Node's built-in test runner covers locale selection, catalog keys, translated controls, localized outgoing AI instructions and user messages, API authorization/rate/server/network errors, and preservation of text-based model rendering.
- JavaScript syntax checks cover the service worker, content script, settings script and shared localization helper.
- `docs/demo/verify-ui.cjs` loads the actual MV3 extension in a clean Chrome for Testing session. It does not use a personal browser profile or API credentials. Native English, Brazilian Portuguese and Portugal Portuguese sessions exercise Chrome's real locale catalog selection. Portugal Portuguese intentionally uses the Brazilian translation.
- The browser script also renders English and Brazilian Portuguese options at 1080px and 390px, with light and dark appearance. It checks for horizontal overflow and missing icons and captures local screenshots in the ignored `artifacts/` directory. Explicit catalog mocks allow comparing both languages within one browser session.
- A separate browser fixture runs the actual content script with simulated Chrome messaging and a fixed model response. It exercises original/summary toggling and verifies that model-supplied HTML renders as text. This fixture does not query a live AI service or real GitHub account.
- Hyperframes 0.9.5 lints and renders the README illustration to a 960 × 480 GIF, 108 frames over 9 seconds. The generated summary is illustrative. The original SVG mark supplies static PNG icons in four sizes.

To repeat browser checks after installing the documentation dependencies, set `HYPERFRAMES_BROWSER_PATH` to a Chrome for Testing executable and run `node verify-ui.cjs` from `docs/demo`. Optionally set `REPOLENS_TEST_LANGUAGE` to `en-US`, `pt-BR` or `pt-PT`. A regular installed Google Chrome may ignore extension-loading flags; Chrome for Testing supports this isolated test.

Live provider output quality, provider permission prompts in the user's installed browser, and future GitHub layout/protocol changes are outside these automated checks. After updating a local installation, reload the extension and refresh GitHub tabs.
