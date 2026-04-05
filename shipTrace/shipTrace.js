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
            };
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
        alert("선명을 입력해주세요.");
        return;
    }

    const distText = distKmDisplay.innerText.replace(' km', '');
    const distanceKmValue = distText === "--" ? "-" : distText;

    const tonnage = document.getElementById('ship-tonnage').value || "-";
    const type = document.getElementById('ship-type').value || "-";
    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t) : [];

    const newHistory = {
        date: document.getElementById('id-date')?.value || new Date().toISOString().split('T')[0],
        
        // --- 세부 5가지 필드 ---
        raderStation: document.getElementById('radar-station-select')?.value || "-",
        traceNumber: document.getElementById('trace-num')?.value || "-",
        firstOutport: document.getElementById('departure')?.value || "-",
        direction: document.getElementById('move-dir')?.value || "-",
        distance: distanceKmValue,
        // -----------------------

        coord: fullCoordDisplay?.innerText || "-",
        telephonee: document.getElementById('telephonee')?.value || "-",

        // 식별 정보
        firstTime: document.getElementById('first-time')?.value || "00:00",
        firstPos: document.getElementById('first-pos')?.value || "-",
        firstAzEl: document.getElementById('first-az-el')?.value || "-",

        // 종료 정보
        lastTime: document.getElementById('last-time')?.value || "00:00",
        lastPos: document.getElementById('last-pos')?.value || "-",
        lastAzEl: document.getElementById('last-az-el')?.value || "-",
        status: document.getElementById('end-status')?.value || "소실",

        // 복기 정보
        crewCount: document.getElementById('crew-count')?.value || "식별불가",
        violation: document.getElementById('violation')?.value || "무",
        worker: document.getElementById('worker')?.value || "-",
        
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
            if (tonnage !== "-") existingShip.tonnage = tonnage;
            if (type !== "-") existingShip.type = type;
            
            if (!Array.isArray(existingShip.tags)) existingShip.tags = [];
            tags.forEach(t => {
                if (!existingShip.tags.includes(t)) existingShip.tags.push(t);
            });

            if (!existingShip.history) existingShip.history = [];
            existingShip.history.push(newHistory);
            store.put(existingShip, existingKey);
        } else {
            const newShip = {
                name: shipName,
                tonnage: tonnage,
                type: type,
                number: "-", 
                tel: "-",
                tags: tags,
                history: [newHistory]
            };
            store.add(newShip, Date.now().toString());
        }
    };

    tx.oncomplete = () => {
        alert("추적 기록이 성공적으로 DB에 등록되었습니다.");
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
