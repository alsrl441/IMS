let currentDB = null, currentStore = null;
const treeRoot = document.getElementById('tree-root');
const pathDisplay = document.getElementById('path-display');
const consoleLog = document.getElementById('console-log');
const tableHeader = document.getElementById('table-header');
const tableBody = document.getElementById('table-body');
const tableWrapper = document.getElementById('data-table-wrapper');
const welcomeMsg = document.getElementById('welcome-msg');

// Password Verification
function verifyPassword() {
    const input = document.getElementById('db-password');
    const error = document.getElementById('pw-error');
    const overlay = document.getElementById('password-overlay');
    
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const timeStr = hours + minutes;
    const correctPassword = timeStr.split('').reverse().join('');
    
    if (input.value === correctPassword) {
        overlay.style.display = 'none';
        logToConsole("인증 성공. 데이터 관리 모드 활성화.", "success");
    } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
        logToConsole("인증 실패: 잘못된 비밀번호.", "error");
    }
}

// Sidebar Tree
async function refreshTree() {
    treeRoot.innerHTML = '';
    try {
        if (!indexedDB.databases) {
            logToConsole("브라우저가 indexedDB.databases()를 지원하지 않습니다.", "warn");
            return;
        }
        const dbs = await indexedDB.databases();
        dbs.forEach(db => treeRoot.appendChild(createItemUI(db.name, 'db')));
        logToConsole(`트리 갱신 완료. DB ${dbs.length}개 발견.`, 'info');
    } catch (err) {
        logToConsole(`트리 갱신 실패: ${err.message}`, 'error');
    }
}

function createItemUI(text, type, parentDB = null) {
    const wrap = document.createElement('div');
    const item = document.createElement('div');
    item.className = 'tree-item';
    
    const label = document.createElement('div');
    label.className = 'tree-label';
    label.innerHTML = `<span>${text}</span>`;
    label.onclick = () => (type === 'db') ? toggleDB(text, wrap) : openStore(parentDB, text);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-sm-outline btn-del-sm';
    delBtn.textContent = '삭제';
    delBtn.onclick = (e) => { 
        e.stopPropagation(); 
        deleteTarget(text, type, parentDB); 
    };
    
    actions.appendChild(delBtn);
    item.appendChild(label);
    item.appendChild(actions);
    wrap.appendChild(item);
    return wrap;
}

async function toggleDB(dbName, wrap) {
    const existing = wrap.querySelector('.indent');
    if (existing) { 
        existing.remove(); 
        return; 
    }
    
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const container = document.createElement('div');
        container.className = 'indent';
        const stores = Array.from(db.objectStoreNames);
        if (stores.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tree-item';
            empty.style.color = '#999';
            empty.textContent = "(스토어 없음)";
            container.appendChild(empty);
        } else {
            stores.sort().forEach(sName => container.appendChild(createItemUI(sName, 'store', dbName)));
        }
        wrap.appendChild(container); 
        db.close();
    };
    req.onerror = () => logToConsole(`DB [${dbName}] 열기 실패.`, 'error');
}

// Data Handling
async function openStore(dbName, storeName) {
    if (!dbName || !storeName) return;
    currentDB = dbName;
    currentStore = storeName;
    pathDisplay.textContent = `${dbName} > ${storeName}`;
    
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        try {
            if (!db.objectStoreNames.contains(storeName)) {
                throw new Error(`스토어 [${storeName}]를 찾을 수 없습니다.`);
            }
            const tx = db.transaction(storeName, 'readonly');
            const store = tx.objectStore(storeName);
            const data = [];
            
            store.openCursor().onsuccess = (ev) => {
                const cursor = ev.target.result;
                if (cursor) {
                    data.push({ _key: cursor.key, ...cursor.value });
                    cursor.continue();
                } else {
                    renderTable(data);
                    db.close();
                    logToConsole(`스토어 [${storeName}] 로드 완료. (${data.length}개 레코드)`, 'success');
                }
            };
            tx.onerror = (err) => {
                logToConsole(`트랜잭션 오류: ${err.target.error}`, 'error');
                db.close();
            };
        } catch (err) {
            logToConsole(`오류: ${err.message}`, 'error');
            db.close();
        }
    };
    req.onerror = () => logToConsole(`DB [${dbName}] 열기 실패.`, 'error');
}

