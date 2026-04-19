let currentDB = null, currentStore = null;
const treeRoot = document.getElementById('tree-root');

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
        logToConsole("Access granted. Password verified.", "success");
    } else {
        error.style.display = 'block';
        input.value = '';
        input.focus();
        logToConsole("Failed login attempt.", "error");
    }
}

const editor = document.getElementById('json-editor');
const welcome = document.getElementById('welcome-msg');
const pathDisplay = document.getElementById('path-display');
const statusMsg = document.getElementById('status-msg');
const wrapper = document.getElementById('wrapper');

window.addEventListener('dragover', (e) => { e.preventDefault(); wrapper.classList.add('drag-over'); });
window.addEventListener('dragleave', (e) => { e.preventDefault(); if (e.relatedTarget === null) wrapper.classList.remove('drag-over'); });
window.addEventListener('drop', (e) => { e.preventDefault(); wrapper.classList.remove('drag-over'); if (e.dataTransfer.files.length > 0) handleFile(e.dataTransfer.files[0]); });

async function refreshTree() {
    treeRoot.innerHTML = '';
    try {
        if (!indexedDB.databases) {
            logToConsole("Your browser does not support indexedDB.databases(). Manual refresh required.", "warn");
            return;
        }
        const dbs = await indexedDB.databases();
        dbs.forEach(db => treeRoot.appendChild(createItemUI(db.name, 'db')));
        logToConsole(`Tree refreshed. Found ${dbs.length} databases.`, 'info');
    } catch (err) {
        logToConsole(`Failed to refresh tree: ${err.message}`, 'error');
    }
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
        addBtn.title = "Create new store";
        addBtn.onclick = (e) => { e.stopPropagation(); createNewStore(text); };
        actions.appendChild(addBtn);
    }
    const delBtn = document.createElement('button');
    delBtn.className = 'btn-sm-outline btn-del-sm'; delBtn.textContent = 'DEL';
    delBtn.title = `Delete ${type}`;
    delBtn.onclick = (e) => { e.stopPropagation(); deleteTarget(text, type); };
    
    actions.appendChild(delBtn);
    item.appendChild(label); item.appendChild(actions);
    wrap.appendChild(item);
    return wrap;
}

async function toggleDB(dbName, wrap) {
    currentDB = dbName;
    const existing = wrap.querySelector('.indent');
    if (existing) { 
        existing.remove(); 
        logToConsole(`Closed DB view: ${dbName}`, 'info');
        return; 
    }
    logToConsole(`Opening DB: ${dbName}...`, 'info');
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const container = document.createElement('div');
        container.className = 'indent';
        const stores = Array.from(db.objectStoreNames);
        if (stores.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'tree-item';
            empty.style.paddingLeft = '20px';
            empty.style.fontSize = '0.75rem';
            empty.style.color = '#999';
            empty.textContent = "(No stores)";
            container.appendChild(empty);
        } else {
            stores.sort().forEach(sName => container.appendChild(createItemUI(sName, 'store')));
        }
        wrap.appendChild(container); 
        db.close();
        logToConsole(`DB [${dbName}] opened. Stores found: ${stores.length}`, 'success');
    };
    req.onerror = (e) => logToConsole(`Error opening DB [${dbName}]: ${e.target.error}`, 'error');
    req.onblocked = () => logToConsole(`Opening DB [${dbName}] is blocked. Please close other tabs.`, 'warn');
}

async function openStore(dbName, storeName) {
    currentDB = dbName; currentStore = storeName;
    pathDisplay.textContent = `PATH: ${dbName} > ${storeName}`;
    welcome.style.display = 'none'; editor.style.display = 'block';
    logToConsole(`Loading store [${storeName}] from DB [${dbName}]...`, 'info');
    
    const req = indexedDB.open(dbName);
    req.onsuccess = (e) => {
        const db = e.target.result;
        try {
            if (!db.objectStoreNames.contains(storeName)) {
                throw new Error(`Store [${storeName}] not found in database.`);
            }
            const tx = db.transaction(storeName, 'readonly');
            const data = {};
            const store = tx.objectStore(storeName);
            
            store.openCursor().onsuccess = (ev) => {
                const c = ev.target.result;
                if (c) { 
                    data[c.key] = c.value; 
                    c.continue(); 
                } else { 
                    editor.value = JSON.stringify(data, null, 4); 
                    db.close(); 
                    const count = Object.keys(data).length;
                    logToConsole(`Store [${storeName}] loaded. Records: ${count}`, 'success');
                }
            };
            tx.onerror = (err) => {
                logToConsole(`Transaction error loading store: ${err.target.error}`, 'error');
                db.close();
            };
        } catch (err) {
            logToConsole(`Error opening store: ${err.message}`, 'error');
            db.close();
        }
    };
    req.onerror = (e) => logToConsole(`Error opening DB for store loading: ${e.target.error}`, 'error');
}

