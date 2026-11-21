// Quill Firefox - reading the active tab (title, URL, text, selection).

// Firefox never lets extensions script its own pages, the add-ons site or PDF.js.
const RESTRICTED = /^(about|moz-extension|resource|chrome|view-source|jar|data|blob):/i;
const STORES = /^https:\/\/(addons\.mozilla\.org|accounts-static\.cdn\.mozilla\.net|accounts\.firefox\.com)\//i;
const PDF = /\.pdf([?#]|$)/i;

export const getActiveTab = async () => {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    return tab || null;
};

export const isRestricted = (url) => !url || RESTRICTED.test(url) || STORES.test(url) || PDF.test(url);

export const hostOf = (url) => {
    try { return new URL(url).hostname || url; } catch { return url || ""; }
};

// Runs inside the web page: keep it self-contained (no closures).
function quillExtract(maxChars) {
    const clean = (s) => String(s || "").replace(/[ \t ]+/g, " ").replace(/\n\s*\n\s*\n+/g, "\n\n").trim();
    const selection = clean(window.getSelection ? window.getSelection().toString() : "");
    let text = "";
    for (const sel of ["article", "main", "[role=main]"]) {
        const el = document.querySelector(sel);
        const candidate = el ? clean(el.innerText) : "";
        if (candidate.length > 500) { text = candidate; break; }
    }
    if (!text) text = clean(document.body ? document.body.innerText : "");
    const meta = document.querySelector('meta[name="description"], meta[property="og:description"]');
    const limit = maxChars > 0 ? maxChars : 20000;
    return {
        title: document.title,
        url: location.href,
        lang: document.documentElement.lang || "",
        description: meta ? clean(meta.content) : "",
        selection: selection.slice(0, limit),
        text: text.slice(0, limit),
        truncated: text.length > limit
    };
}

// Throws an Error with .kind = "restricted" | "permission".
export const readPage = async (tab, maxChars) => {
    if (!tab || isRestricted(tab.url)) {
        const err = new Error("restricted"); err.kind = "restricted"; throw err;
    }
    try {
        const [result] = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: quillExtract,
            args: [maxChars]
        });
        return result.result;
    } catch (error) {
        console.warn("Quill: page read failed", error);
        const err = new Error(error.message);
        err.kind = /cannot access|permission|host/i.test(error.message) ? "permission" : "restricted";
        throw err;
    }
};

export const requestPageAccess = () => browser.permissions.request({ origins: ["<all_urls>"] });

// The block attached to a user message.
export const formatPage = (page, { withText = true } = {}) => {
    const attrs = `url="${page.url}" title="${String(page.title).replace(/"/g, "'")}"`;
    const parts = [];
    if (page.description) parts.push(`Description: ${page.description}`);
    if (withText) parts.push(page.text + (page.truncated ? "\n[…truncated]" : ""));
    return `<page ${attrs}>\n${parts.join("\n\n")}\n</page>`;
};