function renderTable(data) {
    welcomeMsg.classList.add('hidden');
    tableWrapper.classList.remove('hidden');
    tableHeader.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        tableHeader.innerHTML = '<th>결과</th>';
        tableBody.innerHTML = '<tr><td>데이터가 비어 있습니다.</td></tr>';
        return;
    }
    
    // Extract unique keys
    const keys = ['_key', ...new Set(data.flatMap(item => Object.keys(item).filter(k => k !== '_key')))];
    
    keys.forEach(key => {
        const th = document.createElement('th');
        th.textContent = key;
        tableHeader.appendChild(th);
    });
    
    // Body (max 50 rows for preview)
    data.slice(0, 50).forEach(item => {
        const tr = document.createElement('tr');
        keys.forEach(key => {
            const td = document.createElement('td');
            const val = item[key];
            td.textContent = typeof val === 'object' ? JSON.stringify(val) : val;
            td.title = td.textContent; // Tooltip for long text
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    if (data.length > 50) {
        const tr = document.createElement('tr');
        const td = document.createElement('td');
        td.colSpan = keys.length;
        td.style.textAlign = 'center';
        td.style.color = '#888';
        td.textContent = `... 외 ${data.length - 50}개의 데이터가 더 있습니다. 전체 데이터는 Export로 확인하세요.`;
        tr.appendChild(td);
        tableBody.appendChild(tr);
    }
}

// Export / Import
async function processExport() {
    if (!currentDB || !currentStore) return alert("먼저 스토어를 선택하세요.");
    
    logToConsole(`스토어 [${currentStore}] 내보내는 중...`, 'info');
    const req = indexedDB.open(currentDB);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(currentStore, 'readonly');
        const store = tx.objectStore(currentStore);
        const data = {};
        
        store.openCursor().onsuccess = (ev) => {
            const cursor = ev.target.result;
            if (cursor) {
                data[cursor.key] = cursor.value;
                cursor.continue();
            } else {
                const blob = new Blob([JSON.stringify(data, null, 4)], {type: 'application/json'});
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${currentStore}_backup.json`;
                a.click();
                URL.revokeObjectURL(url);
                db.close();
                logToConsole(`[${currentStore}] 백업 파일 다운로드 시작.`, 'success');
            }
        };
    };
}

async function handleFile(file) {
    if (!file || !currentDB || !currentStore) return alert("먼저 대상 스토어를 선택하세요.");
    
    const mode = document.getElementById('import-mode').value;
    const modeText = mode === 'overwrite' ? "기존 데이터를 모두 삭제하고" : "중복을 제외하고";
    
    if (!confirm(`[${currentStore}]에 ${modeText} 데이터를 가져오시겠습니까?`)) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const data = JSON.parse(e.target.result);
            executeImport(currentDB, currentStore, data, mode);
        } catch (err) {
            logToConsole(`파일 읽기 실패: ${err.message}`, 'error');
            alert("JSON 파일 형식이 올바르지 않습니다.");
        }
    };
    reader.readAsText(file);
}

function executeImport(dbName, storeName, data, mode) {
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        
        let successCount = 0;
        let skipCount = 0;
        
        if (mode === 'overwrite') {
            store.clear().onsuccess = () => {
                Object.keys(data).forEach(key => {
                    const putReq = store.put(data[key], key);
                    putReq.onsuccess = () => {
                        successCount++;
                    };
                });
            };
        } else {
            Object.keys(data).forEach(key => {
                const addReq = store.add(data[key], key);
                addReq.onsuccess = () => {
                    successCount++;
                };
                addReq.onerror = (err) => {
                    err.preventDefault();
                    err.stopPropagation();
                    skipCount++;
                };
            });
        }
        
        tx.oncomplete = () => {
            db.close();
            openStore(dbName, storeName);
            const msg = mode === 'overwrite' 
                ? `[${storeName}] 데이터 덮어쓰기 완료. (총 ${successCount}개)`
                : `[${storeName}] 데이터 추가 완료. (성공: ${successCount}, 중복 건너뜀: ${skipCount})`;
            logToConsole(msg, 'success');
        };
        tx.onerror = (err) => {
            logToConsole(`Import 오류: ${err.target.error}`, 'error');
            db.close();
        };
    };
}

async function createNewDB() {
    const name = prompt("새 데이터베이스 이름을 입력하세요:");
    if (!name) return;
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = (e) => e.target.result.createObjectStore('default_store');
    req.onsuccess = (e) => {
        e.target.result.close();
        refreshTree();
        logToConsole(`DB [${name}] 생성 완료.`, 'success');
    };
}

async function deleteTarget(name, type) {
    if (!confirm(`[${name}]을(를) 정말 삭제하시겠습니까?`)) return;
    
    if (type === 'db') {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => { refreshTree(); logToConsole(`DB [${name}] 삭제 완료.`, 'success'); };
    } else {
        const req = indexedDB.open(currentDB);
        req.onsuccess = (e) => {
            const db = e.target.result;
            const version = db.version;
            db.close();
            const upReq = indexedDB.open(currentDB, version + 1);
            upReq.onupgradeneeded = (ev) => ev.target.result.deleteObjectStore(name);
            upReq.onsuccess = () => { refreshTree(); logToConsole(`스토어 [${name}] 삭제 완료.`, 'success'); };
        };
    }
}

function logToConsole(msg, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    const time = new Date().toLocaleTimeString();
    entry.innerHTML = `<span class="log-time">[${time}]</span> ${msg}`;
    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

function clearConsole() {
    consoleLog.innerHTML = '';
}

refreshTree();
