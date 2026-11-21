# Store listing — addons.mozilla.org (AMO)

Texts and answers for submitting Quill-Firefox to <https://addons.mozilla.org/developers/>. Chrome Web Store version: [Quill-Chrome/STORE_LISTING.md](https://github.com/mikecastrodemaria/Quill-Chrome/blob/main/STORE_LISTING.md).

## 1. Upload

| Field | Value |
|---|---|
| Distribution | **On this site** (listed) |
| File | `web-ext-artifacts/quill-firefox-<version>.zip` (see README → *Package / publish*) |
| Platforms | **Firefox** only — leave *Firefox for Android* unchecked (no sidebar on Android) |
| Source code question (minifier, bundler, transpiler…) | **No** — the code is shipped as written, no build step |

Each upload must have a new `version` in `manifest.json`: AMO never accepts the same version twice.

## 2. Listing

**Name**

```
Quill - AI sidebar
```

**Add-on URL (slug)**

```
quill-ai-sidebar
```

**Summary** (max 250 characters)

```
Chat with Claude, OpenAI, OVHcloud AI Endpoints or Ollama in the sidebar, and talk with the page you are reading: summarize, explain, translate.
```

**Description**

```
Quill brings an AI assistant to the Firefox sidebar, next to the page you are reading.

• Chat with your choice of provider: Anthropic (Claude), OpenAI, OVHcloud AI Endpoints (EU hosting, free anonymous tier) or Ollama (100% local).
• Turn on "Page" to ask questions about the current page: its title, URL and text are sent with your message.
• One-click actions: Summarize, Key points, Translate, Explain selection.
• Right-click menu: summarize the page, explain or translate the selected text.
• Bring your own API key. Requests go directly from your browser to the provider you chose: no Quill server, no tracking.

Sister project of Quill for Thunderbird.
```

| Field | Value |
|---|---|
| Categories (up to 3) | **Language Support** and **Social & Communication** |
| Support website | `https://github.com/mikecastrodemaria/Quill-Firefox` |
| Support email | optional — leave empty or use a project address |
| License | **GNU General Public License v3.0 only** |
| Experimental | Leave unchecked |
| Requires payment, non-free services… | Leave unchecked: OVHcloud anonymous tier and Ollama are free (Anthropic / OpenAI keys are optional) |
| Tags | `ai`, `chatgpt`, `claude`, `sidebar`, `summarize`, `translate` |

**Privacy policy** — check **This add-on has a Privacy Policy**, then paste the content of [PRIVACY.md](PRIVACY.md) (AMO takes the text directly), or this short version:

```
Quill does not collect, store or transmit any data to its developers. API keys and settings are stored locally in your browser. When you send a message, it is sent directly to the AI provider you configured (Anthropic, OpenAI, OVHcloud or your own Ollama server). When you turn on "Page" or use a quick action, the title, URL and text of the current page (or the selected text) are included in that request. Each provider's own privacy policy applies to the data it receives. The conversation is kept only for the current browser session.
```

## 3. Version

**Release notes (0.1.1)** — first public version (0.1.0 was only an upload test)

```
First release: AI chat in the sidebar with 4 providers, current-page context, quick actions and context menu.
```

**Notes to reviewer**

```
No account is needed to test. In the add-on options, enable "OVHcloud AI Endpoints" (works without an API key, anonymous rate-limited tier), set it as the active provider, then open the sidebar from the toolbar button. Open any article and click "Summarize".

Source: https://github.com/mikecastrodemaria/Quill-Firefox (no minification, no build step). core/API.js and core/providers.js are shared with the Thunderbird add-on Quill.

Data collection: websiteContent and browsingActivity are declared because the page text and URL are sent to the AI provider chosen by the user, only when they turn on "Page" or run an action.
```

## 4. Permissions — why each one is needed

Useful if the reviewer asks.

| Permission | Why |
|---|---|
| `storage` | Settings and API keys (`storage.local`), current conversation (`storage.session`) |
| `tabs` | Show the title, URL and favicon of the active tab in the sidebar and follow tab changes |
| `activeTab` | Read the current page after a user action (button, context menu) |
| `scripting` | Inject the text-extraction function into the page when the user asks for it |
| `menus` | Context-menu entries: summarize the page, explain / translate the selection |
| Host: `api.anthropic.com`, `api.openai.com`, `*.ai.cloud.ovh.net` | Call the AI providers' APIs |
| Host: `localhost`, `127.0.0.1` | Call a local Ollama server |
| Optional host: `<all_urls>` | Requested on first use only, so the page can be read without clicking the toolbar first; revocable in `about:addons` |
| `data_collection_permissions`: `websiteContent`, `browsingActivity` | Page text and URL are sent to the provider chosen by the user |

## 5. Images

| Asset | Size | Status |
|---|---|---|
| Add-on icon | 128×128 PNG | ✅ `images/icon-128px.png` (taken from the manifest) |
| Screenshots | 1280×800 recommended (min 600×375), PNG/JPG | ✅ `screenshots/1-summarize.png`, `2-explain-selection.png`, `3-options.png` |

Screenshots can be added after submission from **Edit Product Page → Images**.

## 6. After submission

- The add-on is signed automatically, then may get a manual review (hours to a few days).
- Review messages arrive by email and in **Developer Hub → Manage Status & Versions**.
- For an update: bump `version`, rebuild the zip, **Upload New Version**.
