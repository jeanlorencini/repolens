# Validation

## Regression checks

Run `npm test` from the repository root. The suite covers:

- Locale selection, matching catalog keys, translated controls and outgoing AI instructions.
- API authorization, rate-limit, server and network errors.
- Manual generation by default, explicit automatic opt-in and preference persistence.
- Loading states, failed saves, rollback and opening provider settings.
- Original/summary switching, summary reuse, explicit retry and truncated-input notices.
- Rendering model-supplied markup as text rather than executable HTML.

## Browser checks

Install the development dependencies in `docs/demo` with `npm ci --ignore-scripts`. From the repository root:

```sh
node docs/demo/verify-popup.cjs
node docs/demo/verify-ui.cjs --content-only
```

These checks use the actual interface files with simulated storage, messaging and fixed provider responses. They do not use API credentials or a personal browser profile. Screenshots are saved locally under ignored `artifacts/` directories.

The popup checks cover both languages, keyboard interaction, preference persistence, failed-save rollback, light/dark appearance, reduced motion, high contrast and short viewports. An initial 80px viewport verifies that the popup retains its intrinsic 360px width instead of collapsing.

The reading-panel checks cover both languages, desktop/mobile layouts, loading and error states, original/summary recovery, safe text rendering and prevention of duplicate automatic requests.

### Native extension popup

Set `HYPERFRAMES_BROWSER_PATH` to a browser executable that supports loading unpacked extensions, then run:

```sh
node docs/demo/verify-popup.cjs --native
```

This opens the actual toolbar popup in an isolated browser without overriding its viewport. It checks the 360px width, horizontal overflow and title wrapping. Run `node docs/demo/verify-ui.cjs` without `--content-only` for the native extension/options checks. `REPOLENS_TEST_LANGUAGE` selects the expected native interface language.

## Limits

Simulated provider responses do not establish live output quality, account permissions or provider latency. Future GitHub layout changes and permission prompts in the user's installed browser require separate checks. After updating a local installation, reload the extension and refresh GitHub tabs.
