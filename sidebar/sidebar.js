// Quill Firefox - sidebar: chat + current page context.

import '../core/compat.js';
import { fetchResponse } from '../core/API.js';
import { PROVIDERS, loadProviderState, getActiveProviderConfig, setActiveProvider } from '../core/providers.js';
import { getLanguage, t, applyI18n, formatError, PAGE_RULES } from '../core/i18n.js';
import { getActiveTab, isRestricted, readPage, requestPageAccess, formatPage } from '../core/page.js';
import { renderMarkdown } from '../core/markdown.js';
import { listPageImages, missingAccess, loadImages } from '../core/images.js';

const DEFAULT_PAGE_CHARS = 20000;
const $ = (id) => document.getElementById(id);

const els = {
    provider: $("provider"),
    messages: $("messages"),
    input: $("input"),
    send: $("send"),
    include: $("include-page"),
    pageIcon: $("page-icon"),
    pageTitle: $("page-title"),
    pageUrl: $("page-url"),
    notice: $("page-notice"),
    noticeText: $("page-notice-text"),
    grant: $("grant-access"),
    actions: [...document.querySelectorAll("[data-action]")]
};

let lang = "en";
let windowId = null;
let currentTab = null;
let busy = false;
let retry = null;          // re-runs a send that failed for lack of page access
let lastPendingTs = 0;
// messages: API turns { role, content, display?, tag? } (system prompt is added at send time).
// pageSent: URL of the last page whose content was attached, so a page is sent only once.
let conv = { messages: [], pageSent: "" };

// ---------- Rendering ----------

// renderMarkdown() escapes everything it is given; parse its output instead of
// assigning innerHTML so nothing is ever executed.
const setMarkdown = (el, text) => {
    const doc = new DOMParser().parseFromString(renderMarkdown(text), "text/html");
    el.replaceChildren(...doc.body.childNodes);
};

const scrollDown = () => { els.messages.scrollTop = els.messages.scrollHeight; };

const copyText = async (text, button) => {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const area = document.createElement("textarea");
        area.value = text;
        document.body.appendChild(area);
        area.select();
        document.execCommand("copy");
        area.remove();
    }
    button.textContent = t(lang, "copied");
    setTimeout(() => { button.textContent = t(lang, "copy"); }, 1200);
};

const addBubble = (m) => {
    const div = document.createElement("div");
    div.className = `msg ${m.role}`;
    if (m.role === "assistant") {
        setMarkdown(div, m.content);
        const copy = document.createElement("button");
        copy.className = "copy-btn";
        copy.textContent = t(lang, "copy");
        copy.addEventListener("click", () => copyText(m.content, copy));
        div.appendChild(copy);
    } else if (m.role === "info") {
        setMarkdown(div, m.content);
    } else {
        div.textContent = m.display ?? m.content;
        if (m.images?.length) {
            const thumbs = document.createElement("div");
            thumbs.className = "thumbs";
            for (const i of m.images) {
                const img = document.createElement("img");
                img.src = `data:${i.mediaType};base64,${i.data}`;
                img.alt = "";
                thumbs.appendChild(img);
            }
            div.appendChild(thumbs);
        }
        if (m.tag) {
            const tag = document.createElement("span");
            tag.className = "tag";
            tag.textContent = m.tag;
            div.appendChild(tag);
        }
    }
    els.messages.appendChild(div);
    scrollDown();
    return div;
};

const renderAll = () => {
    els.messages.textContent = "";
    if (!conv.messages.length) addBubble({ role: "info", content: t(lang, "welcome") });
    conv.messages.forEach(addBubble);
};

const clearTransient = () => els.messages.querySelectorAll(".msg.error, .msg.info").forEach(el => el.remove());

// Images stay in memory only (storage.session is small): a reopened panel shows the tag.
const saveConv = () => browser.storage.session.set({
    conversation: { ...conv, messages: conv.messages.map(({ images, ...m }) => m) }
});

