# Privacy policy — Quill for Firefox

_Last updated: 2026-11-21_

Quill is a browser add-on published by Supersonique Studio SARL. It has no server of its own.

## What Quill does not do

- It does not collect, store or transmit any data to its developers.
- It contains no analytics, telemetry, advertising or tracking.
- It does not sell or share data with anyone.

## Data stored on your device

- **Settings** (enabled providers, API keys, endpoint URLs, models, language, limits) are stored locally with the browser's `storage.local` API. They never leave your device except as described below.
- **The current conversation** is kept in `storage.session` and is deleted when the browser closes.

## Data sent to the AI provider you choose

When you send a message, Quill sends it directly from your browser to the provider you configured: Anthropic, OpenAI, OVHcloud AI Endpoints, or your own Ollama server. The request contains:

- your message and the previous messages of the conversation;
- your API key for that provider (as an authentication header);
- **only when you turn on "Page" or use a quick action / context-menu entry**: the title, URL and text of the current page, or the text you selected.

Pages are never read in the background. Site access is an optional permission that you grant on first use and can revoke at any time in `about:addons`.

Each provider's own privacy policy applies to the data it receives:

- Anthropic: <https://www.anthropic.com/legal/privacy>
- OpenAI: <https://openai.com/policies/privacy-policy>
- OVHcloud: <https://www.ovhcloud.com/en/terms-and-conditions/privacy-policy/>
- Ollama runs on your own machine or server.

## Your control

- Remove an API key or disable a provider at any time in the options page.
- Uninstalling the add-on deletes all its stored data.

## Contact

Questions: open an issue at <https://github.com/mikecastrodemaria/Quill-Firefox/issues>.
