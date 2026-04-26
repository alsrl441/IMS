let selectedTags = [];
let currentPage = 1;
const itemsPerPage = 3; 
let currentFocus = -1; 
let shipData = []; 
let shipSliderState = {};
let editingTagsShipIdx = null;
let editingShipIdx = null;

async function editShipMainInfo(idx) {
    editingShipIdx = idx;
    renderShips();
}

function toggleActionsDropdown(idx) {
    document.querySelectorAll('.actions-dropdown').forEach((el, i) => {
        if (i !== idx) el.classList.remove('show');
    });

    const dropdown = document.getElementById(`actions-dropdown-${idx}`);
    if (dropdown) {
        dropdown.classList.toggle('show');
    }
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.ship-actions-wrapper')) {
        document.querySelectorAll('.actions-dropdown').forEach(el => el.classList.remove('show'));
    }
});

function cancelEditShip() {
    editingShipIdx = null;
    renderShips();
}

async function saveShipMainInfo(idx) {
    const card = document.querySelector(`.ship-card[data-idx="${idx}"]`);
    if (!card) return;

    const newName = card.querySelector('#edit-name').value.trim();
    const newType = card.querySelector('#edit-type').value.trim();
    const newTonnage = card.querySelector('#edit-tonnage').value.trim().replace(/t/gi, '');
    const newNumber = card.querySelector('#edit-number').value.trim();
    const newOwner = card.querySelector('#edit-owner').value.trim();
    const newTel = card.querySelector('#edit-tel').value.trim();
    const newTagsVal = card.querySelector('#edit-main-tags').value.trim();
    const newTags = newTagsVal ? newTagsVal.split(',').map(t => t.trim()).filter(t => t) : [];

    if (!newName) {
        alert("선명은 필수 입력 항목입니다.");
        return;
    }

    const ship = shipData[idx];
    ship.name = newName;
    ship.type = newType;
    ship.tonnage = newTonnage;
    ship.number = newNumber;
    ship.owner = newOwner;
    ship.tel = newTel;
    ship.tags = newTags;

    const success = await updateShipInDB(ship._dbKey, ship);
    if (success) {
        editingShipIdx = null;
        renderShips();
    }
}

async function loadShipsFromDB() {
    await window.ensureStore(TARGET_STORE_NAME);
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(TARGET_STORE_NAME, "readwrite");
            const store = tx.objectStore(TARGET_STORE_NAME);

            const countReq = store.count();
            countReq.onsuccess = () => {
                if (countReq.result === 0) {
                    const initialShipTemplate = {
                        "id": "0",
                        "name": "아라호",
                        "type": "선외기",
                        "tonnage": "2",
                        "number": "0000000-0000000",
                        "owner": "홍길동",
                        "tel": "010-0000-0000",
                        "tags": [
                            "특징 1",
                            "특징 2",
                            "특징 3"
                        ],
                        "history": [
                            {
                                "date": "2026-01-01",
                                "coord": "000 000",
                                "directionAtInquiry": "동진",
                                "distance": "1.9km",
                                "traceNumber": "145-1",
                                "firstOutport": "해태발",
                                "firstTime": "23:00",
                                "firstAzEl": "1234 56",
                                "firstPos": "송공항 남서쪽 1.9km",
                                "lastTime": "23:05",
                                "lastAzEl": "4567 89",
                                "lastPos": "송공항",
                                "tags": [
                                    "선미 검은색 모터",
                                    "조타실 상부 항해등"
                                ],
                                "moveDirOverall": "북동진",
                                "terminationReason": "입항",
                                "movementPath": "송공항 남서쪽 1.9km에서 북동진하여 송공항에 입항.",
                                "crewCount": "1",
                                "externalName": "X",
                                "handoverDetails": "145 R/S에서 인수받은 선박.",
                                "shipImage": "",
                                "pathImage": "",
                                "violation": "O (초록색 어선 번호판을 부착한 선박은 신호를 켜야 할 의무가 있음.)",
                                "worker": "상병 김철수",
                                "telephonee": "일병 홍길동",
                                "timestamp": 0,
                                "cameraNum": "송공항 CCTV"
                            }
                        ]
                    };
                    if (store.keyPath) {
                        store.put(initialShipTemplate);
                    } else {
                        store.put(initialShipTemplate, "template_key");
                    }
                }

                const results = [];
                store.openCursor().onsuccess = (event) => {
                    const cursor = event.target.result;
                    if (cursor) {
                        const data = cursor.value;
                        data._dbKey = cursor.key;
                        results.push(data);
                        cursor.continue();
                    } else {
                        resolve(results);
                    }
                };
            };
        };
        request.onerror = () => resolve([]);
    });
}

