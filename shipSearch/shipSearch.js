let selectedTags = [];
let currentPage = 1;
const itemsPerPage = 4; // 한 페이지에 표시할 선박 수
let currentFocus = -1; 
let shipData = []; // IndexedDB에서 로드할 데이터

// 각 선박 카드별 현재 표시 중인 이미지 인덱스를 저장할 객체
// { shipIndex: historyIndex }
let shipSliderState = {};

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
            const getReq = store.getAll();
            getReq.onsuccess = () => resolve(getReq.result || []);
            getReq.onerror = () => resolve([]);
        };
        request.onupgradeneeded = (e) => {
            const db = e.target.result;
            if (!db.objectStoreNames.contains("ship")) db.createObjectStore("ship");
        };
        request.onerror = () => resolve([]);
    });
}

async function initShipSearch() {
    shipData = await loadShipsFromDB();
    const input = document.getElementById('tag-input');
    const autocompleteList = document.getElementById('autocomplete-list');

    if (shipData.length === 0) {
        document.getElementById('ship-results').innerHTML = '<div class="text-center py-5 text-muted">등록된 선박 정보가 없습니다. (DBM에서 Import 필요)</div>';
        return;
    }

    // 검색 가능한 모든 용어 수집
    const termsSet = new Set();
    shipData.forEach(ship => {
        const fields = ['name', 'tonnage', 'type', 'number', 'tags'];
        fields.forEach(field => {
            const value = ship[field];
            if (Array.isArray(value)) {
                value.forEach(v => { if (v) termsSet.add(String(v).trim()); });
            } else if (value) {
                termsSet.add(String(value).trim());
            }
        });
    });
    const allSearchableTerms = Array.from(termsSet);

    // 키보드 이벤트
    window.addEventListener('keydown', function(e) {
        if (document.activeElement !== input || input.value === "") {
            const filteredShips = getFilteredAndSortedShips();
            const totalPages = Math.ceil(filteredShips.length / itemsPerPage) || 1;

            if (e.key === "ArrowLeft") {
                if (currentPage > 1) {
                    currentPage--;
                    renderShips();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            } else if (e.key === "ArrowRight") {
                if (currentPage < totalPages) {
                    currentPage++;
                    renderShips();
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }
            }
        }
    });

    input.addEventListener('input', function() {
        let val = this.value;
        autocompleteList.innerHTML = '';
        currentFocus = -1;
        if (!val) {
            autocompleteList.style.display = 'none';
            return;
        }

        let searchTerm = val.toLowerCase();
        let filtered = allSearchableTerms.filter(term => {
            if (!term) return false;
            const termStr = String(term).toLowerCase();
            return termStr.includes(searchTerm) && !selectedTags.includes(term);
        });

        if (filtered.length > 0) {
            autocompleteList.style.display = 'block';
        } else {
            autocompleteList.style.display = 'none';
        }

        filtered.forEach((term, index) => {
            let div = document.createElement('div');
            // 검색어와 일치하는 부분을 찾아 하이라이트 처리
            const regex = new RegExp(`(${searchTerm})`, 'gi');
            const highlightedTerm = term.replace(regex, '<span class="highlight">$1</span>');
            div.innerHTML = highlightedTerm;
            div.onclick = function() {
                addTag(term);
                input.value = '';
                autocompleteList.innerHTML = '';
                autocompleteList.style.display = 'none';
            };
            autocompleteList.appendChild(div);
        });
    });

    // 포커스 시 값이 있으면 다시 표시
    input.addEventListener('focus', function() {
        if (this.value && autocompleteList.children.length > 0) {
            autocompleteList.style.display = 'block';
        }
    });

    // 외부 클릭 시 닫기 (blur)
    // 약간의 지연시간을 주어 목록 클릭이 먼저 발생하도록 함
    input.addEventListener('blur', function() {
        setTimeout(() => {
            autocompleteList.style.display = 'none';
        }, 200);
    });

    input.addEventListener('keydown', function(e) {
        let x = autocompleteList.getElementsByTagName('div');
        if (e.keyCode === 40) { // ↓
            currentFocus++;
            addActive(x);
        } else if (e.keyCode === 38) { // ↑
            currentFocus--;
            addActive(x);
        } else if (e.keyCode === 13 || e.keyCode === 9) { // Enter or Tab
            if (currentFocus > -1) {
                if (x) {
                    e.preventDefault();
                    x[currentFocus].click();
                }
            } else if (this.value) {
                if (x[0]) {
                    e.preventDefault();
                    x[0].click();
                }
            }
        }
    });

    function addActive(x) {
        if (!x) return false;
        for (let i = 0; i < x.length; i++) x[i].classList.remove("autocomplete-active");
        if (currentFocus >= x.length) currentFocus = 0;
        if (currentFocus < 0) currentFocus = (x.length - 1);
        x[currentFocus].classList.add("autocomplete-active");
        x[currentFocus].scrollIntoView({ block: 'nearest' });
    }

    renderShips();
}

function getFilteredAndSortedShips() {
    return shipData.filter(ship => 
        selectedTags.every(tag => 
            ship.name === tag || 
            ship.tonnage === tag || 
            ship.type === tag || 
            ship.number === tag ||
            ship.tags.includes(tag)
        )
    );
}

function addTag(tag) {
    if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
        currentPage = 1;
        renderSelectedTags();
        renderShips();
    }
}

