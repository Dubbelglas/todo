(() => {
    const URL_SUFFIXES = 'com org net edu gov mil int info biz name pro xyz online site app dev tech store shop blog cloud io ai co me tv us uk ca au nz ie de fr nl be lu ch at es pt it se no dk fi is pl cz sk hu ro bg gr tr ru ua il in cn jp kr tw hk sg my id th vn ph br mx ar cl za ng ke eg ae cat jobs museum travel coop aero co.uk org.uk ac.uk gov.uk com.au net.au org.au co.nz com.br com.cn com.sg co.in'.split(' ');
    const escapeHtml = window.TodoData.escapeHtml;

    function renderLinkedText(text) {
        const source = String(text);
        const suffixPattern = [...URL_SUFFIXES].sort((a, b) => b.length - a.length).map((value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
        const urlPattern = new RegExp(`(?:\\b(?:https?://|www\\.)[^\\s<]+|\\b[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\\.(?:${suffixPattern})(?:/[^\\s<]*)?)`, 'gi');
        const emailPattern = /\b[a-z0-9_+-](?:[a-z0-9.!#$%&'*+/=?^_`{|}~-]*[a-z0-9_+-])?@[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)*\.[a-z]{2,}\b/gi;
        const renderUrls = (segment) => {
            let result = '';
            let lastIndex = 0;
            for (const match of segment.matchAll(urlPattern)) {
                let url = match[0];
                let trailing = '';
                while (/[.,!?;:)]$/.test(url)) { trailing = url.slice(-1) + trailing; url = url.slice(0, -1); }
                if (!url) continue;
                const href = /^https?:\/\//i.test(url) ? url : `https://${url}`;
                result += escapeHtml(segment.slice(lastIndex, match.index));
                result += `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a>${escapeHtml(trailing)}`;
                lastIndex = match.index + match[0].length;
            }
            return result + escapeHtml(segment.slice(lastIndex));
        };
        let result = '';
        let lastIndex = 0;
        for (const match of source.matchAll(emailPattern)) {
            result += renderUrls(source.slice(lastIndex, match.index));
            result += `<button type="button" class="email-link" data-email="${escapeHtml(match[0])}" title="Copy email address">${escapeHtml(match[0])}</button>`;
            lastIndex = match.index + match[0].length;
        }
        return result + renderUrls(source.slice(lastIndex));
    }

    function renderInline(text) {
        const pattern = /(\*\*\*|___)(?=\S)(.+?\S)\1|(\*\*|__)(?=\S)(.+?\S)\3|~~(?=\S)(.+?\S)~~|(?<![\w])([*_])(?=\S)(.+?\S)\5(?![\w])/g;
        let html = '';
        let last = 0;
        for (const match of text.matchAll(pattern)) {
            html += renderLinkedText(text.slice(last, match.index));
            const body = match[2] || match[4] || match[6] || match[7];
            if (match[1]) html += `<strong><em>${renderLinkedText(body)}</em></strong>`;
            else {
                const tag = match[3] ? 'strong' : match[5] ? 'del' : 'em';
                html += `<${tag}>${renderLinkedText(body)}</${tag}>`;
            }
            last = match.index + match[0].length;
        }
        return html + renderLinkedText(text.slice(last));
    }

    const KEYWORDS = {
        python: new Set('and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield False None True self print range len str int float list dict set tuple bool open super type'.split(' ')),
        cpp: new Set('alignas auto bool break case catch char class const constexpr continue default delete do double else enum explicit extern false float for friend if inline int long namespace new nullptr operator private protected public return short signed sizeof static struct switch template this throw true try typedef typename union unsigned using virtual void volatile wchar_t std cout cin string vector'.split(' ')),
        rust: new Set('as async await break const continue crate dyn else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while i8 i16 i32 i64 i128 isize u8 u16 u32 u64 u128 usize f32 f64 bool char str String Vec Option Result Some None Ok Err'.split(' ')),
    };

    function highlightCode(code, language) {
        const lang = ({ py: 'python', 'c++': 'cpp', cc: 'cpp', hpp: 'cpp', rs: 'rust' })[language] || language;
        if (!KEYWORDS[lang]) return escapeHtml(code);
        const tokenPattern = /(\/\/[^\n]*|#[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_$][\w$]*\b)/g;
        let html = '';
        let last = 0;
        for (const match of code.matchAll(tokenPattern)) {
            html += escapeHtml(code.slice(last, match.index));
            const token = match[0];
            let kind = '';
            if (/^(\/\/|#|\/\*)/.test(token)) kind = 'comment';
            else if (/^["'`]/.test(token)) kind = 'string';
            else if (/^\d/.test(token)) kind = 'number';
            else if (KEYWORDS[lang].has(token)) kind = 'keyword';
            html += kind ? `<span class="code-${kind}">${escapeHtml(token)}</span>` : escapeHtml(token);
            last = match.index + token.length;
        }
        return html + escapeHtml(code.slice(last));
    }

    function renderDescription(description) {
        const lines = String(description).replace(/\r\n?/g, '\n').split('\n');
        const blocks = [];
        let paragraph = [];
        const flushParagraph = () => {
            if (paragraph.length) blocks.push(`<p>${paragraph.map(renderInline).join('<br>')}</p>`);
            paragraph = [];
        };
        for (let index = 0; index < lines.length;) {
            const fence = lines[index].match(/^\s*```\s*([\w#+.-]*)\s*$/);
            if (fence) {
                flushParagraph();
                const code = [];
                index += 1;
                while (index < lines.length && !/^\s*```\s*$/.test(lines[index])) code.push(lines[index++]);
                if (index < lines.length) index += 1;
                const language = fence[1].toLowerCase();
                blocks.push(`<pre class="code-block"><code class="language-${escapeHtml(language)}">${highlightCode(code.join('\n'), language)}</code></pre>`);
            } else if (!lines[index].trim()) {
                flushParagraph();
                index += 1;
            } else {
                const listMatch = lines[index].match(/^(\s*)([-*+] |\d+[.)]\s+)(.+)$/);
                if (listMatch) {
                    flushParagraph();
                    const ordered = /^\d/.test(listMatch[2]);
                    const tag = ordered ? 'ol' : 'ul';
                    const items = [];
                    while (index < lines.length) {
                        const item = lines[index].match(/^\s*([-*+] |\d+[.)]\s+)(.+)$/);
                        if (!item || /^\d/.test(item[1]) !== ordered) break;
                        items.push(`<li>${renderInline(item[2])}</li>`);
                        index += 1;
                    }
                    blocks.push(`<${tag}>${items.join('')}</${tag}>`);
                } else {
                    paragraph.push(lines[index++]);
                }
            }
        }
        flushParagraph();
        return blocks.join('');
    }

    window.TodoFormatting = { renderDescription };
})();
