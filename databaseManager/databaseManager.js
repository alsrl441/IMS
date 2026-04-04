let currentDB = null, currentStore = null;
const treeRoot = document.getElementById('tree-root');
const editor = document.getElementById('json-editor');
const welcome = document.getElementById('welcome-msg');
const pathDisplay = document.getElementById('path-display');
const statusMsg = document.getElementById('status-msg');
const wrapper = document.getElementById('wrapper');

// Drag & Drop
window.addEventListener('dragover', (e) => { e.preventDefault(); wrapper.classList.add('drag-over'); });
window.addEventListener('dragleave', (e) => { e.preventDefault(); if (e.relatedTarget === null) wrapper.classList.remove('drag-over'); });
window.addEventListener('drop', (e) => { e.preventDefault(); wrapper.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });

async function refreshTree() {
    treeRoot.innerHTML = '';
    const dbs = await indexedDB.databases();
    dbs.forEach(db => treeRoot.appendChild(createItemUI(db.name, 'db')));
}

function createItemUI(text, type) {
    const wrap = document.createElement('div');
    const item = document.createElement('div');
    item.className = 'tree-item';
    
    const label = document.createElement('div');
    label.className = 'tree-label';
    label.innerHTML = `<span>${text}</span>`;
    label.onclick = () => (type === 'db') ? toggleDB(text, wrap) : openStore(currentDB, text);
    
    const actions = document.createElement('div');
    actions.className = 'item-actions';
    if (type === 'db') {
        const addBtn = document.createElement('button');
        addBtn.className = 'btn-sm-outline'; addBtn.textContent = '+';
        addBtn.onclick = (e) => { e.stopPropagation(); createNewStore(text); };
        actions.appendChild(addBtn);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-sm-outline btn-del-sm'; delBtn.textContent = 'DEL';
    delBtn.onclick = (e) => { e.stopPropagation(); deleteTarget(text, type); };
    
    actions.appendChild(delBtn);
    item.appendChild(label); item.appendChild(actions);
    wrap.appendChild(item);
    return wrap;
}

async function toggleDB(dbName, wrap) {
    currentDB = dbName;
    const existing = wrap.querySelector('.indent');
    if (existing) { existing.remove(); return; }
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const container = document.createElement('div');
        container.className = 'indent';
        Array.from(db.objectStoreNames).forEach(sName => container.appendChild(createItemUI(sName, 'store')));
        wrap.appendChild(container); db.close();
    };
}

async function openStore(dbName, storeName) {
    currentDB = dbName; currentStore = storeName;
    pathDisplay.textContent = `PATH: ${dbName} > ${storeName}`;
    welcome.style.display = 'none'; editor.style.display = 'block';
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const tx = db.transaction(storeName, 'readonly');
        const data = {};
        tx.objectStore(storeName).openCursor().onsuccess = (ev) => {
            const c = ev.target.result;
            if (c) { data[c.key] = c.value; c.continue(); }
            else { editor.value = JSON.stringify(data, null, 4); db.close(); }
        };
    };
}

async function handleFile(file) {
    if (!file) return;
    const targetDB = prompt("TARGET DATABASE:", currentDB || ""); if (!targetDB) return;
    const targetStore = prompt(`TARGET STORE IN [${targetDB}]:`, currentStore || ""); if (!targetStore) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let content = e.target.result.trim();
            if (file.name.endsWith('.js')) {
                const match = content.match(/(\[|{)[\s\S]*(\]|})/);
                if (match) content = match[0];
            }
            let data;
            try { data = JSON.parse(content); } catch { data = new Function(`return ${content}`)(); }

            const req = indexedDB.open(targetDB);
            req.onsuccess = (ev) => {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains(targetStore)) {
                    const newVer = db.version + 1; db.close();
                    const upReq = indexedDB.open(targetDB, newVer);
                    upReq.onupgradeneeded = (ue) => ue.target.result.createObjectStore(targetStore);
                    upReq.onsuccess = (ue) => { ue.target.result.close(); executeImport(targetDB, targetStore, data); };
                } else { db.close(); executeImport(targetDB, targetStore, data); }
            };
        } catch (err) { alert("ERROR: " + err.message); }
    };
    reader.readAsText(file);
}

