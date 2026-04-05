const DB_NAME = 'myDB';
const STORE_NAME = 'traceLog';
function initDB() {
    const request = indexedDB.open(DB_NAME);

    request.onsuccess = (e) => {
        db = e.target.result;
        const currentVersion = db.version;

        // 스토어가 없거나, 혹시 잘못 생성되었을 가능성을 대비해 버전을 올려서 다시 열기
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.close();
            const upgradeRequest = indexedDB.open(DB_NAME, currentVersion + 1);

            upgradeRequest.onupgradeneeded = (e) => {
                db = e.target.result;
                // 혹시 이미 있으면 삭제하고 다시 만듬 (깨끗하게!)
                if (db.objectStoreNames.contains(STORE_NAME)) {
                    db.deleteObjectStore(STORE_NAME);
                }
                db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                console.log(`[IndexedDB] 스토어 '${STORE_NAME}'가 버전 ${currentVersion + 1}에서 재생성됨`);
            };

            upgradeRequest.onsuccess = (e) => {
                db = e.target.result;
                renderLogs();
            };
        } else {
            renderLogs();
        }
    };

    request.onerror = (e) => {
        console.error("[IndexedDB] 초기 연결 실패:", e.target.error);
    };
}
initDB();

const coordInput = document.getElementById('coord-input');
const fullCoordDisplay = document.getElementById('full-coord');

function updateFullCoord() {
    let val = coordInput.value.trim();
    if (!val) {
        fullCoordDisplay.innerText = "52SBD ----- -----";
        return;
    }
    let parts = val.split(/[\s,]+/);
    let x = parts[0] || "";
    let y = parts[1] || "";
    let fullX = x.padEnd(3, '0').slice(0, 3) + "00";
    let fullY = y.padEnd(3, '0').slice(0, 3) + "00";
    fullCoordDisplay.innerText = `52SBD ${fullX} ${fullY}`;
}
coordInput.addEventListener('input', updateFullCoord);

const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distConv1 = document.getElementById('dist-conv-1');
const distConv2 = document.getElementById('dist-conv-2');

function updateDistance() {
    let val = parseFloat(distValue.value);
    let unit = distUnit.value;
    if (isNaN(val)) {
        distConv1.innerText = "--";
        distConv2.innerText = "--";
        return;
    }
    let km, nm, m;
    if (unit === 'km') { km = val; nm = val * 0.539957; m = val * 0.621371; }
    else if (unit === 'NM') { nm = val; km = val * 1.852; m = val * 1.15078; }
    else if (unit === 'M') { m = val; km = val * 1.60934; nm = val * 0.868976; }

    if (unit === 'km') { distConv1.innerText = `${nm.toFixed(2)} NM`; distConv2.innerText = `${m.toFixed(2)} M`; }
    else if (unit === 'NM') { distConv1.innerText = `${km.toFixed(2)} km`; distConv2.innerText = `${m.toFixed(2)} M`; }
    else if (unit === 'M') { distConv1.innerText = `${nm.toFixed(2)} NM`; distConv2.innerText = `${km.toFixed(2)} km`; }
}
distValue.addEventListener('input', updateDistance);
distUnit.addEventListener('change', updateDistance);

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        updateFullCoord();
        updateDistance();
    }
}

function saveTraceLog() {
    if (!db) {
        alert("데이터베이스가 아직 준비되지 않았습니다. 잠시 후 다시 시도해 주세요.");
        return;
    }

    const log = {
        idTime: document.getElementById('id-time').value || "-",
        idPos: document.getElementById('az-el-input').value || "-",
        idLoc: document.getElementById('id-location').value || "",
        endTime: document.getElementById('end-time').value || "-",
        endPos: document.getElementById('end-az-el-input').value || "-",
        endLoc: document.getElementById('end-location').value || "",
        coord: fullCoordDisplay.innerText,
        specs: document.getElementById('ship-specs').value || "정보 없음",
        status: document.getElementById('end-reason').value,
        identifier: document.getElementById('identifier').value || "-",
        inquirer: document.getElementById('inquirer').value || "직접 식별",
        timestamp: new Date().getTime()
    };

    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.add(log);

    request.onsuccess = () => {
        renderLogs();
        alert("로그가 성공적으로 저장되었습니다.");
        document.getElementById('trace-form').reset();
        updateFullCoord();
        updateDistance();
    };

    request.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("로그 저장 중 오류가 발생했습니다.");
    };
}

function renderLogs() {
    if (!db) return;

    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const allLogs = request.result;
        const recentLogs = allLogs.sort((a, b) => b.timestamp - a.timestamp).slice(0, 10);
        
        const list = document.getElementById('log-list');
        if (recentLogs.length === 0) {
            list.innerHTML = '<tr><td colspan="8" class="text-muted py-4">저장된 로그가 없습니다.</td></tr>';
            return;
        }

        list.innerHTML = recentLogs.map(log => `
            <tr>
                <td style="font-weight: bold;">${log.idTime}</td>
                <td>${log.idPos}${log.idLoc ? '<br>(' + log.idLoc + ')' : ''}</td>
                <td style="font-weight: bold;">${log.endTime}</td>
                <td>${log.endPos}${log.endLoc ? '<br>(' + log.endLoc + ')' : ''}</td>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; color: #0d6efd;">${log.coord}</td>
                <td style="text-align: left; min-width: 200px; white-space: pre-wrap;">${log.specs}\n<span class="badge-status">${log.status}(으)로 인해 추적 종료</span></td>
                <td>${log.identifier}</td>
                <td>${log.inquirer}</td>
            </tr>
        `).join('');
    };
}