const setBusy = (value) => {
    busy = value;
    els.send.disabled = value;
    els.actions.forEach(b => { b.disabled = value || isRestricted(currentTab?.url); });
};

// ---------- Providers ----------

const refreshProviders = async () => {
    const { providers, enabled, active } = await loadProviderState();
    const ids = enabled.length ? enabled : [active];
    els.provider.textContent = "";
    for (const id of ids) {
        const opt = document.createElement("option");
        opt.value = id;
        opt.textContent = `${PROVIDERS[id].short} · ${providers[id].model}`;
        opt.selected = id === active;
        els.provider.appendChild(opt);
    }
    els.provider.title = els.provider.selectedOptions[0]?.textContent || "";
};

// ---------- Page context ----------

const showNotice = (text, withGrant = false) => {
    els.noticeText.textContent = text;
    els.grant.hidden = !withGrant;
    els.notice.hidden = false;
};

const updatePage = async () => {
    currentTab = await getActiveTab();
    const url = currentTab?.url || "";
    const restricted = isRestricted(url);

    els.pageTitle.textContent = currentTab?.title || t(lang, "pageNone");
    els.pageUrl.textContent = url.replace(/^https?:\/\//, "");
    els.pageUrl.title = url;
    const icon = currentTab?.favIconUrl;
    els.pageIcon.hidden = !(icon && /^(https?|data):/.test(icon));
    if (!els.pageIcon.hidden) els.pageIcon.src = icon;

    els.include.disabled = restricted;
    els.include.closest("label").title = restricted ? t(lang, "pageRestricted") : t(lang, "includePageTitle");
    els.actions.forEach(b => { b.disabled = busy || restricted; });
    if (restricted && url) showNotice(t(lang, "pageRestricted"));
    else els.notice.hidden = true;
};

const pageErrorNotice = (error) => {
    if (error.kind === "permission") showNotice(t(lang, "pageNeedsAccess"), true);
    else showNotice(t(lang, "pageRestricted"));
};

const maxPageChars = async () => {
    const { maxPageChars } = await browser.storage.local.get(["maxPageChars"]);
    return parseInt(maxPageChars, 10) || DEFAULT_PAGE_CHARS;
};

// ---------- Sending ----------

const systemPrompt = () => `${t(lang, "system")}\n\n${PAGE_RULES[lang] || PAGE_RULES.en}`;

/**
 * text:        what is sent to the model (after the page block, if any)
 * attachPage:  join the current page's content (once per page)
 * display/tag: what the user bubble shows
 * fromInput:   restore the text into the input box on failure
 * images:      [{ mediaType, data }] sent with the message (vision models)
 */
const send = async (text, { attachPage = els.include.checked, display, tag = "", fromInput = false, images } = {}) => {
    text = text.trim();
    if (!text || busy) return;
    clearTransient();
    retry = null;

    let content = text;
    const previousPage = conv.pageSent;
    if (attachPage) {
        currentTab = await getActiveTab();
        const url = currentTab?.url || "";
        if (conv.pageSent !== url) {
            try {
                const page = await readPage(currentTab, await maxPageChars());
                content = `${formatPage(page)}\n\n${text}`;
                conv.pageSent = url;
                tag = tag ? `${tag} · 📄 ${page.title || url}` : `📄 ${page.title || url}`;
            } catch (error) {
                pageErrorNotice(error);
                if (error.kind === "permission") retry = () => send(text, { attachPage, display, tag, fromInput, images });
                if (fromInput) els.input.value = text;
                return;
            }
        } else {
            content = `[Page: ${url}]\n${text}`;
        }
    }

    const userMsg = { role: "user", content, display: display ?? text, tag };
    if (images?.length) userMsg.images = images;
    conv.messages.push(userMsg);
    const userBubble = addBubble(userMsg);
    if (fromInput) { els.input.value = ""; autosize(); }
    setBusy(true);

    const pending = document.createElement("div");
    pending.className = "msg assistant";
    const spinner = document.createElement("span");
    spinner.className = "spinner";
    pending.appendChild(spinner);
    els.messages.appendChild(pending);
    scrollDown();

    let config = {};
    try {
        config = await getActiveProviderConfig();
        const reply = await fetchResponse(config, [{ role: "system", content: systemPrompt() }, ...conv.messages]);
        const assistantMsg = { role: "assistant", content: reply };
        conv.messages.push(assistantMsg);
        pending.remove();
        addBubble(assistantMsg);
        await saveConv();
    } catch (error) {
        console.error("Quill:", error);
        error.hasKey = !!config.apiKey;
        // Roll the failed turn back so it can simply be sent again.
        conv.messages.pop();
        conv.pageSent = previousPage;
        userBubble.remove();
        pending.remove();
        if (fromInput) els.input.value = text;
        let message = formatError(lang, error, config.label);
        if (images?.length && error.kind === "http") message += `\n\n${t(lang, "errVision", { m: config.model || "" })}`;
        addBubble({ role: "error", content: message });
    } finally {
        setBusy(false);
        els.input.focus();
    }
};

const sendSelection = (selection, promptKey, labelKey) => {
    const excerpt = selection.length > 140 ? `${selection.slice(0, 140)}…` : selection;
    return send(t(lang, promptKey, { text: selection }), {
        display: `${t(lang, labelKey)}\n« ${excerpt} »`,
        attachPage: false
    });
};

// Loads the images, then asks about them. items: [{ src, alt }]
const sendImages = async (items, promptKey, labelKey, page) => {
    if (busy) return;
    clearTransient();
    retry = null;
    setBusy(true);
    let loaded;
    try {
        loaded = await loadImages(items);
    } finally {
        setBusy(false);
    }
    if (loaded.length < items.length) {
        const failed = items.filter(i => !loaded.some(l => l.src === i.src)).map(i => i.src);
        if (await missingAccess(failed)) {
            showNotice(t(lang, "imagesNeedAccess"), true);
            retry = () => sendImages(items, promptKey, labelKey, page);
            return;
        }
    }
    if (!loaded.length) return addBubble({ role: "error", content: t(lang, "errImageLoad") });

    const lines = loaded.map((img, n) => `Image ${n + 1}${img.alt ? ` (alt: "${img.alt.replace(/"/g, "'")}")` : ""}`);
    // With "Page" on, the page text goes along so the model can relate images and text.
    const withText = els.include.checked && !isRestricted(page?.url);
    const context = !withText && page?.url ? `\n\n[Page: ${page.title || ""} - ${page.url}]` : "";
    const tag = `🖼 ${t(lang, loaded.length > 1 ? "nImages" : "oneImage", { n: loaded.length })}`;
    return send(`${t(lang, withText ? `${promptKey}Text` : promptKey)}\n\n${lines.join("\n")}${context}`, {
        attachPage: withText,
        display: t(lang, labelKey),
        tag,
        images: loaded.map(({ mediaType, data }) => ({ mediaType, data }))
    });
};

const PAGE_ACTIONS = {
    summarize: ["pSummarize", "actSummarize"],
    keypoints: ["pKeyPoints", "actKeyPoints"],
    translate: ["pTranslate", "actTranslate"]
};

const runAction = async (action) => {
    if (PAGE_ACTIONS[action]) {
        const [promptKey, labelKey] = PAGE_ACTIONS[action];
        return send(t(lang, promptKey), { attachPage: true, display: t(lang, labelKey) });
    }
    if (action === "images") {
        clearTransient();
        const tab = await getActiveTab();
        let items;
        try {
            if (isRestricted(tab?.url)) throw Object.assign(new Error("restricted"), { kind: "restricted" });
            items = await listPageImages(tab);
        } catch (error) {
            pageErrorNotice(error);
            if (error.kind === "permission") retry = () => runAction(action);
            return;
        }
        if (!items.length) return addBubble({ role: "info", content: t(lang, "noImages") });
        return sendImages(items, items.length > 1 ? "pImages" : "pImage", "actImages", tab);
    }
    if (action === "explain") {
        clearTransient();
        let page;
        try {
            page = await readPage(await getActiveTab(), await maxPageChars());
        } catch (error) {
            pageErrorNotice(error);
            if (error.kind === "permission") retry = () => runAction(action);
            return;
        }
        if (!page.selection) return addBubble({ role: "info", content: t(lang, "noSelection") });
        return sendSelection(page.selection, "pExplain", "actExplain");
    }
};

// Requests from the context menu (see background.js).
const handlePending = async (req) => {
    if (!req || req.ts === lastPendingTs || Date.now() - req.ts > 60000) return;
    lastPendingTs = req.ts;
    await browser.storage.session.remove("pendingRequest");
    await updatePage();
    if (req.action === "summarize") return runAction("summarize");
    if (req.action === "image" && req.src) return sendImages([{ src: req.src, alt: "" }], "pImage", "actImage", currentTab);
    if (req.action === "explain" && req.text) return sendSelection(req.text, "pExplain", "actExplain");
    if (req.action === "translate" && req.text) return sendSelection(req.text, "pTranslateSel", "actTranslate");
};

// ---------- Wiring ----------

const autosize = () => {
    els.input.style.height = "auto";
    els.input.style.height = `${Math.min(els.input.scrollHeight + 2, 160)}px`;
};

const init = async () => {
    lang = await getLanguage();
    applyI18n(lang);
    windowId = (await browser.windows.getCurrent()).id;

    const [{ conversation, pendingRequest }, { includePage }] = await Promise.all([
        browser.storage.session.get(["conversation", "pendingRequest"]),
        browser.storage.local.get(["includePage"])
    ]);
    if (conversation?.messages) conv = conversation;
    els.include.checked = !!includePage;

    renderAll();
    await Promise.all([refreshProviders(), updatePage()]);

    els.send.addEventListener("click", () => send(els.input.value, { fromInput: true }));
    els.input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
            e.preventDefault();
            send(els.input.value, { fromInput: true });
        }
    });
    els.input.addEventListener("input", autosize);

    els.include.addEventListener("change", () => browser.storage.local.set({ includePage: els.include.checked }));
    els.actions.forEach(b => b.addEventListener("click", () => runAction(b.dataset.action)));
    els.provider.addEventListener("change", () => setActiveProvider(els.provider.value));

    // permissions.request() must be called directly in the click handler.
    els.grant.addEventListener("click", () => {
        requestPageAccess().then((granted) => {
            if (!granted) return;
            els.notice.hidden = true;
            const again = retry;
            retry = null;
            again?.();
        });
    });

    $("new-chat").addEventListener("click", () => {
        if (busy) return;
        conv = { messages: [], pageSent: "" };
        saveConv();
        renderAll();
        els.input.focus();
    });
    $("open-settings").addEventListener("click", () => browser.runtime.openOptionsPage());

    // Follow the active tab of this window.
    browser.tabs.onActivated.addListener((info) => { if (info.windowId === windowId) updatePage(); });
    browser.tabs.onUpdated.addListener((tabId, change, tab) => {
        if (tab.active && tab.windowId === windowId && (change.url || change.title || change.favIconUrl || change.status === "complete")) {
            updatePage();
        }
    });
    browser.windows.onFocusChanged.addListener((id) => { if (id === windowId) updatePage(); });

    browser.storage.onChanged.addListener((changes, area) => {
        if (area === "session" && changes.pendingRequest?.newValue) handlePending(changes.pendingRequest.newValue);
        if (area === "local") {
            if (changes.language) location.reload();
            else if (changes.providers || changes.activeProvider) refreshProviders();
        }
    });

    await handlePending(pendingRequest);
    els.input.focus();
};

document.addEventListener("DOMContentLoaded", init);
