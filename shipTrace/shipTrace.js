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

// --- 위치 및 문의 정보 관련 로직 ---
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
const distKmDisplay = document.getElementById('dist-km-display');

function updateDistance() {
    let val = parseFloat(distValue.value);
    let unit = distUnit.value;
    if (isNaN(val)) {
        distKmDisplay.innerText = "-- km";
        return;
    }
    let km;
    if (unit === 'km') { km = val; }
    else if (unit === 'NM') { km = val * 1.852; }
    else if (unit === 'M') { km = val / 1000; }

    distKmDisplay.innerText = `${km.toFixed(3)} km`;
}
if (distValue) distValue.addEventListener('input', updateDistance);
if (distUnit) distUnit.addEventListener('change', updateDistance);
// ------------------------------------------

// 초기 날짜 설정
const dateInput = document.getElementById('id-date');
if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];

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
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
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
        alert("선명을 입력해주세요. (분석 중이라면 가칭이라도 입력해야 합니다)");
        return;
    }

    // 거리 km 값 추출
    const distText = distKmDisplay.innerText.replace(' km', '');
    const distanceKm = distText === "--" ? "-" : distText;

    const tonnage = document.getElementById('ship-tonnage').value || "-";
    const type = document.getElementById('ship-type').value || "-";

    const newHistory = {
        date: document.getElementById('id-date').value,
        
        // 문의 정보 (Step 1-2)
        coord: fullCoordDisplay.innerText,
        moveDir: document.getElementById('move-dir').value || "-",
        distanceKm: distanceKm,
        traceNum: (document.getElementById('radar-site').value + "-" + document.getElementById('trace-num').value) || "-",
        departure: document.getElementById('departure').value || "-",
        telephonee: document.getElementById('telephonee').value || "-",

        // 식별 정보 (Step 4)
        firstTime: document.getElementById('first-time').value || "00:00",
        firstPos: document.getElementById('first-pos').value || "-",
        firstAzEl: document.getElementById('first-az-el').value || "-",

        // 종료 정보 (Step 6)
        lastTime: document.getElementById('last-time').value || "00:00",
        lastPos: document.getElementById('last-pos').value || "-",
        lastAzEl: document.getElementById('last-az-el').value || "-",
        status: document.getElementById('end-status').value,

        // 복기 정보 (Step 7-8)
        crewCount: document.getElementById('crew-count').value || "식별불가",
        violation: document.getElementById('violation').value,
        handover: document.getElementById('handover').value || "-",
        worker: document.getElementById('worker').value || "-",
        
        // 이미지 및 메타데이터
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
            // 정보 업데이트 (비어있지 않은 경우에만)
            if (tonnage !== "-") existingShip.tonnage = tonnage;
            if (type !== "-") existingShip.type = type;
            
            if (!Array.isArray(existingShip.history)) existingShip.history = [];
            existingShip.history.push(newHistory);
            store.put(existingShip, existingKey);
        } else {
            const newShip = {
                name: shipName,
                tonnage: tonnage,
                type: type,
                number: "-", // 어선번호는 복기 시 알 수도 있으니 나중에 편집 가능
                tel: "-",
                tags: [],
                history: [newHistory]
            };
            store.add(newShip, Date.now().toString());
        }
    };

    tx.oncomplete = () => {
        alert("추적 기록이 성공적으로 DB에 등록되었습니다.");
        renderLogs();
        document.getElementById('trace-form').reset();
        if (dateInput) dateInput.value = new Date().toISOString().split('T')[0];
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
                <td style="font-size: 0.75rem;">
                    <strong>${h.date}</strong><br>
                    ${h.firstTime} ~ ${h.lastTime}
                </td>
                <td style="text-align: left; padding-left: 15px;">
                    <div style="font-weight: bold; color: #0d6efd;">${h.shipName}</div>
                    <div style="font-size: 0.75rem; color: #666;">${h.shipTonnage} / ${h.shipType}</div>
                </td>
                <td style="font-size: 0.75rem; color: #444;">
                    <div style="color: #0d6efd; font-family: monospace;">${h.coord}</div>
                    <div>방향: ${h.moveDir} / 거리: ${h.distanceKm}km</div>
                    <div style="color: #666;">추적번호: ${h.traceNum}</div>
                </td>
                <td>
                    <div style="font-weight: bold;">${h.firstPos}</div>
                    <div style="font-size: 0.75rem; color: #666;">Az/El: ${h.firstAzEl}</div>
                </td>
                <td>
                    <div style="font-weight: bold;">${h.lastPos}</div>
                    <div style="font-size: 0.75rem; color: #666;">Az/El: ${h.lastAzEl}</div>
                </td>
                <td>
                    <span class="badge-status">${h.status}</span>
                    <div style="font-size: 0.7rem; color: ${h.violation === '위반' ? '#dc3545' : '#198754'}; font-weight: bold;">
                        어선법: ${h.violation}
                    </div>
                </td>
                <td>
                    <div style="font-weight: bold;">${h.worker}</div>
                    <div style="font-size: 0.75rem; color: #666;">(문의) ${h.telephonee}</div>
                </td>
            </tr>
        `).join('');
    };
}