async function handleFile(file) {
    if (!file) return;
    const targetDB = prompt("TARGET DATABASE:", currentDB || ""); if (!targetDB) return;
    const targetStore = prompt(`TARGET STORE IN [${targetDB}]:`, currentStore || ""); if (!targetStore) return;

    logToConsole(`Importing file: ${file.name} to [${targetDB}.${targetStore}]...`, 'info');
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            let content = e.target.result.trim();
            if (file.name.endsWith('.js')) {
                const match = content.match(/(\[|{)[\s\S]*(\]|})/);
                if (match) content = match[0];
            }
            let data;
            try { 
                data = JSON.parse(content); 
            } catch { 
                data = new Function(`return ${content}`)(); 
            }

            logToConsole(`File parsed successfully. Type: ${Array.isArray(data) ? 'Array' : 'Object'}`, 'info');
            
            const req = indexedDB.open(targetDB);
            req.onsuccess = (ev) => {
                const db = ev.target.result;
                if (!db.objectStoreNames.contains(targetStore)) {
                    logToConsole(`Store [${targetStore}] doesn't exist. Creating via upgrade...`, 'warn');
                    const newVer = db.version + 1; 
                    db.close();
                    const upReq = indexedDB.open(targetDB, newVer);
                    upReq.onupgradeneeded = (ue) => ue.target.result.createObjectStore(targetStore);
                    upReq.onsuccess = (ue) => { 
                        ue.target.result.close(); 
                        logToConsole(`Store [${targetStore}] created. Proceeding with import.`, 'success');
                        executeImport(targetDB, targetStore, data); 
                    };
                    upReq.onerror = (ue) => logToConsole(`Upgrade failed: ${ue.target.error}`, 'error');
                } else { 
                    db.close(); 
                    executeImport(targetDB, targetStore, data); 
                }
            };
            req.onerror = (ev) => logToConsole(`DB Open error during import: ${ev.target.error}`, 'error');
        } catch (err) { 
            logToConsole(`Import failed: ${err.message}`, 'error');
            alert("ERROR: " + err.message); 
        }
    };
    reader.readAsText(file);
}

function executeImport(dbName, storeName, data) {
    const req = indexedDB.open(dbName);
    req.onsuccess = (ev) => {
        const db = ev.target.result;
        try {
            const tx = db.transaction(storeName, 'readwrite');
            const store = tx.objectStore(storeName);
            store.clear().onsuccess = () => {
                if (Array.isArray(data)) {
                    data.forEach((item, i) => {
                        // keyPath가 설정된 경우(in-line key) put(item)만 사용해야 함
                        if (store.keyPath) {
                            store.put(item);
                        } else {
                            const key = (item && (item.id || item.key)) || i.toString();
                            store.put(item, key);
                        }
                    });
                } else {
                    Object.keys(data).forEach(k => {
                        if (store.keyPath) {
                            store.put(data[k]);
                        } else {
                            store.put(data[k], k);
                        }
                    });
                }
            };
            tx.oncomplete = () => { 
                db.close(); 
                refreshTree(); 
                openStore(dbName, storeName); 
                showStatus("IMPORTED"); 
                logToConsole(`Import to [${dbName}.${storeName}] completed successfully.`, 'success');
            };
            tx.onerror = (err) => {
                logToConsole(`Import transaction error: ${err.target.error}`, 'error');
                db.close();
            };
        } catch (err) {
            logToConsole(`Import execution error: ${err.message}`, 'error');
            db.close();
        }
    };
}

async function processExport() {
    const dbs = await indexedDB.databases(); if (dbs.length === 0) return alert("NO DB FOUND");
    const tDB = prompt("DATABASE TO EXPORT:", currentDB || dbs[0].name); if (!tDB) return;
    const req = indexedDB.open(tDB);
    req.onsuccess = (e) => {
        const db = e.target.result;
        const stores = Array.from(db.objectStoreNames); db.close();
        if (stores.length === 0) return alert("No stores in this database.");
        
        const tStore = prompt(`SELECT STORE (${stores.join(', ')}):`, currentStore || stores[0]);
        if (!tStore || !stores.includes(tStore)) return;
        const fName = prompt("FILE NAME:", tStore); if (!fName) return;
        
        logToConsole(`Exporting store [${tStore}] from DB [${tDB}]...`, 'info');
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
                    logToConsole(`Export of [${tStore}] completed as ${fName}.json`, 'success');
                }
            };
            tx.onerror = (err) => {
                logToConsole(`Export transaction error: ${err.target.error}`, 'error');
                edb.close();
            };
        };
    };
}

