# Quill for Firefox — Specification

| | |
|---|---|
| **Project** | Quill Firefox (browser port of Quill for Thunderbird) |
| **Document version** | 1.0 — 2026-11-21 |
| **Target software version** | v0.1 (MVP) → v1.0 |
| **Publisher** | Supersonique Studio SARL |
| **License** | GPL-3.0 (same as Quill for Thunderbird) |

---

## 1. Context and goals

Quill is a Thunderbird add-on that brings AI assistance (Claude, OpenAI, OVHcloud AI Endpoints, Ollama) to email: summarize, translate, correct, reply, chat.

The goal is to offer **the same AI building block in Mozilla Firefox** as a **sidebar** (`sidebar_action` API, which can be placed on the right), with:

1. **The Quill chat**, always available next to the page being read.
2. **Access to every provider / endpoint** Quill already supports (same keys, same models, quick switching).
3. **Awareness of the current page** (URL, title, content, selection) to "talk with the page": summarize it, explain it, translate it, extract information from it.

### Measurable goals

- Open the sidebar and ask a question in **2 clicks or fewer**.
- Summarize the current page in **1 click** (quick action).
- No data sent anywhere but the AI provider chosen by the user (**no Quill server**).
- Works 100% locally with Ollama.

---

## 2. Scope

### In scope

- **Manifest V3** Firefox add-on (Firefox ≥ 128, desktop; Firefox-based browsers such as LibreWolf, Floorp, Zen).
- Sidebar: chat, page context, quick actions.
- Options page: providers, models, limits, language.
- Context menu (right click) on the page and on a selection.
- Bilingual FR / EN interface (v0.1), then Quill's 8 languages.

### Out of scope

