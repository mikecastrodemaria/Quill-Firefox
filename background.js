// Quill Firefox - background (event page).
// Stateless on purpose: Firefox can unload it at any time, so requests for the
// sidebar go through browser.storage.session.

const MENUS = [
    { id: "quill-summarize", contexts: ["page"], title: "menuSummarize" },
    { id: "quill-explain", contexts: ["selection"], title: "menuExplain" },
    { id: "quill-translate", contexts: ["selection"], title: "menuTranslate" },
    { id: "quill-image", contexts: ["image"], title: "menuImage" }
];

const setup = async () => {
    await browser.menus.removeAll();
    for (const m of MENUS) {
        browser.menus.create({ id: m.id, contexts: m.contexts, title: browser.i18n.getMessage(m.title) });
    }
};

browser.runtime.onInstalled.addListener(setup);
browser.runtime.onStartup.addListener(setup);

// Toolbar button toggles the sidebar (must run synchronously in the user gesture).
browser.action.onClicked.addListener(() => {
    browser.sidebarAction.toggle();
});

browser.menus.onClicked.addListener((info, tab) => {
    browser.sidebarAction.open();
    browser.storage.session.set({
        pendingRequest: {
            action: String(info.menuItemId).replace("quill-", ""),
            text: info.selectionText || "",
            src: info.srcUrl || "",
            tabId: tab?.id,
            ts: Date.now()
        }
    });
});
