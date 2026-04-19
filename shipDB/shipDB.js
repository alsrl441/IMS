let selectedTags = [];
let currentPage = 1;
const itemsPerPage = 4; 
let currentFocus = -1; 
let shipData = []; 
let shipSliderState = {};
let editingTagsShipIdx = null;

const DB_NAME = "IMS_database";
// TARGET_STORE_NAME은 각 페이지(identified.js, unidentified.js)에서 정의함

async function loadShipsFromDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(TARGET_STORE_NAME)) {
                console.warn(`'${TARGET_STORE_NAME}' store not found`);
                resolve([]);
                return;
            }
            const tx = db.transaction(TARGET_STORE_NAME, "readonly");
            const store = tx.objectStore(TARGET_STORE_NAME);
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
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains(TARGET_STORE_NAME)) db.createObjectStore(TARGET_STORE_NAME);
        };
        request.onerror = () => resolve([]);
    });
}

async function updateShipInDB(key, updatedData) {
    const dataToSave = { ...updatedData };
    delete dataToSave._dbKey;
    return new Promise((resolve) => {
        const request = indexedDB.open(DB_NAME);
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction(TARGET_STORE_NAME, "readwrite");
            const store = tx.objectStore(TARGET_STORE_NAME);
            store.put(dataToSave, key);
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
        firstTime: "00:00", firstPos: "", firstAzEl: "-",
        lastTime: "00:00", lastPos: "", lastAzEl: "-",
        crewCount: "식별불가", 
        raderStation: "-", traceNumber: "-", firstOutport: "-", direction: "-", distance: "-",
        violation: "무",
        worker: "", telephonee: "",
        shipImage: "Images/no-image.jpg",
        pathImage: "Images/no-image.jpg"
    };

    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    const detailView = card.querySelector('.history-detail-view');
    const pathBox = card.querySelector('.history-path-box');

    detailView.innerHTML = `
        <div class="history-info-group fade-in">
            <div class="edit-group"><label>식별 날짜</label><input type="date" id="edit-date" value="${h.date}"></div>
            <div class="edit-group"><label>인원</label><input type="text" id="edit-crew" value="${h.crewCount}"></div>
            <div class="edit-group"><label>최초 시간/위치/AzEl</label>
                <div class="d-flex gap-1">
                    <input type="time" id="edit-first-time" value="${h.firstTime}" style="width: 85px;">
                    <input type="text" id="edit-first-pos" value="${h.firstPos}" placeholder="위치" style="flex:1;">
                    <input type="text" id="edit-first-azel" value="${h.firstAzEl || '-'}" placeholder="Az/El" style="width: 90px;">
                </div>
            </div>
            <div class="edit-group"><label>최종 시간/위치/AzEl</label>
                <div class="d-flex gap-1">
                    <input type="time" id="edit-last-time" value="${h.lastTime}" style="width: 85px;">
                    <input type="text" id="edit-last-pos" value="${h.lastPos}" placeholder="위치" style="flex:1;">
                    <input type="text" id="edit-last-azel" value="${h.lastAzEl || '-'}" placeholder="Az/El" style="width: 90px;">
                </div>
            </div>
        </div>
        <div class="history-info-group fade-in">
            <div class="edit-group"><label>문의 기지/추적번호</label>
                <div class="d-flex gap-1">
                    <input type="text" id="edit-rader" value="${h.raderStation}" style="width: 80px;">
                    <input type="text" id="edit-tracenum" value="${h.traceNumber}" style="flex:1;">
                </div>
            </div>
            <div class="edit-group"><label>출항지/방향/거리(km)</label>
                <div class="d-flex gap-1">
                    <input type="text" id="edit-outport" value="${h.firstOutport}" style="flex:1;">
                    <input type="text" id="edit-direction" value="${h.direction}" style="width: 70px;">
                    <input type="text" id="edit-distance" value="${h.distance}" style="width: 70px;">
                </div>
            </div>
            <div class="edit-group"><label>어선법 위반</label>
                <select id="edit-violation" class="form-control-sm">
                    <option value="무" ${h.violation === '무' ? 'selected' : ''}>무 (X)</option>
                    <option value="위반" ${h.violation === '위반' ? 'selected' : ''}>위반 (O)</option>
                    <option value="확인불가" ${h.violation === '확인불가' ? 'selected' : ''}>확인불가</option>
                </select>
            </div>
            <div class="edit-group"><label>근무자/수화자</label>
                <div class="d-flex gap-1">
                    <input type="text" id="edit-worker" value="${h.worker || ''}" placeholder="근무자" style="flex:1;">
                    <input type="text" id="edit-telephonee" value="${h.telephonee || ''}" placeholder="수화자" style="flex:1;">
                </div>
            </div>
            <div class="history-actions">
                <button class="btn-custom btn-edit" onclick="showHistoryDetail(${shipIdx}, ${isEdit ? historyIdx : 0})">취소</button>
                <button class="btn-custom btn-save" onclick="saveHistoryData(${shipIdx}, ${historyIdx})">${isEdit ? '저장' : '추가'}</button>
            </div>
        </div>
    `;

    pathBox.innerHTML = `
        <div class="history-info-group w-100 fade-in">
            <div class="edit-group">
                <label>선박 사진</label>
                <div class="drop-zone" id="drop-ship-img">
                    <span>이미지 드롭 또는 경로 입력</span>
                    <input type="text" id="edit-ship-img" value="${h.shipImage}">
                </div>
            </div>
            <div class="edit-group">
                <label>항로 사진</label>
                <div class="drop-zone" id="drop-path-img">
                    <span>이미지 드롭 또는 경로 입력</span>
                    <input type="text" id="edit-path-img" value="${h.pathImage}">
                </div>
            </div>
        </div>
    `;

    ['drop-ship-img', 'drop-path-img'].forEach(id => {
        const zone = document.getElementById(id);
        const input = zone.querySelector('input');
        zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
        zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
        zone.addEventListener('drop', (e) => {
            e.preventDefault(); zone.classList.remove('drag-over');
            if (e.dataTransfer.files[0]) input.value = `Images/${e.dataTransfer.files[0].name}`;
        });
    });
}

async function saveHistoryData(shipIdx, historyIdx) {
    const ship = shipData[shipIdx];
    const isEdit = historyIdx !== null;
    const newHistory = {
        date: document.getElementById('edit-date').value,
        firstTime: document.getElementById('edit-first-time').value,
        firstPos: document.getElementById('edit-first-pos').value,
        firstAzEl: document.getElementById('edit-first-azel').value,
        lastTime: document.getElementById('edit-last-time').value,
        lastPos: document.getElementById('edit-last-pos').value,
        lastAzEl: document.getElementById('edit-last-azel').value,
        crewCount: document.getElementById('edit-crew').value || "식별불가",
        violation: document.getElementById('edit-violation').value,
        raderStation: document.getElementById('edit-rader').value,
        traceNumber: document.getElementById('edit-tracenum').value,
        firstOutport: document.getElementById('edit-outport').value,
        direction: document.getElementById('edit-direction').value,
        distance: document.getElementById('edit-distance').value,
        worker: document.getElementById('edit-worker').value,
        telephonee: document.getElementById('edit-telephonee').value,
        shipImage: document.getElementById('edit-ship-img').value,
        pathImage: document.getElementById('edit-path-img').value,
        timestamp: new Date().getTime()
    };
    if (isEdit) ship.history[historyIdx] = newHistory;
    else ship.history.push(newHistory);
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
    if (!input) return; // input이 없는 페이지(수신 선박 등) 대비

    if (shipData.length === 0) {
        document.getElementById('ship-results').innerHTML = '<div class="text-center py-5 text-muted">등록된 선박 정보가 없습니다.</div>';
        return;
    }
    const termsSet = new Set();
    shipData.forEach(ship => {
        ['name', 'tonnage', 'type', 'number', 'tags'].forEach(field => {
            const val = ship[field];
            if (Array.isArray(val)) val.forEach(v => { if (v) termsSet.add(String(v).trim()); });
            else if (val) termsSet.add(String(val).trim());
        });
    });
    const allTerms = Array.from(termsSet);

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
    
    // 어선법 위반 표시 로직
    const violationText = h.violation === '위반' ? 'O (위반 식별)' : (h.violation === '무' ? 'X' : '확인불가');
    
    // 추적번호 표시 로직
    const traceNo = (h.raderStation === '-' || !h.raderStation) ? (h.traceNumber || '-') : `${h.raderStation}-${h.traceNumber}`;

    card.querySelectorAll('.history-date-item').forEach((item, idx) => item.classList.toggle('active', idx === historyIdx));
    card.querySelector('.history-detail-view').innerHTML = `
        <div class="history-info-group fade-in">
            <div class="h-item"><label>최초 식별 시간</label><span>${h.firstTime}</span></div>
            <div class="h-item"><label>최초 식별 위치</label><span>${h.firstAzEl || '-'} (${h.firstPos || '-'})</span></div>
            <div class="h-item"><label>최종 식별 시간</label><span>${h.lastTime}</span></div>
            <div class="h-item"><label>최종 식별 위치</label><span>${h.lastAzEl || '-'} (${h.lastPos || '-'})</span></div>
            <div class="h-item"><label>추적번호</label><span>${traceNo}</span></div>
            <div class="history-actions">
                <button class="btn-custom btn-outline-primary" onclick="editHistory(${shipIdx}, ${historyIdx})">수정</button>
                <button class="btn-custom btn-outline-danger" onclick="deleteHistory(${shipIdx}, ${historyIdx})">삭제</button>
            </div>
        </div>
        <div class="history-info-group fade-in">
            <div class="h-item"><label>출항지</label><span>${h.firstOutport || '-'}</span></div>
            <div class="h-item"><label>어선법 위반 유무</label><span style="color: ${h.violation === '위반' ? '#dc3545' : 'inherit'}; font-weight: bold;">${violationText}</span></div>
            <div class="h-item"><label>근무자</label><span>${h.worker || ''}</span></div>
            <div class="h-item"><label>수화자</label><span>${h.telephonee || ''}</span></div>
            <div class="h-item"><label>인원</label><span>${isNaN(h.crewCount) ? h.crewCount : h.crewCount + '명'}</span></div>
        </div>
    `;
    const pathBox = card.querySelector('.history-path-box');
    pathBox.innerHTML = `<div class="path-img-container"><img src="${h.pathImage}" class="path-img fade-in" style="opacity: 0;"></div>`;
    const pathImg = pathBox.querySelector('.path-img');
    setTimeout(() => { pathImg.style.opacity = 1; }, 50);
}

function renderShips() {
    const results = document.getElementById('ship-results');
    const paginationContainer = document.getElementById('pagination-container');
    if (!results) return;

    const filtered = shipData.filter(s => {
        if (selectedTags.length === 0) return true;
        return selectedTags.every(t => 
            (s.name && s.name.includes(t)) || 
            (s.tonnage && s.tonnage.includes(t)) || 
            (s.type && s.type.includes(t)) || 
            (s.number && s.number.includes(t)) || 
            (s.tags && s.tags.includes(t))
        );
    });

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
        return `
            <div class="ship-card" data-idx="${shipIdx}">
                <div class="ship-card-main">
                    <div class="ship-info-primary">
                        <div class="ship-name-row"><div class="expand-btn" onclick="toggleCard(${shipIdx})"><span>&#9013;</span></div><h4>${ship.name}</h4></div>
                        <div class="ship-meta-group">
                            <p class="ship-detail"><strong>톤수</strong> ${ship.tonnage}</p>
                            <p class="ship-detail"><strong>선종</strong> ${ship.type}</p>
                            <p class="ship-detail"><strong>어선번호</strong> ${ship.number}</p>
                            <p class="ship-detail"><strong>연락처</strong> ${ship.tel}</p>
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
                            ${(ship.history && ship.history.length > 0) ? ship.history.map(h => `<img src="${h.shipImage}" class="slider-img">`).join('') : `<img src="Images/no-image.jpg" class="slider-img">`}
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
                    <div class="history-detail-view"></div>
                    <div class="history-path-box"><div class="path-img-container"><img src="" class="path-img fade-in"></div></div>
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