async function saveData() {
    if (!currentDB || !currentStore) {
        alert("Please select a store first.");
        return;
    }
    
    logToConsole(`Saving changes to [${currentDB}.${currentStore}]...`, 'info');
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
        req.onerror = () => {
            logToConsole(`DB Open error during save: ${req.error}`, 'error');
            alert("DATABASE ERROR");
        };
        req.onsuccess = (e) => {
            const db = e.target.result;
            try {
                const tx = db.transaction(currentStore, 'readwrite');
                const store = tx.objectStore(currentStore);
                
                store.clear().onsuccess = () => {
                    if (Array.isArray(newData)) {
                        newData.forEach((item, i) => {
                            if (store.keyPath) {
                                store.put(item);
                            } else {
                                const key = (item && (item.id || item.key)) || i.toString();
                                store.put(item, key);
                            }
                        });
                    } else {
                        Object.keys(newData).forEach(k => {
                            if (store.keyPath) {
                                store.put(newData[k]);
                            } else {
                                store.put(newData[k], k);
                            }
                        });
                    }
                };
                
                tx.oncomplete = () => { 
                    showStatus("SAVED"); 
                    db.close(); 
                    logToConsole(`Changes to [${currentDB}.${currentStore}] saved successfully.`, 'success');
                };
                tx.onerror = (err) => { 
                    logToConsole(`Save transaction error: ${err.target.error}`, 'error');
                    alert("SAVE TRANSACTION ERROR: " + err.target.error); 
                    db.close(); 
                };
            } catch (err) {
                logToConsole(`Error during save transaction: ${err.message}`, 'error');
                db.close();
            }
        };
    } catch (e) { 
        logToConsole(`Parsing error during save: ${e.message}`, 'error');
        alert("PARSING ERROR: " + e.message + "\n\nJSON 문법을 확인해주세요. (큰따옴표 권장, 마지막 쉼표 제거 등)"); 
    }
}

async function createNewDB() {
    const n = prompt("NEW DB NAME:");
    if (n) {
        logToConsole(`Creating new DB: ${n}...`, 'info');
        const r = indexedDB.open(n, 1);
        r.onupgradeneeded = (e) => e.target.result.createObjectStore('init_store');
        r.onsuccess = (e) => { 
            e.target.result.close(); 
            refreshTree(); 
            logToConsole(`DB [${n}] created successfully with 'init_store'.`, 'success');
        };
        r.onerror = (e) => logToConsole(`Error creating DB [${n}]: ${e.target.error}`, 'error');
    }
}

async function createNewStore(dbName) {
    const s = prompt(`NEW STORE IN [${dbName}]:`);
    if (s) {
        logToConsole(`Creating new store [${s}] in DB [${dbName}]...`, 'info');
        const r = indexedDB.open(dbName);
        r.onsuccess = (e) => {
            const db = e.target.result; const v = db.version; db.close();
            const ur = indexedDB.open(dbName, v + 1);
            ur.onupgradeneeded = (ue) => ue.target.result.createObjectStore(s);
            ur.onsuccess = () => {
                refreshTree();
                logToConsole(`Store [${s}] created successfully in DB [${dbName}].`, 'success');
            };
            ur.onerror = (e) => logToConsole(`Error creating store [${s}]: ${e.target.error}`, 'error');
            ur.onblocked = () => logToConsole("Upgrade blocked. Close other tabs.", "warn");
        };
        r.onerror = (e) => logToConsole(`Error opening DB [${dbName}] for store creation: ${e.target.error}`, 'error');
    }
}

async function deleteTarget(name, type) {
    if (!confirm(`DELETE [${name}]?`)) return;
    logToConsole(`Deleting ${type}: ${name}...`, 'warn');
    if (type === 'db') {
        const req = indexedDB.deleteDatabase(name);
        req.onsuccess = () => {
            refreshTree();
            logToConsole(`DB [${name}] deleted.`, 'success');
        };
        req.onerror = (e) => logToConsole(`Error deleting DB [${name}]: ${e.target.error}`, 'error');
        req.onblocked = () => logToConsole(`Deletion of [${name}] is blocked.`, 'warn');
    } else {
        const r = indexedDB.open(currentDB);
        r.onsuccess = (e) => {
            const db = e.target.result; const v = db.version; db.close();
            const ur = indexedDB.open(currentDB, v + 1);
            ur.onupgradeneeded = (ue) => ue.target.result.deleteObjectStore(name);
            ur.onsuccess = () => {
                refreshTree();
                logToConsole(`Store [${name}] deleted from DB [${currentDB}].`, 'success');
            };
            ur.onerror = (e) => logToConsole(`Error deleting store [${name}]: ${e.target.error}`, 'error');
        };
    }
}

function showStatus(msg) {
    statusMsg.textContent = `[${msg}]`;
    setTimeout(() => statusMsg.textContent = '', 2000);
}

const consoleLog = document.getElementById('console-log');
function logToConsole(msg, type = 'info') {
    if (!consoleLog) return;
    const entry = document.createElement('div');
    entry.className = `log-entry log-${type}`;
    entry.innerHTML = `<span class="log-time">></span> <span class="log-msg">${msg}</span>`;
    consoleLog.appendChild(entry);
    consoleLog.scrollTop = consoleLog.scrollHeight;
}

function clearConsole() {
    consoleLog.innerHTML = '';
    logToConsole("Console cleared.", "info");
}

logToConsole("Successfully initialized.", "success");
refreshTree();