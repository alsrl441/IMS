const WORK_WEIGHTS = {
    weekday: {
        cctv: { "06-14": [8, 0.5], "14-22": [8, 0.5], "22-06": [8, 0] },
        tod: { "고하도": [9, 0], "외기 평시": [7, 0], "외기 핵취": [9, 0] }
    },
    saturday: {
        cctv: { "06-14": [8, 2.5], "14-22": [8, 3.5], "22-06": [8, 3.5] },
        tod: { "고하도": [9, 5.5], "외기 평시": [7, 3.5], "외기 핵취": [9, 3.5] }
    },
    holiday: {
        cctv: { "06-14": [8, 6], "14-22": [8, 7], "22-06": [8, 7] },
        tod: { "고하도": [9, 9], "외기 평시": [7, 7], "외기 핵취": [9, 7] }
    }
};

async function updateWorkSchedule() {
    const STORE_NAME = "workSchedule";

    // 스토어 확인 및 생성
    await window.ensureStore(STORE_NAME, "date");

    function getDaySchedule(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME); 
            request.onsuccess = (e) => {
                const db = e.target.result;
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);
                
                const countReq = store.count();
                countReq.onsuccess = () => {
                    if (countReq.result === 0) {
                        const initialWorkTemplate = {
                            "date": "0000-00-00",
                            "isHoliday": false,
                            "cctv": [
                                { "shift": "06-14", "p1": "", "p2": "" },
                                { "shift": "14-22", "p1": "", "p2": "" },
                                { "shift": "22-06", "p1": "", "p2": "" }
                            ],
                            "tod": [
                                { "location": "고하도", "p1": "", "p2": "" },
                                { "location": "외기 평시", "p1": "", "p2": "" },
                                { "location": "외기 핵취", "p1": "", "p2": "" }
                            ]
                        };
                        store.put(initialWorkTemplate);
                        console.log("Initial workSchedule template inserted.");
                    }
                    
                    const getReq = store.getAll();
                    getReq.onsuccess = () => {
                        const allData = getReq.result || [];
                        const res = allData.find(item => item.date === dateStr);
                        if (res) {
                            res.cctv = res.cctv || [{}, {}, {}];
                            res.tod = res.tod || [{}, {}, {}];
                        }
                        resolve(res || null);
                    };
                    getReq.onerror = () => resolve(null);
                };
            };
            request.onerror = () => resolve(null);
        });
    }

    function getAllSchedules() {
        return new Promise((resolve) => {
            const request = indexedDB.open(DB_NAME);
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains(STORE_NAME)) {
                    resolve([]);
                    return;
                }
                const tx = db.transaction(STORE_NAME, "readonly");
                const store = tx.objectStore(STORE_NAME);
                const getReq = store.getAll();
                getReq.onsuccess = () => resolve(getReq.result || []);
                getReq.onerror = () => resolve([]);
            };
            request.onerror = () => resolve([]);
        });
    }

    const getFormattedDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = getFormattedDate(now);
    
    const workDisplay = document.getElementById('work-display');
    if (workDisplay) {
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);
        
        const renderTable = async (dateStr, label) => {
            const data = await getDaySchedule(dateStr);
            const displayDate = dateStr.substring(5);
            
            if (!data) return `<div class="no-data">${displayDate} (${label}) 데이터 없음</div>`;
            
            const formatName = (name) => (name === "-" || !name ? "" : name);

            return `
                <table class="work-table table table-bordered mb-4">
                    <thead>
                        <tr class="table-light-bg">
                            <th colspan="4" class="table-date-header text-dark">
                                ${displayDate} (${label})
                            </th>
                        </tr>
                        <tr class="table-white-bg">
                            <th colspan="2" style="width:40%;">구분</th>
                            <th style="width:30%;">사수</th>
                            <th style="width:30%;">부사수</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="3" class="group-header table-fdfdfd-bg v-middle">항포구</td>
                            <td class="sub-group">${data.cctv[0]?.shift || "06-14"}</td>
                            <td>${formatName(data.cctv[0]?.p1)}</td>
                            <td>${formatName(data.cctv[0]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group">${data.cctv[1]?.shift || "14-22"}</td>
                            <td>${formatName(data.cctv[1]?.p1)}</td>
                            <td>${formatName(data.cctv[1]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group">${data.cctv[2]?.shift || "22-06"}</td>
                            <td>${formatName(data.cctv[2]?.p1)}</td>
                            <td>${formatName(data.cctv[2]?.p2)}</td>
                        </tr>
                        <tr>
                            <td rowspan="3" class="group-header table-fdfdfd-bg v-middle">TOD</td>
                            <td class="sub-group">${data.tod[0]?.location || "고하도"}</td>
                            <td>${formatName(data.tod[0]?.p1)}</td>
                            <td>${formatName(data.tod[0]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group">${data.tod[1]?.location || "외기 평시"}</td>
                            <td>${formatName(data.tod[1]?.p1)}</td>
                            <td>${formatName(data.tod[1]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group">${data.tod[2]?.location || "외기 핵취"}</td>
                            <td>${formatName(data.tod[2]?.p1)}</td>
                            <td>${formatName(data.tod[2]?.p2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        };
        
        const todayContent = await renderTable(todayStr, "금일");
        const tomorrowContent = await renderTable(tomorrowStr, "익일");
        workDisplay.innerHTML = todayContent + tomorrowContent;
    }

    const monthlyDisplay = document.getElementById('monthly-work-display');
    const statsDisplay = document.getElementById('stats-display');
    const monthPicker = document.getElementById('month-picker');
    const btnToggleEditWork = document.getElementById('btn-toggle-edit-work');

    if (monthlyDisplay && statsDisplay && monthPicker) {
        let isEditMode = false;

        if (!monthPicker.value) {
            monthPicker.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        }

        const renderMonthlyView = async () => {
            const [selectedYear, selectedMonth] = monthPicker.value.split('-').map(Number);
            const allSchedules = await getAllSchedules();
            
            const daysInMonth = new Date(selectedYear, selectedMonth, 0).getDate();
            const currentMonthData = [];

            for (let i = 1; i <= daysInMonth; i++) {
                const dateStr = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
                const dbData = allSchedules.find(day => day.date === dateStr);
                
                if (dbData) {
                    currentMonthData.push(dbData);
                } else {
                    currentMonthData.push({
                        date: dateStr,
                        cctv: [
                            { shift: "06-14", p1: "", p2: "" },
                            { shift: "14-22", p1: "", p2: "" },
                            { shift: "22-06", p1: "", p2: "" }
                        ],
                        tod: [
                            { location: "고하도", p1: "", p2: "" },
                            { location: "외기 평시", p1: "", p2: "" },
                            { location: "외기 핵취", p1: "", p2: "" }
                        ],
                        isHoliday: false
                    });
                }
            }

            const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

            let headerHtml = `<tr><th colspan="2" class="table-light-bg">구분</th>`;

            currentMonthData.forEach(dayData => {
                const d = new Date(dayData.date);
                const isSun = d.getDay() === 0;
                const isSat = d.getDay() === 6;
                const isHoliday = dayData.isHoliday || isSun || isSat;
                const isRedDay = (isSun || dayData.isHoliday);
                const dayClass = isRedDay ? "text-danger" : (isSat ? "text-primary" : "");
                
                headerHtml += `<th class="${isHoliday ? 'is-holiday' : ''} ${dayClass} table-light-bg" style="text-align:center;">
                    ${d.getMonth()+1}/${d.getDate()}<br><small>(${daysOfWeek[d.getDay()]})</small>
                </th>`;
            });

            const renderCctvRow = (idx, label) => {
                let row = `<tr>`;
                if (idx === 0) row += `<td rowspan="3" class="group-header table-fdfdfd-bg v-middle">항포구</td>`;
                row += `<td class="sub-group table-fdfdfd-bg">${label}</td>`;

                currentMonthData.forEach(day => {
                    const s = day.cctv[idx];
                    const p1 = (s?.p1 === "-" || !s?.p1) ? "" : s.p1;
                    const p2 = (s?.p2 === "-" || !s?.p2) ? "" : s.p2;
                    if (isEditMode) {
                        row += `<td class="names-cell edit-mode">
                            <input type="text" class="edit-work-input" data-date="${day.date}" data-group="cctv" data-idx="${idx}" data-p="p1" value="${p1}">
                            <input type="text" class="edit-work-input" data-date="${day.date}" data-group="cctv" data-idx="${idx}" data-p="p2" value="${p2}">
                        </td>`;
                    } else {
                        row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
                    }
                });
                return row + `</tr>`;
            };

            const renderTodRow = (idx, label) => {
                let row = `<tr>`;
                if (idx === 0) row += `<td rowspan="3" class="group-header table-fdfdfd-bg v-middle">TOD</td>`;
                row += `<td class="sub-group table-fdfdfd-bg">${label}</td>`;
                
                currentMonthData.forEach(day => {
                    const s = day.tod[idx];
                    const p1 = (s?.p1 === "-" || !s?.p1) ? "" : s.p1;
                    const p2 = (s?.p2 === "-" || !s?.p2) ? "" : s.p2;
                    if (isEditMode) {
                        row += `<td class="names-cell edit-mode">
                            <input type="text" class="edit-work-input" data-date="${day.date}" data-group="tod" data-idx="${idx}" data-p="p1" value="${p1}">
                            <input type="text" class="edit-work-input" data-date="${day.date}" data-group="tod" data-idx="${idx}" data-p="p2" value="${p2}">
                        </td>`;
                    } else {
                        row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
                    }
                });
                return row + `</tr>`;
            };

            let bodyHtml = "";
            bodyHtml += renderCctvRow(0, "06-14");
            bodyHtml += renderCctvRow(1, "14-22");
            bodyHtml += renderCctvRow(2, "22-06");
            bodyHtml += renderTodRow(0, "고하도");
            bodyHtml += renderTodRow(1, "외기 평시");
            bodyHtml += renderTodRow(2, "외기 핵취");

            monthlyDisplay.innerHTML = `
                <div class="monthly-table-wrapper ${isEditMode ? 'edit-mode' : ''}">
                    <table class="work-table table-bordered monthly-table">
                        <thead>${headerHtml}</tr></thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>`;
        };

        const saveAllWorkChanges = async () => {
            const inputs = document.querySelectorAll('.edit-work-input');
            const dataByDate = {};

            inputs.forEach(input => {
                const date = input.dataset.date;
                const group = input.dataset.group;
                const idx = parseInt(input.dataset.idx);
                const p = input.dataset.p;
                const val = input.value.trim();

                if (!dataByDate[date]) {
                    dataByDate[date] = {
                        date,
                        isHoliday: false, // 휴일 정보는 기존 데이터 유지가 필요할 수 있음
                        cctv: [
                            { shift: "06-14", p1: "", p2: "" },
                            { shift: "14-22", p1: "", p2: "" },
                            { shift: "22-06", p1: "", p2: "" }
                        ],
                        tod: [
                            { location: "고하도", p1: "", p2: "" },
                            { location: "외기 평시", p1: "", p2: "" },
                            { location: "외기 핵취", p1: "", p2: "" }
                        ]
                    };
                }
                dataByDate[date][group][idx][p] = val;
            });

            // 기존 휴일 정보 등을 덮어쓰지 않기 위해 기존 데이터를 먼저 가져와 병합할 수도 있으나,
            // 여기서는 단순화를 위해 입력된 데이터 위주로 저장함.
            // 실제 운영시에는 getAllSchedules() 결과와 병합하는 것이 안전함.
            const allSchedules = await getAllSchedules();
            for (const date in dataByDate) {
                const existing = allSchedules.find(d => d.date === date);
                if (existing) {
                    dataByDate[date].isHoliday = existing.isHoliday;
                }
                await window.putDBData(STORE_NAME, dataByDate[date]);
            }
        };

        // 방향키 네비게이션 추가
        monthlyDisplay.addEventListener('keydown', (e) => {
            if (!e.target.classList.contains('edit-work-input')) return;
            const input = e.target;
            const td = input.parentElement;
            const tr = td.parentElement;
            const inputsInTd = Array.from(td.querySelectorAll('.edit-work-input'));
            const inputIdx = inputsInTd.indexOf(input); // 0 (사수) 또는 1 (부사수)
            
            const trs = Array.from(monthlyDisplay.querySelectorAll('tbody tr'));
            const trIdx = trs.indexOf(tr);
            const tdsInTr = Array.from(tr.querySelectorAll('td.names-cell'));
            const tdIdx = tdsInTr.indexOf(td);

            let targetInput = null;

            switch (e.key) {
                case 'ArrowRight':
                    if (tdIdx < tdsInTr.length - 1) {
                        targetInput = tdsInTr[tdIdx + 1].querySelectorAll('.edit-work-input')[inputIdx];
                    }
                    break;
                case 'ArrowLeft':
                    if (tdIdx > 0) {
                        targetInput = tdsInTr[tdIdx - 1].querySelectorAll('.edit-work-input')[inputIdx];
                    }
                    break;
                case 'ArrowDown':
                    if (inputIdx === 0) {
                        targetInput = inputsInTd[1];
                    } else if (trIdx < trs.length - 1) {
                        const nextTrTds = Array.from(trs[trIdx + 1].querySelectorAll('td.names-cell'));
                        targetInput = nextTrTds[tdIdx].querySelectorAll('.edit-work-input')[0];
                    }
                    break;
                case 'ArrowUp':
                    if (inputIdx === 1) {
                        targetInput = inputsInTd[0];
                    } else if (trIdx > 0) {
                        const prevTrTds = Array.from(trs[trIdx - 1].querySelectorAll('td.names-cell'));
                        targetInput = prevTrTds[tdIdx].querySelectorAll('.edit-work-input')[1];
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    if (inputIdx === 0) {
                        targetInput = inputsInTd[1];
                    } else if (trIdx < trs.length - 1) {
                        const nextTrTds = Array.from(trs[trIdx + 1].querySelectorAll('td.names-cell'));
                        targetInput = nextTrTds[tdIdx].querySelectorAll('.edit-work-input')[0];
                    }
                    break;
            }

            if (targetInput) {
                e.preventDefault();
                targetInput.focus();
                targetInput.select();
            }
        });

        btnToggleEditWork?.addEventListener('click', async () => {
            if (isEditMode) {
                await saveAllWorkChanges();
                isEditMode = false;
                btnToggleEditWork.innerText = '수정';
                btnToggleEditWork.classList.replace('btn-success', 'btn-primary');
            } else {
                isEditMode = true;
                btnToggleEditWork.innerText = '저장';
                btnToggleEditWork.classList.replace('btn-primary', 'btn-success');
            }
            renderMonthlyView();
        });

        renderMonthlyView();
        monthPicker.addEventListener('change', () => {
            if (!isEditMode) renderMonthlyView();
        });
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateWorkSchedule();
} else {
    document.addEventListener('DOMContentLoaded', updateWorkSchedule);
}
