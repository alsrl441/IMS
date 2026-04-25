const STORE_NAME = "mealSchedule";

// 공통 날짜 포맷 헬퍼
const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

// 콤마를 줄바꿈으로 변환하는 헬퍼
function formatMealText(text) {
    if (!text || text === "정보 없음") return "식단 정보가 없습니다.";
    return text.split(',').map(item => item.trim()).join('\n');
}

// --- 대시보드 로직 ---
async function initDashboardMeal() {
    const mealTypeEl = document.getElementById('meal-type');
    const mealDisplayEl = document.getElementById('meal-display');
    const searchDateInput = document.getElementById('search-date');
    const searchMealSelect = document.getElementById('search-meal');
    const mealSearchUi = document.getElementById('meal-search-ui');

    if (!mealDisplayEl) return; // 대시보드 요소가 없으면 중단

    async function getMealData(dateStr) {
        const allMeals = await window.getDBData(STORE_NAME);
        return allMeals.find(m => m.date === dateStr) || null;
    }

    function updateMealOptions(dateStr) {
        if (!searchMealSelect) return;
        const date = new Date(dateStr);
        const isSunday = date.getDay() === 0;
        const currentVal = searchMealSelect.value;
        searchMealSelect.innerHTML = '';
        if (isSunday) {
            searchMealSelect.add(new Option("브런치", "brunch"));
            searchMealSelect.add(new Option("저녁", "dinner"));
        } else {
            searchMealSelect.add(new Option("아침", "breakfast"));
            searchMealSelect.add(new Option("점심", "lunch"));
            searchMealSelect.add(new Option("저녁", "dinner"));
        }
        if (Array.from(searchMealSelect.options).some(opt => opt.value === currentVal)) {
            searchMealSelect.value = currentVal;
        }
    }

    async function searchMeal() {
        const dateStr = searchDateInput.value;
        updateMealOptions(dateStr);
        const mealKey = searchMealSelect.value;
        const mealData = await getMealData(dateStr);
        const mealNames = { breakfast: "아침", lunch: "점심", dinner: "저녁", brunch: "브런치" };
        if (mealTypeEl) mealTypeEl.innerText = `${dateStr} ${mealNames[mealKey] || ""}`;
        mealDisplayEl.innerText = formatMealText(mealData?.[mealKey]);
    }

    async function setAutoMeal() {
        const now = new Date();
        const timeVal = now.getHours() * 100 + now.getMinutes();
        const todayStr = formatDate(now);
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = formatDate(tomorrowObj);

        let targetDateStr = todayStr;
        let mealKey = "";
        let displayLabel = "";
        const isSunday = now.getDay() === 0;

        if (isSunday) {
            if (timeVal < 1130) { displayLabel = "오늘 브런치"; mealKey = "brunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { 
                const nextIsSunday = tomorrowObj.getDay() === 0;
                displayLabel = "내일 " + (nextIsSunday ? "브런치" : "아침");
                mealKey = nextIsSunday ? "brunch" : "breakfast";
                targetDateStr = tomorrowStr;
            }
        } else {
            if (timeVal < 800) { displayLabel = "오늘 아침"; mealKey = "breakfast"; }
            else if (timeVal < 1230) { displayLabel = "오늘 점심"; mealKey = "lunch"; }
            else if (timeVal < 1830) { displayLabel = "오늘 저녁"; mealKey = "dinner"; }
            else { 
                const nextIsSunday = tomorrowObj.getDay() === 0;
                displayLabel = "내일 " + (nextIsSunday ? "브런치" : "아침");
                mealKey = nextIsSunday ? "brunch" : "breakfast";
                targetDateStr = tomorrowStr;
            }
        }

        if (searchDateInput) {
            searchDateInput.value = targetDateStr;
            updateMealOptions(targetDateStr);
        }
        const mealData = await getMealData(targetDateStr);
        if (mealTypeEl) mealTypeEl.innerText = mealData ? displayLabel : "정보 없음";
        mealDisplayEl.innerText = mealData ? formatMealText(mealData[mealKey]) : "식단 정보가 없습니다.";
        if (searchMealSelect) searchMealSelect.value = mealKey;
    }

    if (mealTypeEl) {
        mealTypeEl.addEventListener('click', (e) => {
            e.stopPropagation();
            mealSearchUi?.classList.toggle('hidden');
        });
    }

    document.addEventListener('click', (e) => {
        if (mealSearchUi && !mealSearchUi.contains(e.target) && e.target !== mealTypeEl) {
            mealSearchUi.classList.add('hidden');
        }
    });

    if (searchDateInput) searchDateInput.addEventListener('change', searchMeal);
    if (searchMealSelect) searchMealSelect.addEventListener('change', searchMeal);

    await setAutoMeal();
}