function removeTag(tag) {
    selectedTags = selectedTags.filter(t => t !== tag);
    currentPage = 1;
    renderSelectedTags();
    renderShips();
}

function renderSelectedTags() {
    const container = document.getElementById('selected-tags');
    container.innerHTML = selectedTags.map(tag => `
        <span class="tag-badge">
            ${tag}
            <span class="remove-tag" onclick="removeTag('${tag}')">&times;</span>
        </span>
    `).join('');
}

// 이미지 슬라이더 제어 함수
function changeShipImage(shipIdx, delta) {
    const ship = shipData[shipIdx];
    if (!ship || !ship.history.length) return;

    let currentImgIdx = shipSliderState[shipIdx] || 0;
    currentImgIdx = (currentImgIdx + delta + ship.history.length) % ship.history.length;
    shipSliderState[shipIdx] = currentImgIdx;

    const imgEl = document.querySelector(`.ship-card[data-idx="${shipIdx}"] .slider-img`);
    if (imgEl) {
        imgEl.style.opacity = 0;
        setTimeout(() => {
            imgEl.src = ship.history[currentImgIdx].shipImage;
            imgEl.style.opacity = 1;
        }, 150);
    }
}

// 카드 확장/축소 토글
function toggleCard(shipIdx) {
    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    if (!card) return;

    const isExpanded = card.classList.contains('is-expanded');
    
    // 다른 카드들은 닫기 (선택사항 - 한 번에 하나만 열리게 하려면 사용)
    document.querySelectorAll('.ship-card').forEach(c => c.classList.remove('is-expanded'));

    if (!isExpanded) {
        card.classList.add('is-expanded');
        // 확장 시 첫 번째 히스토리를 자동으로 보여줌
        showHistoryDetail(shipIdx, 0);
    } else {
        card.classList.remove('is-expanded');
    }
}

// 히스토리 상세 내용 표시
function showHistoryDetail(shipIdx, historyIdx) {
    const ship = shipData[shipIdx];
    const h = ship.history[historyIdx];
    const card = document.querySelector(`.ship-card[data-idx="${shipIdx}"]`);
    if (!card || !h) return;

    // 날짜 리스트 활성화 상태 변경
    card.querySelectorAll('.history-date-item').forEach((item, idx) => {
        if (idx === historyIdx) item.classList.add('active');
        else item.classList.remove('active');
    });

    // 상세 정보 텍스트 업데이트
    const detailView = card.querySelector('.history-detail-view');
    detailView.innerHTML = `
        <div class="history-info-group fade-in">
            <div class="h-item">
                <label>최초 식별</label>
                <span>${h.firstTime} (${h.firstPos})</span>
            </div>
            <div class="h-item">
                <label>최종 식별</label>
                <span>${h.lastTime} (${h.lastPos})</span>
            </div>
            <div class="h-item">
                <label>탑승 인원</label>
                <span>${h.crewCount}명</span>
            </div>
        </div>
        <div class="history-info-group fade-in">
            <div class="h-item full-width">
                <label>인수인계</label>
                <span>${h.handover || '데이터 없음'}</span>
            </div>
        </div>
    `;

    // 항로 이미지 업데이트
    const pathImg = card.querySelector('.path-img');
    pathImg.style.opacity = 0;
    setTimeout(() => {
        pathImg.src = h.pathImage; console.log(pathImg.src);
        pathImg.style.opacity = 1;
    }, 150);
}

