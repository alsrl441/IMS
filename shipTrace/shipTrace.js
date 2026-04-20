// STORE 이름은 shipTrace.js 내에서만 쓰이므로 변수명 충돌 방지를 위해 지역 변수로 유지하거나 var 사용
var STORE_IDENTIFIED = 'identified_ships';
var STORE_UNIDENTIFIED = 'unidentified_ships';
var db;

function initDB() {
    // script.js에 선언된 전역 DB_NAME 사용
    const request = indexedDB.open(DB_NAME);

    request.onupgradeneeded = (e) => {
        const upgradeDb = e.target.result;
        if (!upgradeDb.objectStoreNames.contains(STORE_IDENTIFIED)) {
            upgradeDb.createObjectStore(STORE_IDENTIFIED);
        }
        if (!upgradeDb.objectStoreNames.contains(STORE_UNIDENTIFIED)) {
            upgradeDb.createObjectStore(STORE_UNIDENTIFIED);
        }
    };

    request.onsuccess = (e) => {
        db = e.target.result;
        // 런타임에 스토어가 없는 경우를 대비한 체크
        if (!db.objectStoreNames.contains(STORE_IDENTIFIED) || !db.objectStoreNames.contains(STORE_UNIDENTIFIED)) {
            const version = db.version;
            db.close();
            const upgradeRequest = indexedDB.open(DB_NAME, version + 1);
            upgradeRequest.onupgradeneeded = (ev) => {
                const upDb = ev.target.result;
                if (!upDb.objectStoreNames.contains(STORE_IDENTIFIED)) upDb.createObjectStore(STORE_IDENTIFIED);
                if (!upDb.objectStoreNames.contains(STORE_UNIDENTIFIED)) upDb.createObjectStore(STORE_UNIDENTIFIED);
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

function toggleTraceMode() {
    const modeEl = document.querySelector('input[name="trace-mode"]:checked');
    if (!modeEl) return;
    
    const mode = modeEl.value;
    const inquirySection = document.getElementById('section-inquiry');
    
    if (!inquirySection) return;

    if (mode === 'inquiry') {
        inquirySection.style.setProperty('display', 'block', 'important');
    } else {
        inquirySection.style.setProperty('display', 'none', 'important');
    }
}
window.toggleTraceMode = toggleTraceMode;

// 이벤트 리스너 등록 및 초기화
document.addEventListener('DOMContentLoaded', () => {
    const modeRadios = document.querySelectorAll('input[name="trace-mode"]');
    modeRadios.forEach(radio => {
        radio.addEventListener('change', toggleTraceMode);
    });
    
    // 초기 실행
    toggleTraceMode();
});

const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distKmDisplay = document.getElementById('dist-km-display');
const radarStationSelect = document.getElementById('radar-station-select');
const traceNumInput = document.getElementById('trace-num');

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
    toggleTraceNum();
}

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

    distKmDisplay.innerText = `${km.toFixed(1)} km`;
}
if (distValue) distValue.addEventListener('input', updateDistance);
if (distUnit) distUnit.addEventListener('change', updateDistance);


function updateMovementPathPreview() {
    const firstPos = document.getElementById('first-pos').value.trim() || "(최초 위치)";
    const moveDir = document.getElementById('move-dir-common').value.trim() || "(이동 방향)";
    const lastPos = document.getElementById('last-pos').value.trim() || "(최종 위치)";
    const reason = document.getElementById('termination-reason').value;
    
    const previewText = `${firstPos}에서 ${moveDir}하여 ${lastPos}에서 ${reason}.`;
    const previewElement = document.getElementById('path-preview-text');
    if (previewElement) {
        previewElement.innerText = previewText;
    }
}

['first-pos', 'move-dir-common', 'last-pos', 'termination-reason'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
        const eventType = el.tagName === 'SELECT' ? 'change' : 'input';
        el.addEventListener(eventType, updateMovementPathPreview);
    }
});

updateMovementPathPreview();

function setCurrentTime(targetId) {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    document.getElementById(targetId).value = `${hours}:${minutes}`;
}

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
        updateMovementPathPreview();
    }
}

async function saveTraceLog() {
    if (!db) {
        alert("데이터베이스가 아직 준비되지 않았습니다.");
        return;
    }

    const mode = document.querySelector('input[name="trace-mode"]:checked').value;
    
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

    const firstPos = document.getElementById('first-pos').value.trim() || "(최초 위치 미입력)";
    const moveDirCommon = document.getElementById('move-dir-common').value.trim() || "(이동 방향 미입력)";
    const lastPos = document.getElementById('last-pos').value.trim() || "(최종 위치 미입력)";
    const terminationReason = document.getElementById('termination-reason').value;
    
    const autoMovementPath = `${firstPos}에서 ${moveDirCommon}하여 ${lastPos}에서 ${terminationReason}.`;

    const newHistory = {
        mode: mode,
        date: identificationDate,
        timestamp: new Date().getTime(),
        
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

    const isIdentified = (shipName !== "식별불가");
    const targetStoreName = isIdentified ? STORE_IDENTIFIED : STORE_UNIDENTIFIED;
    
    const tx = db.transaction(targetStoreName, "readwrite");
    const store = tx.objectStore(targetStoreName);
    
    if (isIdentified) {
        // 식별 선박 로직: 기존 선박이 있는지 확인하고 히스토리 추가
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
                // 기존 정보가 '식별불가'나 '-'가 아닐 경우에만 유지 (이미 값이 있으면 덮어쓰지 않음)
                if (!existingShip.tonnage || existingShip.tonnage === "식별불가" || existingShip.tonnage === "-") {
                    if (tonnage !== "식별불가") existingShip.tonnage = tonnage;
                }
                if (!existingShip.type || existingShip.type === "식별불가" || existingShip.type === "-") {
                    if (shipType !== "식별불가") existingShip.type = shipType;
                }
                
                // number와 tel도 기존에 있으면 유지
                if (!existingShip.number || existingShip.number === "-") existingShip.number = "-";
                if (!existingShip.tel || existingShip.tel === "-") existingShip.tel = "-";

                if (!Array.isArray(existingShip.tags)) existingShip.tags = [];
                tags.forEach(t => {
                    if (!existingShip.tags.includes(t)) existingShip.tags.push(t);
                });

                if (!existingShip.history) existingShip.history = [];
                existingShip.history.unshift(newHistory);
                
                if (store.keyPath) {
                    store.put(existingShip);
                } else {
                    store.put(existingShip, existingKey);
                }
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
                
                if (store.keyPath) {
                    // keyPath가 설정되어 있다면, 객체 안에 해당 필드가 있어야 함 (예: name)
                    store.add(newShip);
                } else {
                    store.add(newShip, Date.now().toString());
                }
            }
        };
    } else {
        // 미식별 선박 로직: 무조건 매번 새로 씀
        const newShip = {
            name: shipName,
            tonnage: tonnage,
            type: shipType,
            number: "-",
            tel: "-",
            tags: tags,
            history: [newHistory]
        };
        
        if (store.keyPath) {
            store.add(newShip);
        } else {
            store.add(newShip, Date.now().toString());
        }
    }

    tx.oncomplete = () => {
        alert("추적 기록이 성공적으로 DB에 등록되었습니다.\n\n생성된 경로: " + autoMovementPath);
        document.getElementById('trace-form').reset();
        toggleTraceMode();
        toggleViolationDetail();
        toggleTraceNum();
        updateDistance();
        updateMovementPathPreview();
    };

    tx.onerror = (e) => {
        console.error("저장 실패:", e.target.error);
        alert("저장 중 오류가 발생했습니다.");
    };
}