// --- 전체 관리 페이지 로직 ---
async function initFullMealSchedule() {
    const weekPicker = document.getElementById('week-picker');
    const displayEl = document.getElementById('weekly-meal-display');
    const mealModal = document.getElementById('meal-modal');
    if (!displayEl) return; 

    const btnAddMeal = document.getElementById('btn-add-meal');
    const closeModal = document.querySelector('.close-modal');
    const mealForm = document.getElementById('meal-form');
    const btnDeleteMeal = document.getElementById('btn-delete-meal');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');

    const getSunday = (date) => {
        const d = new Date(date);
        d.setDate(d.getDate() - d.getDay());
        return d;
    };

    if (weekPicker && !weekPicker.value) {
        weekPicker.value = formatDate(new Date());
    }

    const renderWeeklySchedule = async () => {
        const selectedDate = new Date(weekPicker.value);
        const sunday = getSunday(selectedDate);
        const allMenus = await window.getDBData(STORE_NAME);
        
        const days = ['일', '월', '화', '수', '목', '금', '토'];
        let html = `
            <table class="meal-table weekly">
                <thead>
                    <tr>
                        <th style="width: 10%;">구분</th>
        `;

        for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            const dayClass = i === 0 ? 'sunday' : (i === 6 ? 'saturday' : '');
            html += `<th class="${dayClass}">${days[i]} (${d.getMonth() + 1}/${d.getDate()})</th>`;
        }

        html += `
                    </tr>
                </thead>
                <tbody>
        `;

        const mealTypes = [
            { id: 'breakfast', label: '아침' },
            { id: 'lunch', label: '점심' },
            { id: 'dinner', label: '저녁' }
        ];

        mealTypes.forEach((type, rowIndex) => {
            html += `<tr><td class="meal-type-label">${type.label}</td>`;
            for (let i = 0; i < 7; i++) {
                const d = new Date(sunday);
                d.setDate(sunday.getDate() + i);
                const dateStr = formatDate(d);
                const menu = allMenus.find(m => m.date === dateStr);
                const isSunday = i === 0;

                if (isSunday) {
                    if (rowIndex === 0) {
                        // 일요일 아침 행: 아침+점심 병합하여 브런치 표시
                        html += `
                            <td rowspan="2" class="clickable-cell sunday text-center" style="vertical-align: middle;" data-date="${dateStr}">
                                <div class="meal-label" style="font-size: 0.8rem; color: #6c757d; margin-bottom: 5px;">[브런치]</div>
                                <div class="meal-text">${menu?.brunch || '-'}</div>
                            </td>
                        `;
                    } else if (rowIndex === 1) {
                        // 일요일 점심 행: 건너뜀 (병합됨)
                        continue;
                    } else {
                        // 일요일 저녁 행
                        html += `
                            <td class="clickable-cell sunday" data-date="${dateStr}">
                                <div class="meal-text">${menu?.dinner || '-'}</div>
                            </td>
                        `;
                    }
                } else {
                    // 평일
                    const content = menu ? (menu[type.id] || '-') : '-';
                    const cellClass = i === 6 ? 'saturday' : '';
                    html += `
                        <td class="clickable-cell ${cellClass}" data-date="${dateStr}">
                            <div class="meal-text">${content}</div>
                        </td>
                    `;
                }
            }
            html += '</tr>';
        });

        html += '</tbody></table>';
        displayEl.innerHTML = html;

        document.querySelectorAll('.clickable-cell').forEach(cell => {
            cell.addEventListener('click', () => openMealModal(cell.dataset.date));
        });
    };

    const openMealModal = async (dateStr) => {
        const menu = (await window.getDBData(STORE_NAME)).find(m => m.date === dateStr);
        document.getElementById('meal-date').value = dateStr;
        document.getElementById('meal-brunch').value = menu?.brunch || "";
        document.getElementById('meal-breakfast').value = menu?.breakfast || "";
        document.getElementById('meal-lunch').value = menu?.lunch || "";
        document.getElementById('meal-dinner').value = menu?.dinner || "";
        btnDeleteMeal.style.display = menu ? 'inline-block' : 'none';
        mealModal.classList.remove('hidden');
    };

    btnAddMeal?.addEventListener('click', () => openMealModal(weekPicker.value));
    closeModal?.addEventListener('click', () => mealModal.classList.add('hidden'));

    mealForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const data = {
            date: document.getElementById('meal-date').value,
            brunch: document.getElementById('meal-brunch').value,
            breakfast: document.getElementById('meal-breakfast').value,
            lunch: document.getElementById('meal-lunch').value,
            dinner: document.getElementById('meal-dinner').value
        };
        await window.putDBData(STORE_NAME, data);
        mealModal.classList.add('hidden');
        renderWeeklySchedule();
    });

    btnDeleteMeal?.addEventListener('click', async () => {
        if (confirm('정말 삭제하시겠습니까?')) {
            await window.deleteDBData(STORE_NAME, document.getElementById('meal-date').value);
            mealModal.classList.add('hidden');
            renderWeeklySchedule();
        }
    });

    weekPicker?.addEventListener('change', renderWeeklySchedule);
    prevWeekBtn?.addEventListener('click', () => {
        const d = new Date(weekPicker.value);
        d.setDate(d.getDate() - 7);
        weekPicker.value = formatDate(d);
        renderWeeklySchedule();
    });
    nextWeekBtn?.addEventListener('click', () => {
        const d = new Date(weekPicker.value);
        d.setDate(d.getDate() + 7);
        weekPicker.value = formatDate(d);
        renderWeeklySchedule();
    });

    renderWeeklySchedule();
}

async function initAll() {
    await window.ensureStore(STORE_NAME, "date");
    await initDashboardMeal();
    await initFullMealSchedule();
}

document.addEventListener('DOMContentLoaded', initAll);
