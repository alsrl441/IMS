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
const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distKmDisplay = document.getElementById('dist-km-display');
const radarStationSelect = document.getElementById('radar-station-select');
const traceNumInput = document.getElementById('trace-num');

// 추적 번호 입력창 활성/비활성 제어
function toggleTraceNum() {
    if (radarStationSelect.value === "-") {
        traceNumInput.disabled = true;
        traceNumInput.value = "";
    } else {
        traceNumInput.disabled = false;
    }
}
if (radarStationSelect) {
    radarStationSelect.addEventListener('change', toggleTraceNum);
    toggleTraceNum(); // 초기 상태 설정
}

// 거리 계산 로직 (1마일 = 1.609km, 소수점 둘째자리 반올림)
function updateDistance() {
    let val = parseFloat(distValue.value);
    let unit = distUnit.value;
    if (isNaN(val)) {
        distKmDisplay.innerText = "-- km";
        return;
    }
    let km;
    if (unit === 'km') { km = val; }
    else if (unit === 'NM') { km = val * 1.852; } // 해리(Nautical Mile)
    else if (unit === 'M') { km = val * 1.609; }  // 마일(Mile)

    distKmDisplay.innerText = `${km.toFixed(2)} km`;
}
if (distValue) distValue.addEventListener('input', updateDistance);
if (distUnit) distUnit.addEventListener('change', updateDistance);
// ------------------------------------------

let identificationDate = new Date().toISOString().split('T')[0];

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

// 어선법 위반 여부 토글
function toggleViolationDetail() {
    const violationValue = document.getElementById('violation-select').value;
    const detailInput = document.getElementById('violation-detail');
    detailInput.disabled = (violationValue === "X");
    if (violationValue === "X") detailInput.value = "";
}

function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        toggleViolationDetail();
        toggleTraceNum();
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
    const violationStatus = document.getElementById('violation-select').value;
    const violationDetail = document.getElementById('violation-detail').value.trim();
    const fullViolationText = (violationStatus === "O") ? `O (${violationDetail || "내용없음"})` : "X";

    const distText = distKmDisplay.innerText.replace(' km', '');
    const distanceKmValue = distText === "--" ? "-" : distText;

    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split('\n').map(t => t.trim()).filter(t => t) : [];

    const newHistory = {
        date: identificationDate,
        
        raderStation: radarStationSelect?.value || "-",
        traceNumber: traceNumInput?.value.trim() || "-",
        firstOutport: document.getElementById('departure')?.value || "-",
        direction: document.getElementById('move-dir')?.value || "-",
        distance: distanceKmValue,

        coord: document.getElementById('coord-input')?.value.trim() || "-",
        telephonee: telephonee,

        firstTime: document.getElementById('first-time')?.value || "00:00",
        firstPos: document.getElementById('first-pos')?.value || "-",
        firstAzEl: document.getElementById('first-az-el')?.value || "-",

        lastTime: document.getElementById('last-time')?.value || "00:00",
        lastPos: document.getElementById('last-pos')?.value || "-",
        lastAzEl: document.getElementById('last-az-el')?.value || "-",

        crewCount: crewCount,
        violation: fullViolationText,
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
        toggleTraceNum();
        updateDistance();
    };

    tx.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("저장 중 오류가 발생했습니다.");
    };
}
