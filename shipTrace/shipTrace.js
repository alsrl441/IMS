const DB_NAME = 'myDB';
const STORE_NAME = 'ship';
let db;

function initDB() {
    const request = indexedDB.open(DB_NAME);

    request.onsuccess = (e) => {
        db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
            const version = db.version;
            db.close();
            const upgradeRequest = indexedDB.open(DB_NAME, version + 1);
            upgradeRequest.onupgradeneeded = (ev) => {
                const upgradeDb = ev.target.result;
                upgradeDb.createObjectStore(STORE_NAME);
            };
            upgradeRequest.onsuccess = (ev) => {
                db = ev.target.result;
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

// --- 위치 및 문의 정보 관련 로직 복구 ---
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
if (coordInput) coordInput.addEventListener('input', updateFullCoord);

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
    // 단위 변환 로직 (기준에 맞춰 계산)
    if (unit === 'km') { km = val; nm = val * 0.539957; m = val * 1000; }
    else if (unit === 'NM') { nm = val; km = val * 1.852; m = val * 1852; }
    else if (unit === 'M') { m = val; km = val / 1000; nm = val / 1852; }

    if (unit === 'km') { distConv1.innerText = `${nm.toFixed(2)} NM`; distConv2.innerText = `${m.toFixed(0)} M`; }
    else if (unit === 'NM') { distConv1.innerText = `${km.toFixed(2)} km`; distConv2.innerText = `${m.toFixed(0)} M`; }
    else if (unit === 'M') { distConv1.innerText = `${nm.toFixed(3)} NM`; distConv2.innerText = `${km.toFixed(3)} km`; }
}
if (distValue) distValue.addEventListener('input', updateDistance);
if (distUnit) distUnit.addEventListener('change', updateDistance);
// ------------------------------------------

// 초기 날짜 설정
document.getElementById('id-date').value = new Date().toISOString().split('T')[0];

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

function setHandover(val) {
    document.getElementById('handover').value = val;
}

function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        document.getElementById('id-date').value = new Date().toISOString().split('T')[0];
        updateFullCoord();
        updateDistance();
    }
}

async function saveTraceLog() {
    if (!db) {
        alert("데이터베이스가 아직 준비되지 않았습니다.");
        return;
    }

    const shipName = document.getElementById('ship-name').value.trim();
    if (!shipName) {
        alert("선명을 입력해주세요.");
        return;
    }

    const tonnage = document.getElementById('ship-tonnage').value || "-";
    const type = document.getElementById('ship-type').value || "-";
    const vesselNum = document.getElementById('vessel-num').value || "-";
    const contact = document.getElementById('contact').value || "-";
    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t) : [];

    const newHistory = {
        date: document.getElementById('id-date').value,
        firstTime: document.getElementById('first-time').value || "00:00",
        firstPos: document.getElementById('first-pos').value || "-",
        lastTime: document.getElementById('last-time').value || "00:00",
        lastPos: document.getElementById('last-pos').value || "-",
        crewCount: document.getElementById('crew-count').value || "식별불가",
        handover: document.getElementById('handover').value || "-",
        worker: document.getElementById('worker').value || "-",
        telephonee: document.getElementById('telephonee').value || "-",
        shipImage: "Images/no-image.jpg",
        pathImage: "Images/no-image.jpg",
        timestamp: new Date().getTime()
    };

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.openCursor();
    let existingShip = null;
    let existingKey = null;

    request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.name === shipName) {
                existingShip = cursor.value;
                existingKey = cursor.key;
            } else {
                cursor.continue();
                return;
            }
        }

        if (existingShip) {
            existingShip.tonnage = tonnage !== "-" ? tonnage : existingShip.tonnage;
            existingShip.type = type !== "-" ? type : existingShip.type;
            existingShip.number = vesselNum !== "-" ? vesselNum : existingShip.number;
            existingShip.tel = contact !== "-" ? contact : existingShip.tel;
            
            if (!Array.isArray(existingShip.tags)) existingShip.tags = [];
            tags.forEach(t => {
                if (!existingShip.tags.includes(t)) existingShip.tags.push(t);
            });

            existingShip.history.push(newHistory);
            store.put(existingShip, existingKey);
        } else {
            const newShip = {
                name: shipName,
                tonnage: tonnage,
                type: type,
                number: vesselNum,
                tel: contact,
                tags: tags,
                history: [newHistory]
            };
            store.add(newShip, Date.now().toString());
        }
    };

    tx.oncomplete = () => {
        alert("기록이 성공적으로 저장되었습니다.");
        renderLogs();
        document.getElementById('trace-form').reset();
        document.getElementById('id-date').value = new Date().toISOString().split('T')[0];
        updateFullCoord();
        updateDistance();
    };

    tx.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("저장 중 오류가 발생했습니다.");
    };
}

function renderLogs() {
    if (!db) return;

    const tx = db.transaction(STORE_NAME, "readonly");
    const store = tx.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
        const allShips = request.result;
        let allHistory = [];

        allShips.forEach(ship => {
            if (ship.history && Array.isArray(ship.history)) {
                ship.history.forEach(h => {
                    allHistory.push({
                        ...h,
                        shipName: ship.name,
                        shipTonnage: ship.tonnage,
                        shipType: ship.type
                    });
                });
            }
        });

        allHistory.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        const recentHistory = allHistory.slice(0, 20);
        
        const list = document.getElementById('log-list');
        if (recentHistory.length === 0) {
            list.innerHTML = '<tr><td colspan="7" class="text-muted py-4">저장된 기록이 없습니다.</td></tr>';
            return;
        }

        list.innerHTML = recentHistory.map(h => `
            <tr>
                <td>${h.date}</td>
                <td style="text-align: left; padding-left: 15px;">
                    <div style="font-weight: bold; color: #0d6efd;">${h.shipName}</div>
                    <div style="font-size: 0.75rem; color: #666;">${h.shipTonnage} / ${h.shipType}</div>
                </td>
                <td>
                    <div style="font-weight: bold;">${h.firstTime}</div>
                    <div style="font-size: 0.75rem;">${h.firstPos}</div>
                </td>
                <td>
                    <div style="font-weight: bold;">${h.lastTime}</div>
                    <div style="font-size: 0.75rem;">${h.lastPos}</div>
                </td>
                <td>${isNaN(h.crewCount) ? h.crewCount : h.crewCount + '명'}</td>
                <td style="text-align: left; font-size: 0.75rem; max-width: 200px;">${h.handover}</td>
                <td>
                    <div style="font-weight: bold;">${h.worker}</div>
                    <div style="font-size: 0.75rem;">(수) ${h.telephonee}</div>
                </td>
            </tr>
        `).join('');
    };
}
