const STORE_NAME = "mealSchedule";

const formatDate = (date) => {
    return date.toISOString().split('T')[0];
};

function formatMealText(text) {
    if (!text || text === "정보 없음") return "";
    return String(text).split(',').map(item => item.trim()).join('\n');
}

async function initDashboardMeal() {
    const mealTypeEl = document.getElementById('meal-type');
    const mealDisplayEl = document.getElementById('meal-display');

    if (!mealDisplayEl) return; 

    async function getMealData(dateStr) {
        const allMeals = await window.getDBData(STORE_NAME);
        return allMeals.find(m => m.date === dateStr) || null;
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

        const mealData = await getMealData(targetDateStr);
        if (mealTypeEl) mealTypeEl.innerText = mealData ? displayLabel : "정보 없음";
        mealDisplayEl.innerText = mealData ? (formatMealText(mealData[mealKey]) || "식단 정보가 없습니다.") : "식단 정보가 없습니다.";
    }

    await setAutoMeal();
}

async function initFullMealSchedule() {
    const weekPicker = document.getElementById('week-picker');
    const displayEl = document.getElementById('weekly-meal-display');
    const btnToggleEdit = document.getElementById('btn-toggle-edit');
    const prevWeekBtn = document.getElementById('prev-week');
    const nextWeekBtn = document.getElementById('next-week');

    if (!displayEl) return; 

    let isEditMode = false;

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
        let html = `<table class="meal-table weekly ${isEditMode ? 'edit-mode' : ''}"><thead><tr><th style="width: 10%;">구분</th>`;

        for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            html += `<th class="${i === 0 ? 'sunday' : (i === 6 ? 'saturday' : '')}">${days[i]} (${d.getMonth() + 1}/${d.getDate()})</th>`;
        }
        html += `</tr></thead><tbody>`;

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
                        const content = menu?.brunch || '';
                        html += `
                            <td rowspan="2" class="sunday text-center" style="vertical-align: middle;">
                                ${isEditMode ? 
                                    `<textarea class="edit-input" data-date="${dateStr}" data-type="brunch" rows="4">${content}</textarea>` : 
                                    `<div class="meal-text">${formatMealText(content)}</div>`
                                }
                            </td>
                        `;
                    } else if (rowIndex === 1) continue;
                    else {
                        const content = menu?.dinner || '';
                        html += `
                            <td class="sunday">
                                ${isEditMode ? 
                                    `<textarea class="edit-input" data-date="${dateStr}" data-type="dinner" rows="2">${content}</textarea>` : 
                                    `<div class="meal-text">${formatMealText(content)}</div>`
                                }
                            </td>
                        `;
                    }
                } else {
                    const content = menu ? (menu[type.id] || '') : '';
                    html += `
                        <td class="${i === 6 ? 'saturday' : ''}">
                            ${isEditMode ? 
                                `<textarea class="edit-input" data-date="${dateStr}" data-type="${type.id}" rows="2">${content}</textarea>` : 
                                `<div class="meal-text">${formatMealText(content)}</div>`
                            }
                        </td>
                    `;
                }
            }
            html += '</tr>';
        });

        html += '</tbody></table>';
        displayEl.innerHTML = html;
    };

    const saveAllChanges = async () => {
        const inputs = document.querySelectorAll('.edit-input');
        const dataByDate = {};

        inputs.forEach(input => {
            const date = input.dataset.date;
            const type = input.dataset.type;
            const val = input.value.trim();

            if (!dataByDate[date]) dataByDate[date] = { date };
            dataByDate[date][type] = val;
        });

        for (const date in dataByDate) {
            const data = dataByDate[date];
            const hasData = Object.keys(data).some(key => key !== 'date' && data[key] !== '');
            if (hasData) {
                await window.putDBData(STORE_NAME, data);
            } else {
                await window.deleteDBData(STORE_NAME, date);
            }
        }
    };

    btnToggleEdit?.addEventListener('click', async () => {
        if (isEditMode) {
            await saveAllChanges();
            isEditMode = false;
            btnToggleEdit.innerText = '수정';
            btnToggleEdit.classList.replace('btn-success', 'btn-primary');
        } else {
            isEditMode = true;
            btnToggleEdit.innerText = '저장';
            btnToggleEdit.classList.replace('btn-primary', 'btn-success');
        }
        renderWeeklySchedule();
    });

    weekPicker?.addEventListener('change', () => { if(!isEditMode) renderWeeklySchedule(); });
    prevWeekBtn?.addEventListener('click', () => {
        if(isEditMode) return;
        const d = new Date(weekPicker.value);
        d.setDate(d.getDate() - 7);
        weekPicker.value = formatDate(d);
        renderWeeklySchedule();
    });
    nextWeekBtn?.addEventListener('click', () => {
        if(isEditMode) return;
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