function renderPagination(totalItems) {
    const container = document.getElementById('pagination-container');
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

    // 페이지네이션 범위 계산 (최대 21개)
    let startPage = currentPage - 10;
    let endPage = currentPage + 10;

    if (startPage < 1) {
        endPage = Math.min(totalPages, endPage + (1 - startPage));
        startPage = 1;
    }

    if (endPage > totalPages) {
        startPage = Math.max(1, startPage - (endPage - totalPages));
        endPage = totalPages;
    }

    container.appendChild(createBtn('<', Math.max(1, currentPage - 1), false, currentPage === 1));
    for (let i = startPage; i <= endPage; i++) {
        container.appendChild(createBtn(i, i, i === currentPage));
    }
    container.appendChild(createBtn('>', Math.min(totalPages, currentPage + 1), false, currentPage === totalPages));
}

function renderShips() {
    const resultsContainer = document.getElementById('ship-results');
    const paginationContainer = document.getElementById('pagination-container');
    
    if (selectedTags.length === 0) {
        resultsContainer.innerHTML = '';
        paginationContainer.innerHTML = '';
        return;
    }

    const filteredShips = getFilteredAndSortedShips();
    const startIndex = (currentPage - 1) * itemsPerPage;
    const pagedShips = filteredShips.slice(startIndex, startIndex + itemsPerPage);

    if (filteredShips.length === 0) {
        resultsContainer.innerHTML = `<div class="text-center py-5"><p class="text-secondary">검색 결과와 일치하는 선박을 찾을 수 없습니다... 😢</p></div>`;
        paginationContainer.innerHTML = '';
        return;
    }

    resultsContainer.innerHTML = pagedShips.map(ship => {
        const shipIdx = shipData.findIndex(s => s.name === ship.name);
        const currentImgIdx = shipSliderState[shipIdx] || 0;
        const mainPhoto = ship.history.length > 0 ? ship.history[currentImgIdx].shipImage : '../Images/no-image.jpg';

        return `
            <div class="ship-card" data-idx="${shipIdx}">
                <div class="ship-card-main">
                    <div class="ship-info-primary">
                        <div class="ship-name-row">
                            <div class="expand-btn" onclick="toggleCard(${shipIdx})"><span>&#9013;</span></div>
                            <h4>${ship.name}</h4>
                        </div>
                        <div class="ship-meta-group">
                            <p class="ship-detail"><strong>톤수</strong> ${ship.tonnage}</p>
                            <p class="ship-detail"><strong>선종</strong> ${ship.type}</p>
                            <p class="ship-detail"><strong>어선번호</strong> ${ship.number}</p>
                            <p class="ship-detail"><strong>연락처</strong> ${ship.tel}</p>
                        </div>
                    </div>

                    <div class="ship-info-tags">
                        <div class="ship-tags">
                            ${ship.tags.map(t => `<span class="mini-tag">${t}</span>`).join('')}
                        </div>
                    </div>

                    <div class="ship-photo-slider">
                        <div class="slider-nav slider-prev" onclick="changeShipImage(${shipIdx}, -1)">&lt;</div>
                        <img src="${mainPhoto}" class="slider-img" alt="${ship.name}">
                        <div class="slider-nav slider-next" onclick="changeShipImage(${shipIdx}, 1)">&gt;</div>
                    </div>
                </div>

                <div class="ship-card-expanded">
                    <div class="history-date-list">
                        ${ship.history.map((h, hIdx) => `
                            <div class="history-date-item" onclick="showHistoryDetail(${shipIdx}, ${hIdx})">
                                ${h.date} (${h.firstTime})
                            </div>
                        `).join('')}
                    </div>
                    <div class="history-detail-view">
                        <!-- 히스토리 상세 정보가 여기에 렌더링됨 -->
                    </div>
                    <div class="history-path-box">
                        <div class="path-img-container">
                            <img src="" class="path-img fade-in" alt="항로 도식">
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    renderPagination(filteredShips.length);
}

document.addEventListener('DOMContentLoaded', initShipSearch);
