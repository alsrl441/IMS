document.addEventListener('DOMContentLoaded', async () => {
    const STORE_NAME = 'wiki_docs';
    let documents = [];
    let currentDocId = null;

    // DOM Elements
    const wikiViewArea = document.getElementById('wikiViewArea');
    const wikiEditArea = document.getElementById('wikiEditArea');
    const docTitle = document.getElementById('docTitle');
    const docBody = document.getElementById('docBody');
    const wikiToc = document.getElementById('wikiToc');
    const tocList = document.getElementById('tocList');
    
    const editDocTitle = document.getElementById('editDocTitle');
    const markdownEditor = document.getElementById('markdownEditor');
    
    const allDocsList = document.getElementById('allDocs');
    const wikiSearch = document.getElementById('wikiSearch');
    
    const createBtn = document.getElementById('createNewDocBtn');
    const editBtn = document.getElementById('editDocBtn');
    const deleteBtn = document.getElementById('deleteDocBtn');
    const saveBtn = document.getElementById('saveDocBtn');
    const cancelBtn = document.getElementById('cancelEditBtn');

    // Initialize
    async function init() {
        await window.ensureStore(STORE_NAME, 'id');
        await refreshDocLists();
    }

    async function refreshDocLists() {
        documents = await window.getDBData(STORE_NAME);
        renderSidebar(documents);
    }

    function renderSidebar(docs, searchTerm = '') {
        const sortedDocs = [...docs].sort((a, b) => {
            if (searchTerm) {
                const getScore = (doc) => {
                    const term = searchTerm.toLowerCase();
                    const titleCount = (doc.title.toLowerCase().split(term).length - 1);
                    const contentCount = (doc.content.toLowerCase().split(term).length - 1);
                    return (titleCount * 2) + contentCount; // 제목 일치를 더 높게 가중치 부여 가능
                };
                const scoreA = getScore(a);
                const scoreB = getScore(b);
                if (scoreB !== scoreA) return scoreB - scoreA;
            }
            // 2순위 혹은 기본: 최근 수정일 순
            return (b.updatedAt || 0) - (a.updatedAt || 0);
        });

        allDocsList.innerHTML = sortedDocs.map(doc => 
            `<li><a data-id="${doc.id}">${doc.title}</a></li>`
        ).join('');

        document.querySelectorAll('.sidebar-list a').forEach(a => {
            a.onclick = () => loadDocument(a.getAttribute('data-id'));
        });
    }

    async function loadDocument(id) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        currentDocId = id;
        docTitle.textContent = doc.title;
        
        // 최근 수정일 표시
        const lastUpdateEl = document.getElementById('wikiLastUpdate');
        if (doc.updatedAt) {
            const date = new Date(doc.updatedAt);
            const y = date.getFullYear();
            const m = String(date.getMonth() + 1).padStart(2, '0');
            const d = String(date.getDate()).padStart(2, '0');
            const hh = String(date.getHours()).padStart(2, '0');
            const mm = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            lastUpdateEl.textContent = `최근 수정일: ${y}-${m}-${d} ${hh}:${mm}:${ss}`;
            lastUpdateEl.classList.remove('hidden');
        } else {
            lastUpdateEl.classList.add('hidden');
        }
        
        docBody.innerHTML = parseMarkdown(doc.content);
        bindInternalLinks();
        generateTOC();
        toggleEditMode(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function bindInternalLinks() {
        docBody.querySelectorAll('.wiki-internal-link').forEach(link => {
            link.onclick = (e) => {
                e.preventDefault();
                const targetTitle = link.getAttribute('data-target');
                const targetHash = link.getAttribute('data-hash');

                if (targetTitle) {
                    const targetDoc = documents.find(d => d.title === targetTitle);
                    if (targetDoc) {
                        loadDocument(targetDoc.id);
                        if (targetHash) {
                            setTimeout(() => {
                                const el = document.getElementById(targetHash);
                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                            }, 100);
                        }
                    } else {
                        if (confirm(`'${targetTitle}' 문서는 아직 없습니다. 새로 만드시겠습니까?`)) {
                            currentDocId = null;
                            editDocTitle.value = targetTitle;
                            markdownEditor.value = '';
                            toggleEditMode(true);
                        }
                    }
                } else if (targetHash) {
                    const el = document.getElementById(targetHash);
                    if (el) el.scrollIntoView({ behavior: 'smooth' });
                }
            };
        });
    }

    function parseMarkdown(markdown) {
        if (!markdown) return "";

        // 1. HTML 엔티티 이스케이프
        let html = markdown
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. 다중 행 코드 블록 보호
        const blockCodePlaceholders = [];
        html = html.replace(/(?:^|\n)```(\w+)?\n([\s\S]*?)\n```(?:\n|$)/g, (match, lang, content) => {
            const id = `BLOCK_CODE_PLC_${blockCodePlaceholders.length}`;
            let cleanContent = content
                .replace(/\\`/g, '&#96;')
                .replace(/\\\\/g, '&#92;');
            blockCodePlaceholders.push(`<pre><code class="language-${lang || 'none'}">${cleanContent}</code></pre>`);
            return `\n\n${id}\n\n`;
        });

        function parseInline(text) {
            if (!text) return "";
            let inline = text;
            const inlineCodePlaceholders = [];

            // [보호] 인라인 코드
            inline = inline.replace(/`((?:\\`|\\\\|[^`])+)`/g, (match, content) => {
                const id = `INLINE_CODE_PLC_${inlineCodePlaceholders.length}`;
                let cleanContent = content
                    .replace(/\\`/g, '&#96;')
                    .replace(/\\\\/g, '&#92;');
                inlineCodePlaceholders.push(`<code>${cleanContent}</code>`);
                return id;
            });

            // 이미지
            inline = inline.replace(/!\[(.*?)\]\((.*?)\)/g, (match, alt, urlPart) => {
                const parts = urlPart.split(',');
                const src = parts[0].trim();
                const width = (parts[1] && parts[1].trim() !== '') ? parts[1].trim() : null;
                const height = (parts[2] && parts[2].trim() !== '') ? parts[2].trim() : null;
                
                let style = '';
                if (width && !isNaN(width)) {
                    style += `width: ${width}px; `;
                    if (!height || isNaN(height)) {
                        style += `height: auto; `; // 너비만 있을 때 비율 유지
                    }
                }
                if (height && !isNaN(height)) {
                    style += `height: ${height}px; `;
                }
                
                const styleAttr = style ? ` style="${style.trim()}"` : '';
                return `<img src="${src}" alt="${alt}"${styleAttr} class="wiki-img">`;
            });

            // 내부 링크
            inline = inline.replace(/\[\[([^|#\]]+)?(?:#([^|\]]+))?(?:\|([^\]]+))?\]\]/g, (match, docName, hash, displayText) => {
                const finalDocName = docName ? docName.trim() : "";
                const rawHash = hash ? hash.trim() : "";
                const finalHash = rawHash.replace(/\s+/g, "-");
                let finalDisplay = displayText ? displayText.trim() : (finalDocName && rawHash ? `${finalDocName}#${rawHash}` : (finalDocName || rawHash));
                return `<a class="wiki-internal-link" data-target="${finalDocName}" data-hash="${finalHash}" href="#">${finalDisplay}</a>`;
            });

            // 외부 링크
            inline = inline.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

            // 글자 모양
            inline = inline.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            inline = inline.replace(/\*(.*?)\*/g, '<em>$1</em>');
            inline = inline.replace(/~(.*?)~/g, '<del>$1</del>');
            // 밑줄 (_텍스트_) - snake_case 보호를 위해 단어 경계 및 공백 체크 강화
            inline = inline.replace(/(^|[^a-zA-Z0-9])_(\S|\S.*?\S)_(?=[^a-zA-Z0-9]|$)/g, '$1<u>$2</u>');

            // [복원] 인라인 코드
            inlineCodePlaceholders.forEach((code, i) => {
                const id = `INLINE_CODE_PLC_${i}`;
                inline = inline.split(id).join(code);
            });

            return inline;
        }

        const lines = html.split('\n');
        let result = [];
        let listStack = [];
        let inTable = false;
        let tableRows = [];

        function closeLists() {
            while (listStack.length > 0) {
                result.push(`</${listStack.pop().type}>`);
            }
        }

        function closeTable() {
            if (inTable) {
                result.push(renderTable(tableRows));
                tableRows = [];
                inTable = false;
            }
        }

        function renderTable(rows) {
            if (rows.length < 2) return rows.join('<br>');
            const splitRow = (row) => {
                let parts = row.trim().split('|');
                if (parts[0] === '') parts.shift();
                if (parts[parts.length - 1] === '') parts.pop();
                return parts.map(p => p.trim());
            };
            const headers = splitRow(rows[0]);
            const separator = splitRow(rows[1]);
            if (!separator.every(s => /^-+$/.test(s))) {
                return rows.map(r => `<p>${parseInline(r)}</p>`).join('\n');
            }
            let tableHtml = '<table><thead><tr>';
            headers.forEach(h => tableHtml += `<th>${parseInline(h)}</th>`);
            tableHtml += '</tr></thead><tbody>';
            for (let i = 2; i < rows.length; i++) {
                const cols = splitRow(rows[i]);
                tableHtml += '<tr>';
                for (let j = 0; j < headers.length; j++) {
                    tableHtml += `<td>${parseInline(cols[j] || '')}</td>`;
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
            return tableHtml;
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            
            if (/^BLOCK_CODE_PLC_\d+$/.test(trimmed)) {
                closeLists();
                closeTable();
                result.push(trimmed);
                return;
            }

            const headerMatch = line.match(/^(#{1,6})\s+(.*)$/);
            if (headerMatch) {
                closeLists();
                closeTable();
                const level = headerMatch[1].length;
                const content = parseInline(headerMatch[2]);
                const id = content.replace(/<\/?[^>]+(>|$)/g, "").replace(/\s+/g, "-").trim();
                result.push(`<h${level} id="${id}">${content}</h${level}>`);
                return;
            }

            if (trimmed === '---' || trimmed === '***') {
                closeLists();
                closeTable();
                result.push('<hr>');
                return;
            }

            if (trimmed.startsWith('&gt;')) {
                closeLists();
                closeTable();
                const content = parseInline(line.replace(/^\s*&gt;\s?/, ''));
                result.push(`<blockquote>${content}</blockquote>`);
                return;
            }

            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                closeLists();
                inTable = true;
                tableRows.push(line);
                return;
            } else if (inTable && trimmed !== '') {
                tableRows.push(line);
                return;
            } else {
                closeTable();
            }

            const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
            const olMatch = line.match(/^(\s*)(\d+[\d.-]*\.)\s+(.*)$/);
            if (ulMatch || olMatch) {
                const indent = (ulMatch || olMatch)[1].length;
                const type = ulMatch ? 'ul' : 'ol';
                const content = parseInline((ulMatch || olMatch)[3]);
                if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
                    result.push(`<${type}>`);
                    listStack.push({ type, indent });
                } else if (indent < listStack[listStack.length - 1].indent) {
                    while (listStack.length > 0 && indent < listStack[listStack.length - 1].indent) {
                        result.push(`</${listStack.pop().type}>`);
                    }
                }
                result.push(`<li>${content}</li>`);
                return;
            } else {
                closeLists();
            }

            if (trimmed === '') {
                result.push('<br>');
            } else {
                result.push(`<p>${parseInline(line)}</p>`);
            }
        });

        closeLists();
        closeTable();

        let finalHtml = result.join('\n');
        blockCodePlaceholders.forEach((block, i) => {
            const id = `BLOCK_CODE_PLC_${i}`;
            finalHtml = finalHtml.split(id).join(block);
        });

        return finalHtml;
    }

    function generateTOC() {
        const headers = Array.from(docBody.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const tocHeaders = headers.filter(h => /^(\d+[\d.-]*\.)/.test(h.textContent.trim()));

        if (tocHeaders.length === 0) {
            wikiToc.classList.add('hidden');
            return;
        }

        wikiToc.classList.remove('hidden');
        tocList.innerHTML = '';
        tocHeaders.forEach((h) => {
            const level = parseInt(h.tagName.substring(1));
            const id = h.id;
            const li = document.createElement('li');
            li.style.paddingLeft = `${(level - 1) * 15}px`;
            const a = document.createElement('a');
            a.href = `#${id}`;
            a.textContent = h.textContent;
            a.onclick = (e) => {
                e.preventDefault();
                const target = document.getElementById(id);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            };
            li.appendChild(a);
            tocList.appendChild(li);
        });
    }

    function toggleEditMode(isEdit) {
        if (isEdit) {
            wikiViewArea.classList.add('hidden');
            wikiEditArea.classList.remove('hidden');
        } else {
            wikiViewArea.classList.remove('hidden');
            wikiEditArea.classList.add('hidden');
        }
    }

    createBtn.onclick = () => {
        currentDocId = null;
        editDocTitle.value = '';
        markdownEditor.value = '';
        toggleEditMode(true);
    };

    editBtn.onclick = () => {
        const doc = documents.find(d => d.id === currentDocId);
        if (!doc) return;
        editDocTitle.value = doc.title;
        markdownEditor.value = doc.content;
        toggleEditMode(true);
    };

    deleteBtn.onclick = async () => {
        if (!currentDocId || !confirm('정말 이 문서를 삭제하시겠습니까?')) return;
        await window.deleteDBData(STORE_NAME, currentDocId);
        await refreshDocLists();
        currentDocId = null;
        docTitle.textContent = '문서가 삭제되었습니다';
        docBody.innerHTML = '왼쪽에서 다른 문서를 선택해주세요.';
        wikiToc.classList.add('hidden');
        document.getElementById('wikiLastUpdate').classList.add('hidden');
    };

    saveBtn.onclick = async () => {
        const title = editDocTitle.value.trim();
        const content = markdownEditor.value;
        if (!title) return alert('제목을 입력해주세요.');

        // 중복 제목 체크 (새 문서 생성 시 혹은 제목을 수정할 때)
        const isDuplicate = documents.some(doc => 
            doc.title === title && doc.id !== currentDocId
        );
        if (isDuplicate) {
            return alert('이미 같은 제목의 문서가 존재합니다. 다른 제목을 입력해주세요.');
        }

        const id = currentDocId || Date.now().toString();
        const newDoc = { id, title, content, updatedAt: Date.now() };
        await window.putDBData(STORE_NAME, newDoc);
        await refreshDocLists();
        loadDocument(id);
    };

    cancelBtn.onclick = () => {
        if (currentDocId) toggleEditMode(false);
        else {
            docTitle.textContent = 'Wiki';
            docBody.innerHTML = '왼쪽에서 문서를 선택하거나 새 문서를 만들어보세요.';
            toggleEditMode(false);
        }
    };

    wikiSearch.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = documents.filter(doc => 
            doc.title.toLowerCase().includes(term) || 
            doc.content.toLowerCase().includes(term)
        );
        renderSidebar(filtered, term);
    };

    init();
});