- User accounts / server-side sync.
- Page automation (clicking, filling forms) — may be studied after v1.0.
- Chromium browsers — handled by the sister project [Quill-Chrome](https://github.com/mikecastrodemaria/Quill-Chrome) (`sidePanel`), sharing the same core.
- Firefox for Android (no sidebar API).

---

## 3. Users and use cases

| Profile | Use case |
|---|---|
| Professional | Summarize an article, report or documentation page before a meeting |
| Developer | Explain a selected code snippet or technical doc |
| Multilingual user | Translate the page or a passage |
| Privacy-minded user | Talk with the page through Ollama (local) or OVHcloud (EU hosting) |
| Writer | Rephrase / correct a selected text, then copy it |

### Main scenarios

- **S1 — Free chat**: click the Quill icon → the sidebar opens → chat with the active model.
- **S2 — Talk with the page**: the sidebar shows the current page (title + URL); the **Page** toggle is on; the user asks "What are the key figures?" → the answer is grounded in the page content.
- **S3 — Quick action**: **Summarize** button → structured summary of the page.
- **S4 — Selection**: select a paragraph, right click → "Quill: explain the selection" → the sidebar opens and answers about that text.
- **S5 — Tab switch**: the displayed context follows the active tab automatically.
- **S6 — Provider switch**: selector in the sidebar header, no need to open the options.

---

## 4. Functional requirements

Priorities: **P0** = v0.1 (MVP), **P1** = v0.2–v0.5, **P2** = v1.0+.

### 4.1 Sidebar

| ID | Requirement | Prio |
|---|---|---|
| F-01 | Clicking the toolbar button toggles the sidebar (can be moved to the right in Firefox settings) | P0 |
| F-02 | Keyboard shortcut (`Alt+Shift+Q` by default, editable in `about:addons` → ⚙ → Manage Extension Shortcuts) | P0 |
| F-03 | Header: logo, active provider/model selector, "New conversation", "Settings" | P0 |
| F-04 | Light/dark theme following the system | P0 |
| F-05 | Usable from 320 px wide | P0 |

### 4.2 Chat

| ID | Requirement | Prio |
|---|---|---|
| F-10 | Multi-line input, `Enter` sends, `Shift+Enter` = new line | P0 |
| F-11 | Conversation history sent to the model (multi-turn context) | P0 |
| F-12 | Safe Markdown rendering of answers (headings, bold, italic, lists, code, links) — never raw HTML | P0 |
| F-13 | "Copy" button on every answer | P0 |
| F-14 | Loading indicator; on error, a clear message and the question restored in the input | P0 |
| F-15 | Conversation kept for the browser session (closing/reopening the sidebar does not lose it) | P0 |
| F-16 | "Stop" button to cancel a running generation | P1 |
| F-17 | Streaming answers | P1 |
| F-18 | "Regenerate" on the last answer | P1 |
| F-19 | Conversation history (list, resume, delete, Markdown export) | P2 |

### 4.3 Providers / endpoints

| ID | Requirement | Prio |
|---|---|---|
| F-20 | Providers: Anthropic (Claude), OpenAI, OVHcloud AI Endpoints, Ollama — same API layer as Quill for Thunderbird | P0 |
| F-21 | Several providers can be enabled; the active one is picked in the sidebar | P0 |
| F-22 | Per provider: API key, URL (OVH/Ollama), model; live model list | P0 |
| F-23 | "Test connection" button | P0 |
| F-24 | Generic "OpenAI-compatible" endpoint (LM Studio, vLLM, Mistral, Groq, OpenRouter…) with a free URL | P1 |
| F-25 | Customizable system prompt | P1 |
| F-26 | Import settings from Quill for Thunderbird (JSON export/import) | P2 |

### 4.4 Current page context

| ID | Requirement | Prio |
|---|---|---|
| F-30 | Show the current page: favicon, title, domain/URL | P0 |
| F-31 | **Page** toggle: attaches the page title, URL and text to the message | P0 |
| F-32 | Main text extraction (`<article>`, `<main>`, else `<body>`), cleaned and truncated to a configurable limit | P0 |
| F-33 | Use the current selection when there is one | P0 |
| F-34 | Automatic update on tab switch or navigation | P0 |
| F-35 | Unreadable pages (`about:`, `moz-extension:`, addons.mozilla.org, PDF.js viewer): explicit message, chat still available | P0 |
| F-36 | Site access requested **on demand** (optional permission), not at install | P0 |
| F-37 | Page content sent once per page change (not repeated with every message) | P0 |
| F-38 | Read PDFs opened in Firefox and YouTube transcripts | P2 |
| F-39 | Readability-style extraction (better main-content detection) | P1 |
| F-40 | Tab screenshot sent to vision models | P2 |
| F-41 | Multi-tab interaction ("compare this tab with that one") | P2 |

### 4.5 Quick actions

| ID | Requirement | Prio |
|---|---|---|
| F-50 | Buttons: Summarize page, Key points, Translate, Explain selection | P0 |
| F-51 | Context menu: "Quill: summarize this page", "Quill: explain the selection", "Quill: translate the selection" | P0 |
| F-52 | Custom actions (name + prompt), as in Quill for Thunderbird | P1 |
| F-53 | Insert the answer into the page's focused input | P2 |

### 4.6 Options

| ID | Requirement | Prio |
|---|---|---|
| F-60 | Options page: providers, language, max answer length, max page content | P0 |
| F-61 | Interface language (FR/EN in v0.1; 8 languages later) and default answer language | P0 / P1 |

---

## 5. Non-functional requirements

### 5.1 Security and privacy

- **NF-01** API keys stored in `browser.storage.local` (never `sync`, never in code). Masked input.
- **NF-02** No telemetry, no intermediate server: requests go straight from the extension to the provider.
- **NF-03** Page content is read **only** when the user turns on **Page** or runs an action; a visible indicator shows it.
- **NF-04** Least privilege: `host_permissions` limited to the provider APIs; site access is an **optional permission** (`optional_host_permissions`) requested on first use.
- **NF-05** Answer rendering: systematic HTML escaping before Markdown formatting, parsed with `DOMParser` (no `innerHTML` with dynamic data); links open with `rel="noopener noreferrer"`; default MV3 CSP (no `eval`, no remote code).
- **NF-06** Page content is treated as **data**: wrapped in `<page>…</page>` and the system prompt tells the model never to follow instructions found inside it (prompt-injection mitigation).
- **NF-07** Published privacy policy (required by addons.mozilla.org), and the `data_collection_permissions` manifest key declared before AMO submission.

### 5.2 Performance

- **NF-10** Sidebar opens in < 300 ms.
- **NF-11** Page extraction < 500 ms on a standard page; default limit 20,000 characters.
- **NF-12** Stateless background event page (Firefox can unload it at any time): state lives in `browser.storage`.

### 5.3 Compatibility

- **NF-20** Firefox ≥ 128 (MV3 with `scripting`, `storage.session`, `optional_host_permissions`).
- **NF-21** Ollama requires `OLLAMA_ORIGINS=moz-extension://*` (documented).

### 5.4 Accessibility / UX

- **NF-30** Full keyboard navigation, visible focus, ARIA labels, WCAG AA contrast.

### 5.5 Maintainability

- **NF-40** The **core** (`API.js`, `providers.js`) is identical to Quill for Thunderbird and Quill-Chrome; Firefox natively provides the promise-based `browser.*` namespace the core uses. v0.3 goal: one shared `core/` and a build script producing every package.
- **NF-41** Native ES modules, no dependencies or bundler in v0.1.

---

## 6. Technical architecture

```
Quill-Firefox/
├── manifest.json            MV3: sidebar_action, options_ui, commands, permissions
├── background.js            Event page: toolbar button, context menus (`menus`),
│                            opening the sidebar, handing requests to the sidebar
├── core/                    Core shared with Quill for Thunderbird
│   ├── compat.js            Fallback shim (Firefox already has `browser`)
│   ├── providers.js         Provider registry + stored configuration
│   ├── API.js               Anthropic / OpenAI / OVHcloud / Ollama calls
│   ├── page.js              Reads the active tab (scripting.executeScript)
│   ├── markdown.js          Safe Markdown renderer
│   └── i18n.js              FR / EN strings
├── sidebar/                 Sidebar UI (chat + context)
├── options/                 Settings page
├── _locales/{en,fr}/        Extension name / description
└── images/                  Icons
```

### "Talk with the page" flow

```
User ──► Sidebar (sidebar.js)
            │ 1. browser.tabs.query(active tab)
            │ 2. browser.scripting.executeScript(extraction) ──► Web page
            │ 3. Builds the messages:
            │      system = Quill prompt + safety rules
            │      user   = <page url title>text</page> + question
            │ 4. fetchResponse(active config, messages) ──► Provider API
            ◄────────────────────────────────────────── answer
            │ 5. Safe Markdown rendering + Copy button
```

### Context menu flow

```
Right click ─► background.js: browser.sidebarAction.open()
                             + browser.storage.session.set({ pendingRequest })
Sidebar     ◄─ storage.onChanged / read on load ─► runs the action
```

### Permissions

| Permission | Reason |
|---|---|
| `storage` | Settings and conversation |
| `tabs` | Read the active tab's title / URL and follow changes |
| `activeTab` | One-off page access after a click (icon, context menu) |
| `scripting` | Extract the page text |
| `menus` | Right-click entries |
| `host_permissions` (APIs) | `api.anthropic.com`, `api.openai.com`, `*.ai.cloud.ovh.net`, `localhost` |
| `optional_host_permissions` `<all_urls>` | Reading pages and custom Ollama/OVH URLs, requested on demand |

---

## 7. Interface (wireframe)

```
┌─────────────────────────────────────┐
│ ✒ Quill   [Claude · sonnet-5-5 ▾] ＋ ⚙│  header (sidebar)
├─────────────────────────────────────┤
│ 🌐 Page title                        │  context card
│    example.com/article     [● Page] │  (toggle)
│ [Summarize] [Key points] [Translate]│  quick actions
│ [Explain selection]                 │
├─────────────────────────────────────┤
│                    What is the      │
│                    conclusion?   ◄──┤ user
│ ┌─────────────────────────────┐     │
│ │ The article concludes that… │ ⧉   │ assistant + copy
│ └─────────────────────────────┘     │
├─────────────────────────────────────┤
│ [Ask a question…            ] [➤]  │  input
└─────────────────────────────────────┘
```

---

## 8. Roadmap

| Version | Content | Estimate |
|---|---|---|
| **v0.1 — MVP** | Sidebar, multi-turn chat, 4 providers, provider selector, page context (URL/title/text/selection), 4 quick actions, context menu, options, FR/EN | shipped with this document |
| v0.2 | Streaming, Stop, Regenerate, Readability-style extraction | 1–2 weeks |
| v0.3 | Core shared between Thunderbird / Chrome / Firefox + build script, generic OpenAI-compatible endpoint, custom system prompt | 1–2 weeks |
| v0.4 | Custom actions, 8 languages, answer language | 1 week |
| v0.5 | Conversation history, Markdown export | 1 week |
| v1.0 | addons.mozilla.org release (listing, screenshots, privacy policy, data collection declaration), e2e tests (web-ext + Selenium) | 1–2 weeks |
| v1.x | PDF / YouTube, vision (tab capture), multi-tab, insert into page | — |

---

## 9. v0.1 acceptance criteria

1. The add-on loads without errors from `about:debugging#/runtime/this-firefox` → "Load Temporary Add-on…" → `manifest.json`, and `web-ext lint` reports 0 errors.
2. Clicking the toolbar button (or `Alt+Shift+Q`) opens the Quill sidebar.
3. With a valid Anthropic key, a question gets an answer; a follow-up question takes the first one into account.
4. The active provider can be changed from the sidebar; the next answer uses the new provider.
5. On a web article, **Summarize** produces a summary of the page content.
6. Switching tabs updates the context card.
7. On `about:preferences`, the card says the page cannot be read and the chat still works.
8. Right click on a selection → "Explain the selection" opens the sidebar and answers about that text.
9. An invalid key shows an understandable error and the question is restored in the input.
10. No network call other than to the configured provider (check the Network tab of the add-on's `about:debugging` → Inspect).

---

## 10. Risks

| Risk | Mitigation |
|---|---|
| Prompt injection through page content | Content wrapped, explicit rule in the system prompt, no automatic action on the page |
| Very long pages → cost / context limit | Configurable truncation, content sent once per page |
| AMO review (broad permissions) | `<all_urls>` only as an optional permission, justified in the listing |
| Ollama CORS | Document `OLLAMA_ORIGINS=moz-extension://*` |
| Event page unloaded | No in-memory state in the background; everything goes through `browser.storage` |
| Code drifting from Quill for Thunderbird | Shared core (v0.3) |
