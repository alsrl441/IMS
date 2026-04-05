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

// 초기 날짜 설정 (필요 시 유지, 현재는 식별 날짜 필드가 제거되었으므로 내부 변수용으로만 사용하거나 제거 가능)
let identificationDate = new Date().toISOString().split('T')[0];

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

function toggleViolationDetail() {
    const isChecked = document.getElementById('violation-check').checked;
    const detailInput = document.getElementById('violation-detail');
    detailInput.disabled = !isChecked;
    if (!isChecked) detailInput.value = "";
}

function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        toggleViolationDetail();
        updateFullCoord();
        updateDistance();
    }
}

async function saveTraceLog() {
    if (!db) {
        alert("데이터베이스가 아직 준비되지 않았습니다.");
        return;
    }

    const form = document.getElementById('trace-form');
    if (!form.checkValidity()) {
        alert("필수 입력 사항(*)을 모두 입력해주세요.");
        form.reportValidity();
        return;
    }

    // 기본값 처리
    const telephonee = document.getElementById('telephonee').value.trim() || "-";
    const shipName = document.getElementById('ship-name').value.trim() || "식별불가";
    const tonnage = document.getElementById('ship-tonnage').value.trim() || "식별불가";
    const shipType = document.getElementById('ship-type').value.trim() || "식별불가";
    const crewCount = document.getElementById('crew-count').value.trim() || "식별불가";
    
    // 위반 여부 처리
    const isViolation = document.getElementById('violation-check').checked;
    const violationDetail = document.getElementById('violation-detail').value.trim();
    const violationStatus = isViolation ? `O (${violationDetail || "내용없음"})` : "X";

    const distText = distKmDisplay.innerText.replace(' km', '');
    const distanceKmValue = distText === "--" ? "-" : distText;

    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t) : [];

    const newHistory = {
        date: identificationDate,
        
        raderStation: document.getElementById('radar-station-select')?.value || "-",
        traceNumber: document.getElementById('trace-num')?.value.trim() || "-",
        firstOutport: document.getElementById('departure')?.value || "-",
        direction: document.getElementById('move-dir')?.value || "-",
        distance: distanceKmValue,

        coord: fullCoordDisplay?.innerText || "-",
        telephonee: telephonee,

        // 식별 정보
        firstTime: document.getElementById('first-time')?.value || "00:00",
        firstPos: document.getElementById('first-pos')?.value || "-",
        firstAzEl: document.getElementById('first-az-el')?.value || "-",

        // 종료 정보
        lastTime: document.getElementById('last-time')?.value || "00:00",
        lastPos: document.getElementById('last-pos')?.value || "-",
        lastAzEl: document.getElementById('last-az-el')?.value || "-",

        // 복기 정보
        crewCount: crewCount,
        violation: violationStatus,
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
            if (tonnage !== "식별불가") existingShip.tonnage = tonnage;
            if (shipType !== "식별불가") existingShip.type = shipType;
            
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
                type: shipType,
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
        toggleViolationDetail();
        updateFullCoord();
        updateDistance();
    };

    tx.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("저장 중 오류가 발생했습니다.");
    };
}
