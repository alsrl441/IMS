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
        
        // 초기 가이드 문서가 없으면 생성 제안 (생략 가능)
    }

    async function refreshDocLists() {
        documents = await window.getDBData(STORE_NAME);
        renderSidebar(documents);
    }

    function renderSidebar(docs) {
        // 전체 목록 (가나다 순)
        const sortedAll = [...docs].sort((a, b) => a.title.localeCompare(b.title));
        allDocsList.innerHTML = sortedAll.map(doc => 
            `<li><a data-id="${doc.id}">${doc.title}</a></li>`
        ).join('');

        // 이벤트 바인딩
        document.querySelectorAll('.sidebar-list a').forEach(a => {
            a.onclick = () => loadDocument(a.getAttribute('data-id'));
        });
    }

    async function loadDocument(id) {
        const doc = documents.find(d => d.id === id);
        if (!doc) return;

        currentDocId = id;
        docTitle.textContent = doc.title;
        
        // 커스텀 바닐라 JS 마크다운 파서 사용
        docBody.innerHTML = parseMarkdown(doc.content);
        
        // 내부 링크 클릭 이벤트 위임
        bindInternalLinks();
        
        // TOC Generation
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
                        // 문서가 없으면 새 문서 만들기 모드로 전환
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

        // 1. HTML 엔티티 이스케이프 (코드 블록 제외 처리를 위해 먼저 수행)
        let html = markdown
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 2. 다중 행 코드 블록 처리 (기존 마크다운 파싱에서 제외)
        const codeBlocks = [];
        html = html.replace(/^```(\w+)?\n([\s\S]*?)\n```/gm, (match, lang, content) => {
            const id = `__CODE_BLOCK_${codeBlocks.length}__`;
            codeBlocks.push(`<pre><code class="language-${lang || 'none'}">${content}</code></pre>`);
            return id;
        });

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
                // 헤더 개수에 맞춰 셀 생성
                for (let j = 0; j < headers.length; j++) {
                    tableHtml += `<td>${parseInline(cols[j] || '')}</td>`;
                }
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table>';
            return tableHtml;
        }

        function parseInline(text) {
            if (!text) return "";
            let inline = text;
            
            // 이스케이프 문자 처리 (\` -> `, \\ -> \)
            inline = inline.replace(/\\`/g, '&#96;').replace(/\\\\/g, '&#92;');

            // 이미지: ![alt](url)
            inline = inline.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="wiki-img">');

            // 내부 링크: [[문서명#섹션|표시명]]
            inline = inline.replace(/\[\[(.*?)(#(.*?))?(\|(.*?))?\]\]/g, (match, docName, hashPart, hash, pipePart, displayText) => {
                const finalDocName = docName ? docName.trim() : "";
                const finalHash = hash ? hash.trim() : "";
                const finalDisplay = displayText ? displayText.trim() : (finalDocName + (finalHash ? '#' + finalHash : ""));
                return `<a class="wiki-internal-link" data-target="${finalDocName}" data-hash="${finalHash}" href="#">${finalDisplay}</a>`;
            });

            // 외부 링크: [표시명](주소)
            inline = inline.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

            // 글자 모양 (중첩 가능하도록 순차 처리)
            inline = inline.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
            inline = inline.replace(/\*(.*?)\*/g, '<em>$1</em>');
            inline = inline.replace(/~(.*?)~/g, '<del>$1</del>');
            inline = inline.replace(/`(.*?)`/g, '<code>$1</code>');

            return inline;
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            
            // 코드 블록 치환자 처리
            if (trimmed.startsWith('__CODE_BLOCK_') && trimmed.endsWith('__')) {
                closeLists();
                closeTable();
                result.push(trimmed);
                return;
            }

            // 1. 제목 (Headers)
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

            // 2. 구분선 (Horizontal Rule)
            if (trimmed === '---' || trimmed === '***') {
                closeLists();
                closeTable();
                result.push('<hr>');
                return;
            }

            // 3. 인용구 (Blockquote)
            if (trimmed.startsWith('&gt;')) {
                closeLists();
                closeTable();
                const content = parseInline(line.replace(/^\s*&gt;\s?/, ''));
                result.push(`<blockquote>${content}</blockquote>`);
                return;
            }

            // 4. 표 (Table)
            if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
                closeLists();
                inTable = true;
                tableRows.push(line);
                return;
            } else if (inTable && trimmed !== '') {
                // 표 진행 중
                tableRows.push(line);
                return;
            } else {
                closeTable();
            }

            // 5. 목록 (List)
            const ulMatch = line.match(/^(\s*)([-*+])\s+(.*)$/);
            // 숫자 목록 및 2-1. 형태 대응
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
                    // 들여쓰기는 같은데 타입이 다른 경우 처리
                    if (listStack.length > 0 && listStack[listStack.length - 1].type !== type) {
                        result.push(`</${listStack.pop().type}>`);
                        result.push(`<${type}>`);
                        listStack.push({ type, indent });
                    }
                } else if (listStack[listStack.length - 1].type !== type) {
                    result.push(`</${listStack.pop().type}>`);
                    result.push(`<${type}>`);
                    listStack.push({ type, indent });
                }

                result.push(`<li>${content}</li>`);
                return;
            } else {
                closeLists();
            }

            // 6. 일반 텍스트 및 빈 줄
            if (trimmed === '') {
                result.push('<br>');
            } else {
                result.push(`<p>${parseInline(line)}</p>`);
            }
        });

        closeLists();
        closeTable();

        let finalHtml = result.join('\n');

        // 코드 블록 복원
        codeBlocks.forEach((block, index) => {
            finalHtml = finalHtml.replace(`__CODE_BLOCK_${index}__`, block);
        });

        return finalHtml;
    }

    function generateTOC() {
        const headers = docBody.querySelectorAll('h2, h3');
        if (headers.length === 0) {
            wikiToc.classList.add('hidden');
            return;
        }

        wikiToc.classList.remove('hidden');
        tocList.innerHTML = '';
        headers.forEach((h) => {
            const id = h.id;
            const li = document.createElement('li');
            li.style.paddingLeft = h.tagName === 'H3' ? '15px' : '0';
            li.innerHTML = `<a href="#${id}">${h.textContent}</a>`;
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

    // Event Handlers
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
        
        try {
            const db = await window.getDB();
            const tx = db.transaction(STORE_NAME, 'readwrite');
            tx.objectStore(STORE_NAME).delete(currentDocId);
            tx.oncomplete = async () => {
                db.close();
                await refreshDocLists();
                currentDocId = null;
                docTitle.textContent = '문서가 삭제되었습니다';
                docBody.innerHTML = '왼쪽에서 다른 문서를 선택해주세요.';
                wikiToc.classList.add('hidden');
            };
        } catch (err) { alert('삭제 실패'); }
    };

    saveBtn.onclick = async () => {
        const title = editDocTitle.value.trim();
        const content = markdownEditor.value;

        if (!title) return alert('제목을 입력해주세요.');

        const id = currentDocId || Date.now().toString();
        const newDoc = {
            id,
            title,
            content,
            updatedAt: Date.now()
        };

        try {
            await window.putDBData(STORE_NAME, newDoc);
            await refreshDocLists();
            loadDocument(id);
        } catch (err) { alert('저장 실패'); }
    };

    cancelBtn.onclick = () => {
        if (currentDocId) toggleEditMode(false);
        else {
            docTitle.textContent = 'Wiki';
            docBody.innerHTML = '왼쪽에서 문서를 선택하거나 새 문서를 만들어보세요.';
            toggleEditMode(false);
        }
    };

    // Search Logic
    wikiSearch.oninput = (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = documents.filter(doc => 
            doc.title.toLowerCase().includes(term) || 
            doc.content.toLowerCase().includes(term)
        );
        renderSidebar(filtered);
    };

    init();
});
