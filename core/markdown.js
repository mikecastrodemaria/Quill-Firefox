// Quill Firefox - small, safe Markdown renderer.
// Everything is HTML-escaped first; only a fixed set of tags is produced.

const escapeHtml = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const inline = (text) => {
    const codes = [];
    let s = escapeHtml(text).replace(/`([^`]+)`/g, (m, code) => {
        codes.push(code);
        return `\u0000${codes.length - 1}\u0000`;
    });
    s = s
        .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
            '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
        .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
        .replace(/__([^_]+)__/g, "<strong>$1</strong>")
        .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
        .replace(/~~([^~]+)~~/g, "<del>$1</del>");
    return s.replace(/\u0000(\d+)\u0000/g, (m, i) => `<code>${codes[i]}</code>`);
};

export const renderMarkdown = (source) => {
    const lines = String(source || "").replace(/\r\n?/g, "\n").split("\n");
    const out = [];
    let para = [];
    let list = null; // { type: "ul" | "ol", items: [] }

    const flushPara = () => {
        if (para.length) out.push(`<p>${para.map(inline).join("<br>")}</p>`);
        para = [];
    };
    const flushList = () => {
        if (list) out.push(`<${list.type}>${list.items.map(i => `<li>${inline(i)}</li>`).join("")}</${list.type}>`);
        list = null;
    };
    const flush = () => { flushPara(); flushList(); };

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        const fence = line.match(/^\s*```\s*([\w+-]*)/);
        if (fence) {
            flush();
            const code = [];
            while (++i < lines.length && !/^\s*```/.test(lines[i])) code.push(lines[i]);
            out.push(`<pre><code>${escapeHtml(code.join("\n"))}</code></pre>`);
            continue;
        }

        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading) {
            flush();
            const level = Math.min(heading[1].length + 2, 6); // h3..h6: small panel
            out.push(`<h${level}>${inline(heading[2])}</h${level}>`);
            continue;
        }

        if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { flush(); out.push("<hr>"); continue; }

        const quote = line.match(/^>\s?(.*)$/);
        if (quote) { flush(); out.push(`<blockquote>${inline(quote[1])}</blockquote>`); continue; }

        const ul = line.match(/^\s*[-*+]\s+(.*)$/);
        const ol = line.match(/^\s*\d+[.)]\s+(.*)$/);
        if (ul || ol) {
            flushPara();
            const type = ul ? "ul" : "ol";
            if (list && list.type !== type) flushList();
            if (!list) list = { type, items: [] };
            list.items.push((ul || ol)[1]);
            continue;
        }

        if (!line.trim()) { flush(); continue; }
        flushList();
        para.push(line);
    }
    flush();
    return out.join("");
};
