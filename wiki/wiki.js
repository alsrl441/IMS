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
        
        // TOC Generation
        generateTOC();
        
        toggleEditMode(false);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function parseMarkdown(markdown) {
        if (!markdown) return "";
        let html = markdown
            // 보안을 위한 기본 이스케이프 (선택 사항)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        // 블록 요소 처리
        const lines = html.split('\n');
        let result = [];
        let inList = false;
        let inOrderedList = false;

        lines.forEach(line => {
            // 제목 (Header)
            if (line.startsWith('### ')) {
                result.push(`<h3>${line.slice(4)}</h3>`);
            } else if (line.startsWith('## ')) {
                result.push(`<h2>${line.slice(3)}</h2>`);
            } else if (line.startsWith('# ')) {
                result.push(`<h1>${line.slice(2)}</h1>`);
            }
            // 인용문 (Blockquote)
            else if (line.startsWith('&gt; ')) {
                result.push(`<blockquote>${line.slice(5)}</blockquote>`);
            }
            // 목록 (List)
            else if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
                if (!inList) {
                    result.push('<ul>');
                    inList = true;
                }
                result.push(`<li>${line.trim().slice(2)}</li>`);
            }
            // 순서 있는 목록 (Ordered List)
            else if (/^\d+\.\s/.test(line.trim())) {
                if (!inOrderedList) {
                    result.push('<ol>');
                    inOrderedList = true;
                }
                result.push(`<li>${line.trim().replace(/^\d+\.\s/, '')}</li>`);
            }
            // 구분선 (Horizontal Rule)
            else if (line.trim() === '---' || line.trim() === '***') {
                result.push('<hr>');
            }
            // 빈 줄
            else if (line.trim() === '') {
                if (inList) { result.push('</ul>'); inList = false; }
                if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
                result.push('<br>');
            }
            // 일반 텍스트 (Paragraph)
            else {
                if (inList) { result.push('</ul>'); inList = false; }
                if (inOrderedList) { result.push('</ol>'); inOrderedList = false; }
                result.push(`<p>${line}</p>`);
            }
        });

        if (inList) result.push('</ul>');
        if (inOrderedList) result.push('</ol>');

        html = result.join('\n');

        // 인라인 요소 처리 (Regex)
        html = html
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
            .replace(/__(.*?)__/g, '<strong>$1</strong>')
            .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
            .replace(/_(.*?)_/g, '<em>$1</em>')
            .replace(/`(.*?)`/g, '<code>$1</code>') // Inline Code
            .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank">$1</a>'); // Link

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
        headers.forEach((h, idx) => {
            const id = `header-${idx}`;
            h.id = id;
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