async function updateShipInDB(key, updatedData) {
    await window.ensureStore(TARGET_STORE_NAME);
    const dataToSave = { ...updatedData };
    delete dataToSave._dbKey;
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(TARGET_STORE_NAME, "readwrite");
            const store = tx.objectStore(TARGET_STORE_NAME);
            if (store.keyPath) {
                store.put(dataToSave);
            } else {
                store.put(dataToSave, key);
            }
            tx.oncomplete = () => resolve(true);
        };
    });
}

async function toggleTagEdit(shipIdx) {
    editingTagsShipIdx = (editingTagsShipIdx === shipIdx) ? null : shipIdx;
    renderShips();
}

async function addTagInline(event, shipIdx) {
    if (event.key === 'Enter') {
        const input = event.target;
        const newTag = input.value.trim();
        if (newTag) {
            const ship = shipData[shipIdx];
            if (!ship.tags) ship.tags = [];
            if (!ship.tags.includes(newTag)) {
                ship.tags.push(newTag);
                await updateShipInDB(ship._dbKey, ship);
                renderShips();
                setTimeout(() => {
                    const newInput = document.getElementById(`inline-tag-input-${shipIdx}`);
                    if (newInput) newInput.focus();
                }, 0);
            }
        }
    }
}

async function deleteTagInline(shipIdx, tagIdx) {
    const ship = shipData[shipIdx];
    ship.tags.splice(tagIdx, 1);
    await updateShipInDB(ship._dbKey, ship);
    renderShips();
}