function executeImport(dbName, storeName, data) {
    const req = indexedDB.open(dbName);
    req.onsuccess = (ev) => {
        const db = ev.target.result;
        const tx = db.transaction(storeName, 'readwrite');
        const store = tx.objectStore(storeName);
        store.clear().onsuccess = () => {
            if (Array.isArray(data)) data.forEach((item, i) => store.put(item, item.id || item.key || i.toString()));
            else Object.keys(data).forEach(k => store.put(data[k], k));
        };
        tx.oncomplete = () => { db.close(); refreshTree(); openStore(dbName, storeName); showStatus("IMPORTED"); };
    };
}

async function processExport() {
    const dbs = await indexedDB.databases(); if (dbs.length === 0) return alert("NO DB FOUND");
    const tDB = prompt("DATABASE TO EXPORT:", currentDB || dbs[0].name); if (!tDB) return;
    const req = indexedDB.open(tDB);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const stores = Array.from(db.objectStoreNames); db.close();
        const tStore = prompt(`SELECT STORE (${stores.join(', ')}):`, currentStore || stores[0]);
        if (!tStore || !stores.includes(tStore)) return;
        const fName = prompt("FILE NAME:", tStore); if (!fName) return;
        const exReq = indexedDB.open(tDB);
        exReq.onsuccess = (ev) => {
            const edb = ev.target.result;
            const tx = edb.transaction(tStore, 'readonly');
            const data = {};
            tx.objectStore(tStore).openCursor().onsuccess = (eev) => {
                const c = eev.target.result;
                if (c) { data[c.key] = c.value; c.continue(); }
                else {
                    const blob = new Blob([JSON.stringify(data, null, 4)], {type: 'application/json'});
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url; a.download = `${fName}.json`;
                    a.click(); URL.revokeObjectURL(url);
                    showStatus("EXPORTED"); edb.close();
                }
            };
        };
    };
}

async function saveData() {
    if (!currentDB || !currentStore) return;
    let newData;
    try {
        const content = editor.value.trim();
        try { 
            newData = JSON.parse(content); 
        } catch { 
            newData = new Function(`return ${content}`)(); 
        }
        
        if (typeof newData !== 'object' || newData === null) {
            throw new Error("Data must be a JSON Object or Array");
        }

        const req = indexedDB.open(currentDB);
        req.onerror = () => alert("DATABASE ERROR");
        req.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(currentStore, 'readwrite');
            const store = tx.objectStore(currentStore);
            
            store.clear().onsuccess = () => {
                if (Array.isArray(newData)) {
                    newData.forEach((item, i) => {
                        const key = (item && (item.id || item.key)) || i.toString();
                        store.put(item, key);
                    });
                } else {
                    Object.keys(newData).forEach(k => store.put(newData[k], k));
                }
            };
            
            tx.oncomplete = () => { showStatus("SAVED"); db.close(); };
            tx.onerror = (err) => { alert("SAVE TRANSACTION ERROR: " + err.target.error); db.close(); };
        };
    } catch (e) { 
        alert("PARSING ERROR: " + e.message + "\n\n문법을 확인해주세요. (큰따옴표 사용 권장, 마지막 쉼표 제거 등)"); 
    }
}

async function createNewDB() {
    const n = prompt("NEW DB NAME:");
    if (n) {
        const r = indexedDB.open(n, 1);
        r.onupgradeneeded = (e) => e.target.result.createObjectStore('init_store');
        r.onsuccess = (e) => { e.target.result.close(); refreshTree(); };
    }
}

async function createNewStore(dbName) {
    const s = prompt(`NEW STORE IN [${dbName}]:`);
    if (s) {
        const r = indexedDB.open(dbName);
        r.onsuccess = (e) => {
            const db = e.target.result; const v = db.version; db.close();
            const ur = indexedDB.open(dbName, v + 1);
            ur.onupgradeneeded = (ue) => ue.target.result.createObjectStore(s);
            ur.onsuccess = () => refreshTree();
        };
    }
}

async function deleteTarget(name, type) {
    if (!confirm(`DELETE [${name}]?`)) return;
    if (type === 'db') indexedDB.deleteDatabase(name).onsuccess = () => refreshTree();
    else {
        const r = indexedDB.open(currentDB);
        r.onsuccess = (e) => {
            const db = e.target.result; const v = db.version; db.close();
            const ur = indexedDB.open(currentDB, v + 1);
            ur.onupgradeneeded = (ue) => ue.target.result.deleteObjectStore(name);
            ur.onsuccess = () => refreshTree();
        };
    }
}

function showStatus(msg) {
    statusMsg.textContent = `[${msg}]`;
    setTimeout(() => statusMsg.textContent = '', 2000);
}

refreshTree();