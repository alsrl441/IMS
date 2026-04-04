let selectedTags = [];
let currentPage = 1;
const itemsPerPage = 1; 
let currentFocus = -1; 
let shipData = []; 
let shipSliderState = {};
let editingTagsShipIdx = null;

async function loadShipsFromDB() {
    return new Promise((resolve) => {
        const request = indexedDB.open("myDB");
        request.onsuccess = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("ship")) {
                console.warn("'ship' store not found");
                resolve([]);
                return;
            }
            const tx = db.transaction("ship", "readonly");
            const store = tx.objectStore("ship");
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
            if (!db.objectStoreNames.contains("ship")) db.createObjectStore("ship");
        };
        request.onerror = () => resolve([]);
    });
}

async function updateShipInDB(key, updatedData) {
    const dataToSave = { ...updatedData };
    delete dataToSave._dbKey;
    return new Promise((resolve) => {
        const request = indexedDB.open("myDB");
        request.onsuccess = (e) => {
            const db = e.target.result;
            const tx = db.transaction("ship", "readwrite");
            const store = tx.objectStore("ship");
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
        firstTime: "08:00", firstPos: "",
        lastTime: "18:00", lastPos: "",
        crewCount: 1, handover: "특이사항 없음",
        shipImage: "Images/no-image.jpg",
        pathImage: "Images/no-image.jpg"
    };

    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    const detailView = card.querySelector('.history-detail-view');
    const pathBox = card.querySelector('.history-path-box');

    detailView.innerHTML = `
        <div class="history-edit-form fade-in">
            <div class="edit-group">
                <label>식별 날짜</label>
                <input type="date" id="edit-date" value="${h.date}">
            </div>
            <div class="edit-group">
                <label>탑승 인원</label>
                <input type="number" id="edit-crew" value="${h.crewCount}">
            </div>
            <div class="edit-group">
                <label>최초 식별 (시간/위치)</label>
                <div class="d-flex gap-2">
                    <input type="time" id="edit-first-time" value="${h.firstTime}" style="width:100px;">
                    <input type="text" id="edit-first-pos" value="${h.firstPos}" placeholder="위치" style="flex:1;">
                </div>
            </div>
            <div class="edit-group">
                <label>최종 식별 (시간/위치)</label>
                <div class="d-flex gap-2">
                    <input type="time" id="edit-last-time" value="${h.lastTime}" style="width:100px;">
                    <input type="text" id="edit-last-pos" value="${h.lastPos}" placeholder="위치" style="flex:1;">
                </div>
            </div>
            <div class="edit-group full-width">
                <label>인수인계 사항</label>
                <textarea id="edit-handover">${h.handover}</textarea>
            </div>
            <div class="form-actions">
                <button class="btn btn-sm btn-outline-secondary" onclick="showHistoryDetail(${shipIdx}, ${isEdit ? historyIdx : 0})">취소</button>
                <button class="btn btn-sm btn-primary" onclick="saveHistoryData(${shipIdx}, ${historyIdx})">${isEdit ? '저장' : '추가'}</button>
            </div>
        </div>
    `;

    pathBox.innerHTML = `
        <div class="history-info-group w-100 fade-in">
            <div class="edit-group mb-3">
                <label>선박 사진 (드래그/경로)</label>
                <div class="drop-zone" id="drop-ship-img">
                    <span>이미지를 드롭하거나 경로 입력</span>
                    <input type="text" id="edit-ship-img" value="${h.shipImage}">
                </div>
            </div>
            <div class="edit-group">
                <label>항로 도식 (드래그/경로)</label>
                <div class="drop-zone" id="drop-path-img">
                    <span>이미지를 드롭하거나 경로 입력</span>
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
        crewCount: parseInt(document.getElementById('edit-crew').value) || 0,
        firstTime: document.getElementById('edit-first-time').value,
        firstPos: document.getElementById('edit-first-pos').value,
        lastTime: document.getElementById('edit-last-time').value,
        lastPos: document.getElementById('edit-last-pos').value,
        handover: document.getElementById('edit-handover').value,
        shipImage: document.getElementById('edit-ship-img').value,
        pathImage: document.getElementById('edit-path-img').value
    };
    if (isEdit) ship.history[historyIdx] = newHistory;
    else ship.history.push(newHistory);
    ship.history.sort((a, b) => b.date.localeCompare(a.date));
    await updateShipInDB(ship._dbKey, ship);
    renderShips();
    toggleCard(shipIdx);
    showHistoryDetail(shipIdx, 0);
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
        renderShips();
        toggleCard(shipIdx);
    }
}

async function initShipSearch() {
    shipData = await loadShipsFromDB();
    const input = document.getElementById('tag-input');
    const autocompleteList = document.getElementById('autocomplete-list');
    if (shipData.length === 0) {
        document.getElementById('ship-results').innerHTML = '<div class="text-center py-5 text-muted">등록된 선박 정보가 없습니다. (선박 추가 필요)</div>';
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
    document.getElementById('selected-tags').innerHTML = selectedTags.map(tag => `
        <span class="tag-badge">${tag}<span class="remove-tag" onclick="removeTag('${tag}')">&times;</span></span>
    `).join('');
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
    card.querySelectorAll('.history-date-item').forEach((item, idx) => item.classList.toggle('active', idx === historyIdx));
    card.querySelector('.history-detail-view').innerHTML = `
        <div class="history-info-group fade-in">
            <div class="h-item"><label>최초 식별</label><span>${h.firstTime} (${h.firstPos})</span></div>
            <div class="h-item"><label>최종 식별</label><span>${h.lastTime} (${h.lastPos})</span></div>
            <div class="h-item"><label>탑승 인원</label><span>${h.crewCount}명</span></div>
        </div>
        <div class="history-info-group fade-in">
            <div class="h-item full-width"><label>인수인계</label><span>${h.handover || '데이터 없음'}</span></div>
            <div class="history-actions">
                <button class="btn btn-sm btn-outline-primary" onclick="editHistory(${shipIdx}, ${historyIdx})">수정</button>
                <button class="btn btn-sm btn-outline-danger btn-delete-history" onclick="deleteHistory(${shipIdx}, ${historyIdx})">삭제</button>
            </div>
        </div>
    `;
    const pathImg = card.querySelector('.path-img');
    pathImg.style.opacity = 0;
    setTimeout(() => { pathImg.src = h.pathImage; pathImg.style.opacity = 1; }, 150);
}

function renderShips() {
    const results = document.getElementById('ship-results');
    const filtered = shipData.filter(s => selectedTags.every(t => s.name === t || s.tonnage === t || s.type === t || s.number === t || s.tags.includes(t)));
    if (selectedTags.length === 0) { results.innerHTML = ''; return; }
    const paged = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
    if (filtered.length === 0) { results.innerHTML = '<div class="text-center py-5"><p class="text-secondary">검색 결과가 없습니다.</p></div>'; return; }
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
                            ${ship.tags.map((t, tIdx) => `<span class="tag-badge ${editingTagsShipIdx === shipIdx ? 'edit-mode' : ''}">${t}<span class="tag-delete-btn" onclick="deleteTagInline(${shipIdx}, ${tIdx})">&times;</span></span>`).join('')}
                            ${editingTagsShipIdx === shipIdx ? 
                                `<input type="text" id="inline-tag-input-${shipIdx}" class="inline-tag-input" placeholder="엔터로 추가..." onkeydown="addTagInline(event, ${shipIdx})" autofocus>
                                 <button class="btn btn-sm btn-primary py-0" onclick="toggleTagEdit(${shipIdx})" style="font-size: 0.7rem;">완료</button>` : 
                                `<button class="btn btn-sm btn-outline-secondary py-0" onclick="toggleTagEdit(${shipIdx})" style="font-size: 0.7rem;">수정</button>`}
                        </div>
                    </div>
                    <div class="ship-photo-slider">
                        <div class="slider-nav slider-prev" onclick="changeShipImage(${shipIdx}, -1)">&lt;</div>
                        <div class="slider-track" style="transform: translateX(-${currentImgIdx * 100}%);">
                            ${ship.history.length > 0 ? ship.history.map(h => `<img src="${h.shipImage}" class="slider-img">`).join('') : `<img src="Images/no-image.jpg" class="slider-img">`}
                        </div>
                        <div class="slider-nav slider-next" onclick="changeShipImage(${shipIdx}, 1)">&gt;</div>
                        <div class="slider-dots">${ship.history.map((_, i) => `<div class="dot ${i === currentIdx ? 'active' : ''}"></div>`).join('')}</div>
                    </div>
                </div>
                <div class="ship-card-expanded">
                    <div class="history-date-list">
                        ${ship.history.map((h, i) => `<div class="history-date-item" onclick="showHistoryDetail(${shipIdx}, ${i})">${h.date} (${h.firstTime})</div>`).join('')}
                        <div class="history-date-item text-primary" onclick="addHistory(${shipIdx})" style="font-weight: 700;">+ 식별날짜 추가</div>
                    </div>
                    <div class="history-detail-view"></div>
                    <div class="history-path-box"><div class="path-img-container"><img src="" class="path-img fade-in"></div></div>
                </div>
            </div>`;
    }).join('');
}

document.addEventListener('DOMContentLoaded', initShipSearch);