function renderHistoryForm(shipIdx, historyIdx = null) {
    const ship = shipData[shipIdx];
    const isEdit = historyIdx !== null;
    const h = isEdit ? ship.history[historyIdx] : {
        date: new Date().toISOString().split('T')[0],
        firstTime: "00:00", firstPos: "", firstAzEl: "",
        lastTime: "00:00", lastPos: "", lastAzEl: "",
        moveDirOverall: "", terminationReason: "종료",
        crewCount: "식별불가", 
        traceNumber: "-", firstOutport: "-",
        violation: "X",
        worker: "", telephonee: "",
        externalName: "X", handoverDetails: "X",
        shipImage: "",
        pathImage: "",
        tags: [""]
    };

    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    const detailView = card.querySelector('.history-detail-view');

    detailView.innerHTML = `
        <div class="history-edit-container fade-in" style="display: flex; gap: 20px; padding: 10px; width: 100%;">
            <div class="edit-column" style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <div class="edit-group"><label>식별 날짜</label><input type="date" id="edit-date" value="${h.date}"></div>
                <div class="edit-group"><label>추적번호</label><input type="text" id="edit-tracenum" value="${h.traceNumber || '-'}"></div>
                <div class="edit-group"><label>최초 시간 / AzEl / 위치</label>
                    <div class="d-flex gap-1">
                        <input type="text" id="edit-first-time" value="${h.firstTime}" style="width: 60px;">
                        <input type="text" id="edit-first-azel" value="${h.firstAzEl || ''}" placeholder="AzEl" style="width: 80px;">
                        <input type="text" id="edit-first-pos" value="${h.firstPos}" placeholder="위치" style="flex:1;">
                    </div>
                </div>
                <div class="edit-group"><label>최종 시간 / AzEl / 위치</label>
                    <div class="d-flex gap-1">
                        <input type="text" id="edit-last-time" value="${h.lastTime}" style="width: 60px;">
                        <input type="text" id="edit-last-azel" value="${h.lastAzEl || ''}" placeholder="AzEl" style="width: 80px;">
                        <input type="text" id="edit-last-pos" value="${h.lastPos}" placeholder="위치" style="flex:1;">
                    </div>
                </div>
                <div class="history-actions" style="margin-top: auto;">
                    <button class="btn-custom btn-edit" onclick="showHistoryDetail(${shipIdx}, ${isEdit ? historyIdx : 0})">취소</button>
                    <button class="btn-custom btn-save" onclick="saveHistoryData(${shipIdx}, ${historyIdx})">${isEdit ? '저장' : '추가'}</button>
                </div>
            </div>
            <div class="edit-column" style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <div class="edit-group"><label>인원</label><input type="text" id="edit-crew" value="${h.crewCount}"></div>
                <div class="edit-group"><label>인수인계</label><textarea id="edit-handover" rows="3" style="font-size: 0.8rem;">${h.handoverDetails || 'X'}</textarea></div>
                <div class="edit-group"><label>외부명칭 / 깃발</label><input type="text" id="edit-external" value="${h.externalName || 'X'}"></div>
                <div class="edit-group"><label>특징</label><input type="text" id="edit-tags" value="${(h.tags || []).join(', ')}" placeholder="콤마(,)로 구분"></div>
                <div class="edit-group"><label>어선법 위반 여부</label><input type="text" id="edit-violation" value="${h.violation || 'X'}"></div>
                <div class="edit-group"><label>근무자 / 수화자</label>
                    <div class="d-flex gap-1">
                        <input type="text" id="edit-worker" value="${h.worker || ''}" placeholder="근무자">
                        <input type="text" id="edit-telephonee" value="${h.telephonee || ''}" placeholder="수화자">
                    </div>
                </div>
            </div>
            <div class="edit-column" style="flex: 1; display: flex; flex-direction: column; gap: 10px;">
                <div class="edit-group"><label>이동 경로</label><textarea id="edit-path-text" rows="3" style="font-size: 0.8rem;">${h.movementPath || ''}</textarea></div>
                
                <div class="edit-group"><label>선박 이미지</label>
                    <div class="history-drop-zone" id="edit-ship-drop-zone" style="height: 100px; border: 2px dashed #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #f9f9f9; cursor: pointer;">
                        <img id="edit-ship-preview" src="${h.shipImage}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                    </div>
                </div>

                <div class="edit-group"><label>항로 이미지</label>
                    <div class="history-drop-zone" id="edit-path-drop-zone" style="height: 100px; border: 2px dashed #ddd; border-radius: 4px; display: flex; align-items: center; justify-content: center; position: relative; overflow: hidden; background: #f9f9f9; cursor: pointer;">
                        <img id="edit-path-preview" src="${h.pathImage}" style="max-height: 100%; max-width: 100%; object-fit: contain;">
                    </div>
                </div>
            </div>
        </div>
    `;
    
    setTimeout(() => setupHistoryImageHandlers(), 0);
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
                    if (width > maxWidth) {
                        height *= maxWidth / width;
                        width = maxWidth;
                    }
                } else {
                    if (height > maxHeight) {
                        width *= maxHeight / height;
                        height = maxHeight;
                    }
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

function setupHistoryImageHandlers() {
    const zones = [
        { dropZone: 'edit-ship-drop-zone', preview: 'edit-ship-preview' },
        { dropZone: 'edit-path-drop-zone', preview: 'edit-path-preview' }
    ];

    zones.forEach(zone => {
        const dropZone = document.getElementById(zone.dropZone);
        const preview = document.getElementById(zone.preview);

        if (!dropZone || !preview) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#0d6efd';
            dropZone.style.background = '#eff6ff';
        });

        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '#ddd';
            dropZone.style.background = '#f9f9f9';
        });

        dropZone.addEventListener('drop', async (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#ddd';
            dropZone.style.background = '#f9f9f9';
            
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

async function saveHistoryData(shipIdx, historyIdx) {
    const ship = shipData[shipIdx];
    const isEdit = historyIdx !== null;
    
    const tagsEl = document.getElementById('edit-tags');
    const tagsVal = tagsEl ? tagsEl.value : "";
    const tagsArr = tagsVal ? tagsVal.split(',').map(t => t.trim()).filter(t => t) : (isEdit ? ship.history[historyIdx].tags : [""]);

    const newHistory = {
        date: document.getElementById('edit-date').value,
        firstTime: document.getElementById('edit-first-time').value,
        firstPos: document.getElementById('edit-first-pos').value,
        firstAzEl: document.getElementById('edit-first-azel').value,
        lastTime: document.getElementById('edit-last-time').value,
        lastPos: document.getElementById('edit-last-pos').value,
        lastAzEl: document.getElementById('edit-last-azel').value,
        tags: tagsArr,
        movementPath: document.getElementById('edit-path-text').value,
        crewCount: document.getElementById('edit-crew').value || "식별불가",
        violation: document.getElementById('edit-violation').value,
        traceNumber: document.getElementById('edit-tracenum').value,
        handoverDetails: document.getElementById('edit-handover').value,
        externalName: document.getElementById('edit-external').value,
        worker: document.getElementById('edit-worker').value,
        telephonee: document.getElementById('edit-telephonee').value,
        shipImage: document.getElementById('edit-ship-preview').src,
        pathImage: document.getElementById('edit-path-preview').src,
        timestamp: isEdit ? (ship.history[historyIdx].timestamp || new Date().getTime()) : new Date().getTime()
    };
    
    if (isEdit) ship.history[historyIdx] = newHistory;
    else ship.history.push(newHistory);

    // 선박 메인 태그에도 추가 (기존에 없던 것만)
    if (!ship.tags) ship.tags = [];
    tagsArr.forEach(t => {
        if (!ship.tags.includes(t)) {
            ship.tags.push(t);
        }
    });
    
    ship.history.sort((a, b) => b.date.localeCompare(a.date));
    await updateShipInDB(ship._dbKey, ship);
    
    sortShipData();
    renderShips();
    
    const newIdx = shipData.findIndex(s => s._dbKey === ship._dbKey);
    toggleCard(newIdx);
    showHistoryDetail(newIdx, 0);
}

function addHistory(shipIdx) {
    renderHistoryForm(shipIdx);
}

function editHistory(shipIdx, historyIdx) {
    renderHistoryForm(shipIdx, historyIdx);
}

async function deleteHistory(shipIdx, historyIdx) {
    const ship = shipData[shipIdx];
    if (confirm(`${ship.history[historyIdx].date} 기록을 삭제하시겠습니까?`)) {
        ship.history.splice(historyIdx, 1);
        await updateShipInDB(ship._dbKey, ship);
        
        sortShipData();
        renderShips();
    }
}

async function deleteShip(shipIdx) {
    await window.ensureStore(TARGET_STORE_NAME);
    const ship = shipData[shipIdx];
    if (confirm(`'${ship.name}' 선박의 모든 정보를 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(TARGET_STORE_NAME, "readwrite");
            const store = tx.objectStore(TARGET_STORE_NAME);
            store.delete(ship._dbKey);
            tx.oncomplete = () => {
                alert("선박 정보가 삭제되었습니다.");
                initShipSearch(); 
            };
        };
    }
}

function sortShipData() {
    shipData.sort((a, b) => {
        const latestA = (a.history && a.history.length > 0) ? a.history[0].date : "0000-00-00";
        const latestB = (b.history && b.history.length > 0) ? b.history[0].date : "0000-00-00";
        return latestB.localeCompare(latestA);
    });
}

async function initShipSearch() {
    shipData = await loadShipsFromDB();
    sortShipData();

    const input = document.getElementById('tag-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    if (!input) return;

    if (shipData.length === 0) {
        document.getElementById('ship-results').innerHTML = '<div class="text-center py-5 text-muted">등록된 선박 정보가 없습니다.</div>';
        return;
    }
    const termsSet = new Set();
    shipData.forEach(ship => {
        ['name', 'tonnage', 'type', 'number', 'tags'].forEach(field => {
            let val = ship[field];
            if (field === 'tonnage' && val && !String(val).toLowerCase().endsWith('t')) {
                val = String(val) + 't';
            }
            if (Array.isArray(val)) val.forEach(v => { if (v) termsSet.add(String(v).trim()); });
            else if (val) termsSet.add(String(val).trim());
        });
    });
    const allTerms = Array.from(termsSet);

    document.addEventListener('keydown', (e) => {
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA';
        if (isInput) return;

        if (e.key === 'ArrowLeft') {
            if (currentPage > 1) {
                currentPage--;
                renderShips();
            }
        } else if (e.key === 'ArrowRight') {
            const totalItems = getFilteredShips().length;
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderShips();
            }
        }
    });

    input.addEventListener('input', function() {
        let val = this.value;
        autocompleteList.innerHTML = '';
        currentFocus = -1;
        if (!val) { autocompleteList.style.display = 'none'; return; }
        let filtered = allTerms.filter(t => String(t).toLowerCase().includes(val.toLowerCase()) && !selectedTags.includes(t));
        autocompleteList.style.display = filtered.length > 0 ? 'block' : 'none';
        filtered.forEach(t => {
            let div = document.createElement('div');
            div.innerHTML = t.replace(new RegExp(`(${val})`, 'gi'), '<span class="highlight">$1</span>');
            div.onclick = () => { addTag(t); input.value = ''; autocompleteList.innerHTML = ''; autocompleteList.style.display = 'none'; };
            autocompleteList.appendChild(div);
        });
    });

    input.addEventListener('keydown', function(e) {
        let x = autocompleteList.getElementsByTagName('div');
        if (e.keyCode === 40) { currentFocus++; addActive(x); }
        else if (e.keyCode === 38) { currentFocus--; addActive(x); }
        else if (e.keyCode === 13 || e.keyCode === 9) {
            if (currentFocus > -1 && x[currentFocus]) { e.preventDefault(); x[currentFocus].click(); }
            else if (this.value && x[0]) { e.preventDefault(); x[0].click(); }
        }
    });

    function addActive(x) {
        if (!x) return;
        for (let i = 0; i < x.length; i++) x[i].classList.remove("autocomplete-active");
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
    }

    renderShips();
}

function addTag(tag) { if (!selectedTags.includes(tag)) { selectedTags.push(tag); currentPage = 1; renderSelectedTags(); renderShips(); } }
function removeTag(tag) { selectedTags = selectedTags.filter(t => t !== tag); currentPage = 1; renderSelectedTags(); renderShips(); }
function renderSelectedTags() {
    const container = document.getElementById('selected-tags');
    if (container) {
        container.innerHTML = selectedTags.map(tag => `
            <span class="tag-badge">${tag}<span class="remove-tag" onclick="removeTag('${tag}')">&times;</span></span>
        `).join('');
    }
}

function changeShipImage(shipIdx, delta) {
    const ship = shipData[shipIdx];
    if (!ship || !ship.history.length) return;
    let currentIdx = shipSliderState[shipIdx] || 0;
    currentIdx = (currentIdx + delta + ship.history.length) % ship.history.length;
    shipSliderState[shipIdx] = currentIdx;
    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    const track = card.querySelector('.slider-track');
    if (track) track.style.transform = `translateX(-${currentIdx * 100}%)`;
    card.querySelectorAll('.dot').forEach((d, i) => d.classList.toggle('active', i === currentIdx));
}

function toggleCard(shipIdx) {
    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    const isExpanded = card.classList.contains('is-expanded');
    document.querySelectorAll('.ship-card').forEach(c => c.classList.remove('is-expanded'));
    if (!isExpanded) { card.classList.add('is-expanded'); showHistoryDetail(shipIdx, 0); }
    else card.classList.remove('is-expanded');
}

function showHistoryDetail(shipIdx, historyIdx) {
    const ship = shipData[shipIdx];
    const h = ship.history[historyIdx];
    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    if (!card || !h) return;
    editingTagsShipIdx = null;
    
    const traceNo = h.traceNumber || "-";

    const displayCrew = (h.crewCount && !isNaN(h.crewCount)) ? h.crewCount + '명' : (h.crewCount || '식별불가');

    card.querySelectorAll('.history-date-item').forEach((item, idx) => item.classList.toggle('active', idx === historyIdx));
    
    card.querySelector('.history-detail-view').innerHTML = `
        <div class="history-layout-container fade-in">
            <!-- 중간: 식별 정보 -->
            <div class="history-middle">
                <div class="history-mid-left">
                    <div class="h-item"><label>최초 식별 시간</label><span>${h.firstTime}</span></div>
                    <div class="h-item"><label>최초 식별 위치</label><span>${h.firstAzEl || '-'} [${h.firstPos || '-'}]</span></div>
                    <div class="h-item"><label>최종 식별 시간</label><span>${h.lastTime}</span></div>
                    <div class="h-item"><label>최종 식별 위치</label><span>${h.lastAzEl || '-'} [${h.lastPos || '-'}]</span></div>
                    <div class="h-item"><label>추적번호</label><span>${traceNo}</span></div>
                    <div class="h-item"><label>인원</label><span>${displayCrew}</span></div>
                    
                    <div class="history-actions" style="margin-top: auto; display: flex; gap: 8px;">
                        <button class="btn-custom" style="width: 50px; height: 30px; padding: 0; font-size: 0.8rem; background-color: #0d6efd; color: white; border: none; border-radius: 4px;" onclick="editHistory(${shipIdx}, ${historyIdx})">수정</button>
                        <button class="btn-custom" style="width: 50px; height: 30px; padding: 0; font-size: 0.8rem; background-color: #dc3545; color: white; border: none; border-radius: 4px;" onclick="deleteHistory(${shipIdx}, ${historyIdx})">삭제</button>
                    </div>
                </div>
                <div class="history-mid-right">
                    <div class="h-item h-item-block">
                        <label>인수인계</label>
                        <div class="scroll-box">${h.handoverDetails || 'X'}</div>
                    </div>
                    <div class="h-item h-item-block">
                        <label>어선법 위반 여부</label>
                        <div class="scroll-box">${h.violation || 'X'}</div>
                    </div>
                    <div class="h-item"><label>외부명칭 / 깃발</label><span>${h.externalName || 'X'}</span></div>
                    <div class="h-item"><label>근무자</label><span>${h.worker || ''}</span></div>
                    <div class="h-item"><label>수화자</label><span>${h.telephonee || ''}</span></div>
                </div>
            </div>

            <!-- 우측: 항로 정보 -->
            <div class="history-side-right">
                <div class="path-img-container">
                    <img src="${h.pathImage}" class="path-img fade-in">
                </div>
                <div class="path-text-display">${h.movementPath || ''}</div>
            </div>
        </div>
    `;
}

function getFilteredShips() {
    return shipData.filter(s => {
        if (selectedTags.length === 0) return true;
        return selectedTags.every(t => 
            (s.name && s.name.includes(t)) || 
            (s.tonnage && (s.tonnage.includes(t) || (s.tonnage + 't').includes(t))) || 
            (s.type && s.type.includes(t)) || 
            (s.number && s.number.includes(t)) || 
            (s.owner && s.owner.includes(t)) ||
            (s.tags && s.tags.includes(t))
        );
    });
}

function renderShips() {
    const results = document.getElementById('ship-results');
    const paginationContainer = document.getElementById('pagination-container');
    if (!results) return;

    const filtered = getFilteredShips();

    const totalItems = filtered.length;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paged = filtered.slice(startIndex, startIndex + itemsPerPage);

    if (totalItems === 0) {
        results.innerHTML = '<div class="text-center py-5"><p class="text-secondary">검색 결과가 없습니다.</p></div>';
        if (paginationContainer) paginationContainer.innerHTML = '';
        return;
    }

    results.innerHTML = paged.map(ship => {
        const shipIdx = shipData.findIndex(s => s._dbKey === ship._dbKey);
        const currentImgIdx = shipSliderState[shipIdx] || 0;
        const isEditing = editingShipIdx === shipIdx;

        const displayTonnage = (ship.tonnage && !isNaN(ship.tonnage)) ? ship.tonnage + 't' : (ship.tonnage || '-');
        
        const displayContact = ship.tel ? `${ship.tel} ${ship.owner ? '(' + ship.owner + ')' : ''}` : (ship.owner || '-');

        return `
            <div class="ship-card" data-idx="${shipIdx}">
                <div class="ship-card-main">
                    <div class="ship-info-primary">
                        <div class="ship-name-row">
                            <div class="expand-btn" onclick="toggleCard(${shipIdx})"><span>&#9013;</span></div>
                            ${isEditing ? 
                                `<div class="edit-group" style="flex:1; margin-bottom:0;"><input type="text" id="edit-name" value="${ship.name}" placeholder="선명 입력" style="font-weight:700;"></div>` : 
                                `<h4>${ship.name}</h4>`
                            }
                            ${!isEditing ? `
                            <div class="ship-actions-wrapper">
                                <button class="btn-actions" onclick="event.stopPropagation(); toggleActionsDropdown(${shipIdx})" title="작업">⋮</button>
                                <div id="actions-dropdown-${shipIdx}" class="actions-dropdown">
                                    <button class="actions-dropdown-item" onclick="event.stopPropagation(); editShipMainInfo(${shipIdx})">수정</button>
                                    <button class="actions-dropdown-item delete" onclick="event.stopPropagation(); deleteShip(${shipIdx})">삭제</button>
                                </div>
                            </div>` : ''}
                        </div>
                        <div class="ship-meta-group" style="${isEditing ? 'gap: 2px;' : ''}">
                            ${isEditing ? `
                                <div class="edit-group edit-row">
                                    <label>선종</label>
                                    <input type="text" id="edit-type" value="${ship.type || ''}" placeholder="-">
                                </div>
                                <div class="edit-group edit-row">
                                    <label>톤수</label>
                                    <input type="text" id="edit-tonnage" value="${ship.tonnage || ''}" placeholder="-">
                                </div>
                                <div class="edit-group edit-row">
                                    <label>어선번호</label>
                                    <input type="text" id="edit-number" value="${ship.number || ''}" placeholder="-">
                                </div>
                                <div class="edit-group edit-row">
                                    <label>선주</label>
                                    <input type="text" id="edit-owner" value="${ship.owner || ''}" placeholder="-">
                                </div>
                                <div class="edit-group edit-row">
                                    <label>연락처</label>
                                    <input type="text" id="edit-tel" value="${ship.tel || ''}" placeholder="-">
                                </div>
                                <div class="edit-group edit-row">
                                    <label>특징</label>
                                    <input type="text" id="edit-main-tags" value="${(ship.tags || []).join(', ')}" placeholder="콤마(,)로 구분">
                                </div>
                                <div class="history-actions" style="margin-top: 4px; padding-top: 0; justify-content: flex-end; gap: 4px;">
                                    <button class="btn-custom btn-save" onclick="event.stopPropagation(); saveShipMainInfo(${shipIdx})" style="padding: 2px 8px; font-size: 0.7rem;">확인</button>
                                    <button class="btn-custom btn-edit" onclick="event.stopPropagation(); cancelEditShip()" style="padding: 2px 8px; font-size: 0.7rem;">취소</button>
                                </div>
                            ` : `
                                <p class="ship-detail"><strong>선종</strong> ${ship.type || '-'}</p>
                                <p class="ship-detail"><strong>톤수</strong> ${displayTonnage}</p>
                                <p class="ship-detail"><strong>어선번호</strong> ${ship.number || '-'}</p>
                                <p class="ship-detail"><strong>연락처</strong> ${displayContact}</p>
                            `}
                        </div>
                    </div>
                    <div class="ship-info-tags">
                        <div class="ship-tags">
                            ${(ship.tags || []).map((t, tIdx) => `<span class="tag-badge ${editingTagsShipIdx === shipIdx ? 'edit-mode' : ''}">${t}<span class="tag-delete-btn" onclick="event.stopPropagation(); deleteTagInline(${shipIdx}, ${tIdx})">&times;</span></span>`).join('')}
                            ${editingTagsShipIdx === shipIdx ? 
                                `<input type="text" id="inline-tag-input-${shipIdx}" class="inline-tag-input" onkeydown="addTagInline(event, ${shipIdx})" autofocus>
                                 <button class="btn-custom btn-save py-0" onclick="toggleTagEdit(${shipIdx})" style="font-size: 0.7rem;">완료</button>` : 
                                `<button class="btn-custom btn-edit py-0" onclick="toggleTagEdit(${shipIdx})" style="font-size: 0.7rem;">수정</button>`}
                        </div>
                    </div>
                    <div class="ship-photo-slider">
                        <div class="slider-nav slider-prev" onclick="changeShipImage(${shipIdx}, -1)">&lt;</div>
                        <div class="slider-track" style="transform: translateX(-${currentImgIdx * 100}%);">
                            ${(ship.history && ship.history.length > 0) ? ship.history.map(h => h.shipImage ? `<img src="${h.shipImage}" class="slider-img">` : '').join('') : ''}
                        </div>
                        <div class="slider-nav slider-next" onclick="changeShipImage(${shipIdx}, 1)">&gt;</div>
                        <div class="slider-dots">${(ship.history || []).map((_, i) => `<div class="dot ${i === currentImgIdx ? 'active' : ''}"></div>`).join('')}</div>
                    </div>
                </div>
                <div class="ship-card-expanded">
                    <div class="history-date-list">
                        ${(ship.history || []).map((h, i) => `<div class="history-date-item" onclick="showHistoryDetail(${shipIdx}, ${i})">${h.date} (${h.firstTime})</div>`).join('')}
                        <div class="history-date-item text-primary" onclick="addHistory(${shipIdx})" style="font-weight: 700;">+ 추가</div>
                    </div>
                    <div class="history-detail-view-wrapper">
                        <div class="history-detail-view"></div>
                    </div>
                </div>
            </div>`;
    }).join('');

    renderPagination(totalItems);
}

function renderPagination(totalItems) {
    const container = document.getElementById('pagination-container');
    if (!container) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    container.innerHTML = '';

    const createBtn = (text, page, isActive = false, isDisabled = false) => {
        const btn = document.createElement('button');
        btn.innerText = text;
        btn.classList.add('page-btn');
        if (isActive) btn.classList.add('active');
        if (isDisabled) btn.disabled = true;
        btn.onclick = () => {
            currentPage = page;
            renderShips();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        };
        return btn;
    };

    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);
    if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

    if (totalPages > 1) {
        container.appendChild(createBtn('<', Math.max(1, currentPage - 1), false, currentPage === 1));
        for (let i = startPage; i <= endPage; i++) {
            container.appendChild(createBtn(i, i, i === currentPage));
        }
        container.appendChild(createBtn('>', Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
    }
}

document.addEventListener('DOMContentLoaded', initShipSearch);