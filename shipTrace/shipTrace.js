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

// --- 모드 전환 로직 ---
function toggleTraceMode() {
    const mode = document.querySelector('input[name="trace-mode"]:checked').value;
    const inquirySection = document.getElementById('section-inquiry');
    
    // 문의 모드일 때만 추가 섹션 표시
    if (mode === 'inquiry') {
        inquirySection.style.display = 'block';
    } else {
        inquirySection.style.display = 'none';
    }
}

// --- 위치 및 문의 정보 관련 로직 ---
const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distKmDisplay = document.getElementById('dist-km-display');
const radarStationSelect = document.getElementById('radar-station-select');
const traceNumInput = document.getElementById('trace-num');

// 추적 번호 입력창 활성/비활성 제어
function toggleTraceNum() {
    if (radarStationSelect && radarStationSelect.value === "-") {
        traceNumInput.disabled = true;
        traceNumInput.value = "";
    } else if (traceNumInput) {
        traceNumInput.disabled = false;
    }
}
if (radarStationSelect) {
    radarStationSelect.addEventListener('change', toggleTraceNum);
    toggleTraceNum(); // 초기 상태 설정
}

// 거리 계산 로직 (1해리 = 1.852km, 1마일 = 1.609km)
function updateDistance() {
    if (!distValue || !distKmDisplay) return;
    let val = parseFloat(distValue.value);
    let unit = distUnit.value;
    if (isNaN(val)) {
        distKmDisplay.innerText = "-- km";
        return;
    }
    let km;
    if (unit === 'km') { km = val; }
    else if (unit === 'NM') { km = val * 1.852; }
    else if (unit === 'M') { km = val * 1.609; }

    distKmDisplay.innerText = `${km.toFixed(2)} km`;
}
if (distValue) distValue.addEventListener('input', updateDistance);
if (distUnit) distUnit.addEventListener('change', updateDistance);
// ------------------------------------------

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

// 어선법 위반 여부 토글
function toggleViolationDetail() {
    const violationSelect = document.getElementById('violation-select');
    const detailInput = document.getElementById('violation-detail');
    if (!violationSelect || !detailInput) return;
    
    detailInput.disabled = (violationSelect.value === "X");
    if (violationSelect.value === "X") detailInput.value = "";
}

function resetForm() {
    if (confirm("입력 중인 내용을 초기화할까요?")) {
        document.getElementById('trace-form').reset();
        toggleTraceMode();
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

    const mode = document.querySelector('input[name="trace-mode"]:checked').value;
    
    // 데이터 수집 (공통)
    const camera = document.getElementById('camera-num').value;
    const shipName = document.getElementById('ship-name').value.trim() || "식별불가";
    const tonnage = document.getElementById('ship-tonnage').value.trim() || "식별불가";
    const shipType = document.getElementById('ship-type').value.trim() || "식별불가";
    const crewCount = document.getElementById('crew-count').value.trim() || "식별불가";
    const worker = document.getElementById('worker').value.trim() || "미입력";
    
    const violationStatus = document.getElementById('violation-select').value;
    const violationDetail = document.getElementById('violation-detail').value.trim();
    const fullViolationText = (violationStatus === "O") ? `O (${violationDetail || "내용없음"})` : "X";

    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split('\n').map(t => t.trim()).filter(t => t) : [];

    const identificationDate = new Date().toISOString().split('T')[0];

    // 이동 경로 자동 생성
    const firstPos = document.getElementById('first-pos').value.trim() || "(최초 위치 미입력)";
    const moveDirCommon = document.getElementById('move-dir-common').value.trim() || "(이동 방향 미입력)";
    const lastPos = document.getElementById('last-pos').value.trim() || "(최종 위치 미입력)";
    const terminationReason = document.getElementById('termination-reason').value;
    
    const autoMovementPath = `${firstPos}에서 ${moveDirCommon}하여 ${lastPos}에서 ${terminationReason}`;

    // 데이터 객체 생성
    const newHistory = {
        mode: mode,
        date: identificationDate,
        timestamp: new Date().getTime(),
        
        // 공통 정보
        cameraNum: camera,
        shipName: shipName,
        tonnage: tonnage,
        shipType: shipType,
        crewCount: crewCount,
        worker: worker,
        firstTime: document.getElementById('first-time').value || "-",
        firstAzEl: document.getElementById('first-az-el').value || "-",
        firstPos: firstPos,
        lastTime: document.getElementById('last-time').value || "-",
        lastAzEl: document.getElementById('last-az-el').value || "-",
        lastPos: lastPos,
        moveDirOverall: moveDirCommon,
        terminationReason: terminationReason,
        movementPath: autoMovementPath,
        violation: fullViolationText,
        
        // 문의 식별 시에만 저장되는 정보
        coord: mode === 'inquiry' ? document.getElementById('coord-input').value.trim() : "-",
        raderStation: mode === 'inquiry' ? document.getElementById('radar-station-select').value : "-",
        traceNumber: mode === 'inquiry' ? document.getElementById('trace-num').value.trim() : "-",
        directionAtInquiry: mode === 'inquiry' ? document.getElementById('current-move-dir').value : "-",
        distance: mode === 'inquiry' ? distKmDisplay.innerText.replace(' km', '') : "-",
        firstOutport: mode === 'inquiry' ? document.getElementById('departure').value : "-",
        telephonee: mode === 'inquiry' ? document.getElementById('telephonee').value.trim() : "-",
        handoverDetails: mode === 'inquiry' ? document.getElementById('handover-details').value : "-",

        shipImage: "Images/no-image.jpg",
        pathImage: "Images/no-image.jpg"
    };

    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    
    const request = store.openCursor();
    let existingShip = null;
    let existingKey = null;

    request.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (cursor.value.name === shipName && shipName !== "식별불가") {
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
                tags: tags,
                history: [newHistory]
            };
            store.add(newShip, Date.now().toString());
        }
    };

    tx.oncomplete = () => {
        alert("추적 기록이 성공적으로 DB에 등록되었습니다.\n\n생성된 경로: " + autoMovementPath);
        document.getElementById('trace-form').reset();
        toggleTraceMode();
        toggleViolationDetail();
        toggleTraceNum();
        updateDistance();
    };

    tx.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("저장 중 오류가 발생했습니다.");
    };
}
