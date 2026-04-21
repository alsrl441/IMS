var STORE_IDENTIFIED = 'identified_ships';
var STORE_UNIDENTIFIED = 'unidentified_ships';
var db;

function initDB() {
    const request = indexedDB.open(DB_NAME);

    request.onsuccess = (e) => {
        const tempDb = e.target.result;
        if (!tempDb.objectStoreNames.contains(STORE_IDENTIFIED) || !tempDb.objectStoreNames.contains(STORE_UNIDENTIFIED)) {
            const newVersion = tempDb.version + 1;
            tempDb.close();
            
            const upgradeRequest = indexedDB.open(DB_NAME, newVersion);
            upgradeRequest.onupgradeneeded = (ev) => {
                const upgradeDb = ev.target.result;
                if (!upgradeDb.objectStoreNames.contains(STORE_IDENTIFIED)) {
                    upgradeDb.createObjectStore(STORE_IDENTIFIED, { keyPath: 'id' });
                }
                if (!upgradeDb.objectStoreNames.contains(STORE_UNIDENTIFIED)) {
                    upgradeDb.createObjectStore(STORE_UNIDENTIFIED, { keyPath: 'id' });
                }
            };
            upgradeRequest.onsuccess = (ev) => {
                db = ev.target.result;
                console.log("[IndexedDB] 스토어 생성 및 연결 성공");
            };
        } else {
            db = tempDb;
        }
    };

    request.onupgradeneeded = (e) => {
        const upgradeDb = e.target.result;
        if (!upgradeDb.objectStoreNames.contains(STORE_IDENTIFIED)) {
            upgradeDb.createObjectStore(STORE_IDENTIFIED, { keyPath: 'id' });
        }
        if (!upgradeDb.objectStoreNames.contains(STORE_UNIDENTIFIED)) {
            upgradeDb.createObjectStore(STORE_UNIDENTIFIED, { keyPath: 'id' });
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
    const basicInfoFields = document.querySelectorAll('.ship-basic-info .input-field:not(.always-show)');

    if (mode === 'inquiry') {
        if (inquirySection) inquirySection.style.display = 'block';
        basicInfoFields.forEach(f => f.style.display = 'flex');
    } else {
        if (inquirySection) inquirySection.style.display = 'none';
        basicInfoFields.forEach(f => {
            if (!f.classList.contains('always-show')) f.style.display = 'none';
        });
    }
}

const traceModeRadios = document.querySelectorAll('input[name="trace-mode"]');
if (traceModeRadios.length > 0) {
    traceModeRadios.forEach(r => r.addEventListener('change', toggleTraceMode));
    toggleTraceMode();
}

function toggleTraceNum() {
    const select = document.getElementById('radar-station-select');
    const traceNumInput = document.getElementById('trace-num');
    if (!select || !traceNumInput) return;

    if (select.value === "") {
        traceNumInput.value = "";
        traceNumInput.disabled = true;
    } else {
        traceNumInput.disabled = false;
    }
}
const radarStationSelect = document.getElementById('radar-station-select');
if (radarStationSelect) {
    radarStationSelect.addEventListener('change', toggleTraceNum);
    toggleTraceNum();
}

const distValue = document.getElementById('dist-value');
const distUnit = document.getElementById('dist-unit');
const distKmDisplay = document.getElementById('dist-km-display');

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


function getAutoMovementPath(firstPos, moveDir, lastPos, reason) {
    let reasonText = "";
    const attachRo = (word) => {
        if (!word || word.endsWith(")")) return word + "(으)로";
        const lastChar = word.charCodeAt(word.length - 1);
        const batchimCode = (lastChar - 0xAC00) % 28;
        return (batchimCode !== 0 && batchimCode !== 8) ? word + "으로" : word + "로";
    };

    switch (reason) {
        case "소실": reasonText = `${attachRo(lastPos)} 소실`; break;
        case "입항": reasonText = `${lastPos}에 입항`; break;
        case "정박": reasonText = `${lastPos}에서 정박`; break;
        case "정상 활동": reasonText = `${lastPos}에서 정상 활동으로 추적 종료`; break;
        case "타 선박 문의": reasonText = `${lastPos}에서 타 선박 문의로 추적 종료`; break;
        default: reasonText = `${lastPos}에서 ${reason}`;
    }
    return `${firstPos}에서 ${moveDir}하여 ${reasonText}.`;
}

function updateMovementPathPreview() {
    const firstPos = document.getElementById('first-pos').value.trim() || "(최초 위치)";
    const moveDir = document.getElementById('move-dir-common').value.trim() || "(이동 방향)";
    const lastPos = document.getElementById('last-pos').value.trim() || "(최종 위치)";
    const reason = document.getElementById('termination-reason').value;
    
    const previewText = getAutoMovementPath(firstPos, moveDir, lastPos, reason);
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

    const firstTime = document.getElementById('first-time').value;
    const lastTime = document.getElementById('last-time').value;
    const firstAzEl = document.getElementById('first-az-el').value.trim();
    const lastAzEl = document.getElementById('last-az-el').value.trim();
    const firstPos = document.getElementById('first-pos').value.trim();
    const lastPos = document.getElementById('last-pos').value.trim();
    const moveDirCommon = document.getElementById('move-dir-common').value.trim();
    const shipPreview = document.getElementById('ship-preview');
    const pathPreview = document.getElementById('path-preview');

    if (!firstTime || !lastTime || !firstAzEl || !lastAzEl || !firstPos || !lastPos || !moveDirCommon) {
        alert("최초/최종 식별 시간, 방위각/고각/위치, 이동 방향은 필수 입력 항목입니다.");
        return;
    }

    if (!shipPreview.src || shipPreview.src === window.location.href) {
        alert("선박 외형 사진을 등록해주세요.");
        return;
    }
    if (!pathPreview.src || pathPreview.src === window.location.href) {
        alert("이동 경로 사진을 등록해주세요.");
        return;
    }

    const shipName = document.getElementById('ship-name').value.trim() || "식별불가";
    const shipType = document.getElementById('ship-type').value.trim() || "";
    const tonnage = document.getElementById('ship-tonnage').value.trim().replace(/t/gi, '') || "";
    const shipNumber = document.getElementById('ship-number').value.trim() || "";
    const shipOwner = document.getElementById('ship-owner').value.trim() || "";
    const shipTel = document.getElementById('ship-tel').value.trim() || "";

    const worker = document.getElementById('worker').value.trim() || "미입력";
    const telephonee = document.getElementById('telephonee').value.trim() || "";
    const violationStatus = document.getElementById('violation-select').value;
    const violationDetail = document.getElementById('violation-detail').value.trim();
    const fullViolationText = (violationStatus === "O") ? `O (${violationDetail})` : "X";

    const tagString = document.getElementById('tags').value;
    const tags = tagString ? tagString.split(',').map(t => t.trim()).filter(t => t) : [];

    const identificationDate = new Date().toISOString().split('T')[0];
    const terminationReason = document.getElementById('termination-reason').value;
    const autoMovementPath = getAutoMovementPath(firstPos, moveDirCommon, lastPos, terminationReason);

    let distKm = "0";
    if (mode === 'inquiry') {
        const val = parseFloat(document.getElementById('dist-value').value);
        const unit = document.getElementById('dist-unit').value;
        if (!isNaN(val)) {
            if (unit === 'km') distKm = val.toFixed(1);
            else if (unit === 'NM') distKm = (val * 1.852).toFixed(1);
            else if (unit === 'M') distKm = (val * 1.609).toFixed(1);
        }
    }

    const newHistory = {
        date: identificationDate,
        coord: mode === 'inquiry' ? document.getElementById('coord-input').value.trim() : "",
        directionAtInquiry: mode === 'inquiry' ? document.getElementById('current-move-dir').value : "",
        distance: distKm + "km",
        traceNumber: mode === 'inquiry' ? (document.getElementById('radar-station-select').value + "-" + document.getElementById('trace-num').value.trim()) : "",
        firstOutport: mode === 'inquiry' ? document.getElementById('departure').value : "",
        firstTime: firstTime,
        firstAzEl: firstAzEl,
        firstPos: firstPos,
        lastTime: lastTime,
        lastAzEl: lastAzEl,
        lastPos: lastPos,
        tags: tags,
        moveDirOverall: moveDirCommon,
        terminationReason: terminationReason,
        movementPath: autoMovementPath,
        crewCount: document.getElementById('crew-count').value.trim().replace(/명/g, '') || "식별불가",
        externalName: document.getElementById('external-name').value.trim() || "X",
        handoverDetails: mode === 'inquiry' ? (document.getElementById('handover-details').value || "X") : "X",
        shipImage: shipPreview.src,
        pathImage: pathPreview.src,
        violation: fullViolationText,
        worker: worker,
        telephonee: telephonee,
        timestamp: new Date().getTime(),
        cameraNum: document.getElementById('camera-num').value
    };

    const isIdentified = (shipName !== "식별불가");
    const targetStoreName = isIdentified ? STORE_IDENTIFIED : STORE_UNIDENTIFIED;
    const tx = db.transaction(targetStoreName, "readwrite");
    const store = tx.objectStore(targetStoreName);
    
    const getReq = store.openCursor();
    let existingShip = null;
    let existingKey = null;

    getReq.onsuccess = (e) => {
        const cursor = e.target.result;
        if (cursor) {
            if (isIdentified && cursor.value.name === shipName) {
                existingShip = cursor.value;
                existingKey = cursor.key;
            } else {
                cursor.continue();
                return;
            }
        }

        if (existingShip) {
            if (!existingShip.type) existingShip.type = shipType;
            if (!existingShip.tonnage) existingShip.tonnage = tonnage;
            if (!existingShip.number) existingShip.number = shipNumber;
            if (!existingShip.owner) existingShip.owner = shipOwner;
            if (!existingShip.tel) existingShip.tel = shipTel;

            if (!existingShip.tags) existingShip.tags = [];
            tags.forEach(t => {
                if (!existingShip.tags.includes(t)) existingShip.tags.push(t);
            });

            if (!existingShip.history) existingShip.history = [];
            existingShip.history.unshift(newHistory);
            
            store.put(existingShip);
        } else {
            const newShip = {
                id: Date.now().toString(),
                name: shipName,
                type: shipType,
                tonnage: tonnage,
                number: shipNumber,
                owner: shipOwner,
                tel: shipTel,
                tags: tags,
                history: [newHistory]
            };
            store.add(newShip);
        }
    };

    tx.oncomplete = () => {
        alert("추적 기록이 성공적으로 DB에 등록되었습니다.");
        document.getElementById('trace-form').reset();
        document.getElementById('ship-preview').src = "";
        document.getElementById('path-preview').src = "";
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

function compressImage(file, maxWidth = 800, maxHeight = 600) {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = (event) => {
            const img = new Image();
            img.src = event.target.result;
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                if (width > height) {
                    if (width > maxWidth) { height *= maxWidth / width; width = maxWidth; }
                } else {
                    if (height > maxHeight) { width *= maxHeight / height; height = maxHeight; }
                }
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                resolve(dataUrl);
            };
        };
    });
}

function setupImageHandlers() {
    const zones = [
        { dropZone: 'ship-drop-zone', preview: 'ship-preview' },
        { dropZone: 'path-drop-zone', preview: 'path-preview' }
    ];
    zones.forEach(zone => {
        const dropZone = document.getElementById(zone.dropZone);
        const preview = document.getElementById(zone.preview);
        if (!dropZone || !preview) return;
        dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
        dropZone.addEventListener('dragleave', () => { dropZone.classList.remove('drag-over'); });
        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.classList.remove('drag-over');
            const files = e.dataTransfer.files;
            if (files && files.length > 0) {
                const file = files[0];
                if (file.type.startsWith('image/')) {
                    const compressedData = await compressImage(file);
                    preview.src = compressedData;
                }
            }
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    setupImageHandlers();
    toggleTraceMode();
    toggleViolationDetail();
    toggleTraceNum();
    updateDistance();
});
