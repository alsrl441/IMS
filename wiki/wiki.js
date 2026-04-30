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
        let html = markdown
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        const lines = html.split('\n');
        let result = [];
        let listStack = []; // { type: 'ul'|'ol', indent: number }

        function closeLists(targetIndent = -1) {
            while (listStack.length > 0 && listStack[listStack.length - 1].indent > targetIndent) {
                result.push(`</${listStack.pop().type}>`);
            }
        }

        lines.forEach(line => {
            const trimmed = line.trim();
            const indent = line.search(/\S/);
            
            // 제목 (Header)
            if (trimmed.startsWith('### ')) {
                closeLists();
                const title = trimmed.slice(4).trim();
                result.push(`<h3 id="${title}">${title}</h3>`);
            } else if (trimmed.startsWith('## ')) {
                closeLists();
                const title = trimmed.slice(3).trim();
                result.push(`<h2 id="${title}">${title}</h2>`);
            } else if (trimmed.startsWith('# ')) {
                closeLists();
                const title = trimmed.slice(2).trim();
                result.push(`<h1 id="${title}">${title}</h1>`);
            }
            // 인용문 (Blockquote)
            else if (trimmed.startsWith('&gt; ')) {
                closeLists();
                result.push(`<blockquote>${trimmed.slice(5)}</blockquote>`);
            }
            // 구분선 (Horizontal Rule)
            else if (trimmed === '---' || trimmed === '***') {
                closeLists();
                result.push('<hr>');
            }
            // 목록 (List)
            else if (/^([-*]|\d+\.)\s/.test(trimmed)) {
                const isOrdered = /^\d+\.\s/.test(trimmed);
                const type = isOrdered ? 'ol' : 'ul';
                const content = isOrdered ? trimmed.replace(/^\d+\.\s/, '') : trimmed.slice(2);

                if (listStack.length === 0 || indent > listStack[listStack.length - 1].indent) {
                    result.push(`<${type}>`);
                    listStack.push({ type, indent });
                } else if (indent < listStack[listStack.length - 1].indent) {
                    closeLists(indent);
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
            }
            // 빈 줄
            else if (trimmed === '') {
                closeLists();
                result.push('<br>');
            }
            // 일반 텍스트 (Paragraph)
            else {
                closeLists();
                result.push(`<p>${line}</p>`);
            }
        });

        closeLists();

        html = result.join('\n');

        // 나무위키 스타일 내부 링크 처리 [[문서명#섹션|표시텍스트]]
        html = html.replace(/\[\[(.*?)(#(.*?))?(\|(.*?))?\]\]/g, (match, docName, hashPart, hash, pipePart, displayText) => {
            const finalDocName = docName ? docName.trim() : "";
            const finalHash = hash ? hash.trim() : "";
            const finalDisplay = displayText ? displayText.trim() : (finalDocName + (finalHash ? '#' + finalHash : ""));
            
            return `<a class="wiki-internal-link" data-target="${finalDocName}" data-hash="${finalHash}" href="#">${finalDisplay}</a>`;
        });

        // 인라인 요소 처리
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>')
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>');

        return html;
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
