// Quill - page images: find them in the page, load them, shrink them for the model.
// Shared as-is by Quill-Chrome and Quill-Firefox (uses `browser.*`, see compat.js).

export const MAX_IMAGES = 4;
const MAX_SIDE = 1024;     // longest side sent to the model, in pixels
const MIN_SIDE = 100;      // smaller images are icons, logos, spacers…
const JPEG_QUALITY = 0.85;

// Runs inside the web page: keep it self-contained (no closures).
function quillListImages(minSide, max) {
    const seen = new Set();
    const list = [];
    for (const img of document.images) {
        const src = img.currentSrc || img.src;
        if (!src || seen.has(src) || !img.complete) continue;
        const rect = img.getBoundingClientRect();
        const style = getComputedStyle(img);
        if (style.display === "none" || style.visibility === "hidden" || rect.width < 1) continue;
        if (Math.min(img.naturalWidth, img.naturalHeight) < minSide) continue;
        if (Math.min(rect.width, rect.height) < minSide / 2) continue;
        seen.add(src);
        list.push({
            src,
            alt: (img.alt || img.title || "").replace(/\s+/g, " ").trim().slice(0, 300),
            area: rect.width * rect.height,
            top: rect.top + window.scrollY
        });
    }
    // Biggest images first, then keep page order among the ones we send.
    return list.sort((a, b) => b.area - a.area).slice(0, max).sort((a, b) => a.top - b.top)
        .map(({ src, alt }) => ({ src, alt }));
}

// [{ src, alt }] of the main images of the tab. Throws like readPage() (kind restricted | permission).
export const listPageImages = async (tab, max = MAX_IMAGES) => {
    try {
        const [result] = await browser.scripting.executeScript({
            target: { tabId: tab.id },
            func: quillListImages,
            args: [MIN_SIDE, max]
        });
        return result?.result || [];
    } catch (error) {
        const err = new Error(error.message);
        err.kind = /cannot access|permission|host|missing/i.test(error.message) ? "permission" : "restricted";
        throw err;
    }
};

const originPattern = (src) => {
    try {
        const { protocol, origin } = new URL(src);
        return /^https?:$/.test(protocol) ? `${origin}/*` : null;
    } catch { return null; }
};

// Loading cross-site images needs the optional site access permission.
export const missingAccess = async (sources) => {
    const origins = [...new Set(sources.map(originPattern).filter(Boolean))];
    if (!origins.length) return false;
    try {
        return !(await browser.permissions.contains({ origins }));
    } catch { return false; }
};

const blobToBase64 = (blob) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(",")[1] || "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
});

// Loads an image URL and returns { mediaType, data } as a JPEG of at most MAX_SIDE px.
export const loadImage = async (src) => {
    const response = await fetch(src, { credentials: "include" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    try {
        const img = new Image();
        img.src = url;
        await img.decode();
        const w = img.naturalWidth || MAX_SIDE;
        const h = img.naturalHeight || MAX_SIDE;
        const scale = Math.min(1, MAX_SIDE / Math.max(w, h));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(w * scale));
        canvas.height = Math.max(1, Math.round(h * scale));
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#fff";            // JPEG has no transparency
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const jpeg = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
        return { mediaType: "image/jpeg", data: await blobToBase64(jpeg) };
    } finally {
        URL.revokeObjectURL(url);
    }
};

// Loads several images; skips the ones that fail. Returns [{ src, alt, mediaType, data }].
export const loadImages = async (items) => {
    const results = await Promise.allSettled(items.map(async (item) => ({ ...item, ...(await loadImage(item.src)) })));
    return results.filter(r => r.status === "fulfilled").map(r => r.value);
};
