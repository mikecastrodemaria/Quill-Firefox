// Quill Firefox - settings page. Every change is saved immediately.

import '../core/compat.js';
import { fetchProviderModels, testProvider } from '../core/API.js';
import { PROVIDERS, PROVIDER_IDS, loadProviderState, setActiveProvider } from '../core/providers.js';
import { getLanguage, t, applyI18n, formatError, LANGUAGES } from '../core/i18n.js';

const $ = (id) => document.getElementById(id);
let lang = "en";
let state; // { providers, enabled, active, maxTokens }

// Hosts already granted by host_permissions in manifest.json.
const isCovered = (url) => {
    try {
        const { hostname } = new URL(url);
        return ["localhost", "127.0.0.1"].includes(hostname) || hostname.endsWith(".ai.cloud.ovh.net");
    } catch { return true; }
};

// Must be called synchronously from a click: permissions.request needs the user gesture.
const ensureHostAccess = (id) => {
    const url = state.providers[id].url;
    if (!PROVIDERS[id].hasUrl || !url || isCovered(url)) return Promise.resolve(true);
    try {
        return browser.permissions.request({ origins: [`${new URL(url).origin}/*`] });
    } catch { return Promise.resolve(true); }
};

let savedTimer;
const flashSaved = () => {
    $("saved").hidden = false;
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => { $("saved").hidden = true; }, 1200);
};

const saveProviders = async () => {
    await browser.storage.local.set({ providers: state.providers });
    flashSaved();
};

const fillModels = (select, models, current) => {
    const list = [...models];
    if (current && !list.some(m => m.id === current)) list.unshift({ id: current, name: current });
    select.textContent = "";
    for (const m of list) {
        const opt = document.createElement("option");
        opt.value = m.id;
        opt.textContent = m.name;
        opt.selected = m.id === current;
        select.appendChild(opt);
    }
};

const configFor = (id) => {
    const p = state.providers[id];
    return { provider: id, apiKey: (p.apiKey || "").trim(), url: (p.url || "").trim(), model: p.model, maxTokens: state.maxTokens };
};

const renderActive = () => {
    const select = $("active");
    const enabled = PROVIDER_IDS.filter(id => state.providers[id].enabled);
    if (!enabled.includes(state.active)) {
        state.active = enabled[0] || "anthropic";
        setActiveProvider(state.active);
    }
    select.textContent = "";
    for (const id of enabled.length ? enabled : [state.active]) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = PROVIDERS[id].label;
        opt.selected = id === state.active;
        select.appendChild(opt);
    }
};

const renderProvider = (id) => {
    const def = PROVIDERS[id];
    const cfg = state.providers[id];
    const node = $("provider-tpl").content.firstElementChild.cloneNode(true);
    applyI18n(lang, node);
    const q = (sel) => node.querySelector(sel);

    q(".p-label").textContent = def.label;
    const enabled = q(".p-enabled");
    enabled.checked = !!cfg.enabled;
    node.classList.toggle("on", enabled.checked);
    enabled.addEventListener("change", async () => {
        cfg.enabled = enabled.checked;
        node.classList.toggle("on", cfg.enabled);
        await saveProviders();
        renderActive();
    });

    if (def.noKey) {
        q(".p-key-field").hidden = true;
    } else {
        const key = q(".p-key");
        key.value = cfg.apiKey || "";
        key.placeholder = def.keyPlaceholder || "";
        q(".p-key-link").href = def.keyUrl;
        key.addEventListener("change", () => { cfg.apiKey = key.value.trim(); saveProviders(); });
        if (def.keyOptional) {
            q(".p-key-hint").textContent = t(lang, "optKeyOptional");
            q(".p-key-hint").hidden = false;
        }
    }

    if (def.hasUrl) {
        const url = q(".p-url");
        url.value = cfg.url || def.defaultUrl;
        url.placeholder = def.defaultUrl;
        url.addEventListener("change", () => { cfg.url = url.value.trim() || def.defaultUrl; url.value = cfg.url; saveProviders(); });
        if (id === "ollama") {
            q(".p-url-hint").textContent = t(lang, "optOllamaHint");
            q(".p-url-hint").hidden = false;
        }
    } else {
        q(".p-url-field").hidden = true;
    }

    const model = q(".p-model");
    fillModels(model, def.models, cfg.model);
    model.addEventListener("change", () => { cfg.model = model.value; saveProviders(); });

    const status = q(".p-status");
    const setStatus = (text, kind = "") => { status.textContent = text; status.className = `p-status small ${kind}`; };
    const fail = (error) => {
        error.hasKey = !!cfg.apiKey;
        setStatus(formatError(lang, error, def.short), "err");
    };

    const loadBtn = q(".p-load");
    loadBtn.addEventListener("click", () => {
        const access = ensureHostAccess(id);
        loadBtn.disabled = true;
        setStatus("…");
        access.then(() => fetchProviderModels(id, configFor(id)))
            .then((models) => {
                fillModels(model, models, cfg.model);
                setStatus(`${models.length} ✓`, "ok");
            })
            .catch(fail)
            .finally(() => { loadBtn.disabled = false; });
    });

    const testBtn = q(".p-test");
    testBtn.addEventListener("click", () => {
        const access = ensureHostAccess(id);
        testBtn.disabled = true;
        setStatus("…");
        access.then(() => testProvider(id, configFor(id)))
            .then((models) => {
                if (models.length) fillModels(model, models, cfg.model);
                setStatus(t(lang, "optTestOk", { n: models.length }), "ok");
            })
            .catch(fail)
            .finally(() => { testBtn.disabled = false; });
    });

    return node;
};

const init = async () => {
    lang = await getLanguage();
    applyI18n(lang);
    state = await loadProviderState();
    const { maxPageChars } = await browser.storage.local.get(["maxPageChars"]);

    const language = $("language");
    for (const l of LANGUAGES) {
        const opt = document.createElement("option");
        opt.value = l.id;
        opt.textContent = l.name;
        opt.selected = l.id === lang;
        language.appendChild(opt);
    }
    language.addEventListener("change", async () => {
        await browser.storage.local.set({ language: language.value });
        location.reload();
    });

    const maxTokens = $("max-tokens");
    maxTokens.value = String(state.maxTokens);
    if (!maxTokens.value) maxTokens.value = "4096";
    maxTokens.addEventListener("change", async () => {
        state.maxTokens = parseInt(maxTokens.value, 10);
        await browser.storage.local.set({ maxTokens: state.maxTokens });
        flashSaved();
    });

    const maxPage = $("max-page");
    maxPage.value = parseInt(maxPageChars, 10) || 20000;
    maxPage.addEventListener("change", async () => {
        const value = Math.max(1000, parseInt(maxPage.value, 10) || 20000);
        maxPage.value = value;
        await browser.storage.local.set({ maxPageChars: value });
        flashSaved();
    });

    $("active").addEventListener("change", async () => {
        state.active = $("active").value;
        await setActiveProvider(state.active);
        flashSaved();
    });

    const container = $("providers");
    PROVIDER_IDS.forEach(id => container.appendChild(renderProvider(id)));
    renderActive();

    // Keep in sync when the side panel switches provider.
    browser.storage.onChanged.addListener((changes, area) => {
        if (area === "local" && changes.activeProvider) {
            state.active = changes.activeProvider.newValue;
            renderActive();
        }
    });
};

document.addEventListener("DOMContentLoaded", init);
