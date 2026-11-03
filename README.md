<p align="center"><img src="docs/assets/repolens.gif" alt="RepoLens turns a complex GitHub README into a plain-language explanation, with the original one click away." width="960"></p>

# RepoLens

**Repositories, understood.** A lightweight Chrome extension that explains GitHub READMEs in plain language, right where you read them.

[Português brasileiro](README.pt-BR.md) · [MIT license](LICENSE)

Get a short explanation of what a project does, who it helps, and what to check before trying it. Choose manual or automatic generation from the extension popup. Switch between the original README and the generated explanation without another AI request. Repository files stay intact.

- **Choose when to generate.** Manual mode is the default; enable automatic mode from the toolbar popup when you prefer summaries on page load.
- **English and Brazilian Portuguese, automatically.** Uses Chrome's interface language for the settings, controls, errors and AI instructions. Portuguese uses pt-BR; other languages fall back to English. Restart Chrome and reload repository tabs after changing its interface language.
- **Bring your own model.** Connect a provider that implements the Chat Completions API, including a local server.
- **Keep context.** Regenerate the explanation or return to the original README with a click.
- **Small by design.** No runtime packages, tracking services, remote fonts or animated extension icons.

The header animation uses a fictional repository and sample explanation; it is not a recording of a live AI response.

## Install

1. Download this repository with **Code → Download ZIP** and extract it to a permanent folder, or clone it.
2. Open `chrome://extensions` and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Click the RepoLens toolbar icon, then **Provider settings**, to configure your provider.

No build or Node.js installation is needed to use the extension. It is currently distributed as an unpacked extension, without automatic updates.

## Connect your AI provider

Enter the full Chat Completions endpoint, the provider's exact model ID, and an API key if required. Save and approve Chrome access to that provider's domain. Open or refresh a GitHub repository page.

| Provider | Endpoint |
| --- | --- |
| OpenRouter | `https://openrouter.ai/api/v1/chat/completions` |
| Groq | `https://api.groq.com/openai/v1/chat/completions` |
| Cerebras | `https://api.cerebras.ai/v1/chat/completions` |
| Local server | `http://localhost:PORT/v1/chat/completions` |

Choose a model available from your provider. An API key is separate from a chat subscription. Provider charges and rate limits may apply.

## Choose manual or automatic mode

Click the **RepoLens toolbar icon** to open **Reading preferences**. Use the **Generate automatically** switch:

| Mode | Switch | What happens |
| --- | --- | --- |
| **Manual (default)** | Off | The original README stays visible. Click **Generate summary** above it to request an explanation. |
| **Automatic** | On | RepoLens requests a summary when you open, refresh, or navigate to a repository home page with a readable README. |

The preference is saved on this device. Changing it does **not** generate a summary in the current tab; it applies on the next page load or navigation. Turn the switch off to return to manual mode. RepoLens must also be enabled in **Provider settings** for either mode to work.

After generation, use **View original README** or **View clear explanation** to switch views without another AI request. **Generate again** makes a new request; failed requests offer **Try again** and are not retried automatically.

**Automatic mode can consume tokens on every open or refresh and sends README content to your configured provider, including private repositories you can access.** Leave it off when you want to decide before sending each README.

## Data and limitations

RepoLens sends the visible README text, capped at 50,000 characters, and the repository URL to the provider you configure. It stores your endpoint, model, API key and enabled/automatic-generation preferences in `chrome.storage.local`. The key is not encrypted by this extension. Chrome requests access to the configured provider domain when you save settings. There is no RepoLens backend or telemetry.

The content script runs on GitHub repository root pages. It does not verify repository visibility: **a private README visible to your account can also be sent to your provider**. Keep automatic generation off and do not click **Generate summary** or **Generate again** on private repositories if you do not want that content sent. It does not inspect source files or verify authors' claims. AI explanations can be incomplete or inaccurate; check the original documentation. GitHub layout changes may require selector updates. Truncated input may omit relevant facts.

## Development

Use Node.js 22+ to run the built-in regression tests:

```sh
npm test
```

The extension has no build step. Reload it at `chrome://extensions` and refresh GitHub tabs after editing runtime files. Translation catalogs live in `_locales/en` and `_locales/pt_BR`.

The optional animation source and rebuild instructions are in [docs/demo](docs/demo). Documentation dependencies are not loaded by the extension.

## License

[MIT](LICENSE) © 2026 Jean Lorencini. Independent project; not affiliated with GitHub.
