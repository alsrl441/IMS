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

    async function getDaySchedule(dateStr) {
        try {
            const allData = await window.getDBData(STORE_NAME);
            const res = allData.find(item => item.date === dateStr);
            if (res) {
                res.cctv = res.cctv || [{}, {}, {}];
                res.tod = res.tod || [{}, {}, {}];
            }
            return res || null;
        } catch (e) {
            console.error("Error getting day schedule:", e);
            return null;
        }
    }

    async function getAllSchedules() {
        try {
            return await window.getDBData(STORE_NAME);
        } catch (e) {
            console.error("Error getting all schedules:", e);
            return [];
        }
    }

    const getFormattedDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = getFormattedDate(now);
    
    // 대시보드 오늘의 근무 표시
    const workDisplay = document.getElementById('work-display');
    if (workDisplay) {
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);
        const renderTable = async (dateStr, label) => {
            const data = await getDaySchedule(dateStr);
            const displayDate = dateStr.substring(5);
            const d = new Date(dateStr);
            const isSun = d.getDay() === 0;
            const isSat = d.getDay() === 6;
            const isHoliday = data && data.isHoliday;

            let textColor = "#212529";
            if (isSun || isHoliday) textColor = "#dc3545";
            else if (isSat) textColor = "#0d6efd";

            if (!data) return `<div class="no-data" style="padding: 20px; text-align: center; color: #666;">${displayDate} (${label}) 데이터 없음</div>`;

            const formatName = (name) => (name === "-" || !name ? "" : name);

            return `
                <table class="work-table table table-bordered mb-4">
                    <thead>
                        <tr class="table-light-bg">
                            <th colspan="4" class="table-date-header" style="background-color: #f8f9fa; padding: 8px; color: ${textColor};">
                                ${displayDate} (${label})
                            </th>
                        </tr>
                        <tr class="table-white-bg">
        ...                            <th colspan="2" style="width:40%;">구분</th>
                            <th style="width:30%;">사수</th>
                            <th style="width:30%;">부사수</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="3" class="group-header table-fdfdfd-bg v-middle">항<br>포<br>구</td>
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

    // 근무표 페이지 월간 뷰 표시
        const btnToggleEditWork = document.getElementById('btn-toggle-edit-work');
        const prevMonthBtn = document.getElementById('prev-month');
        const nextMonthBtn = document.getElementById('next-month');

        if (monthlyDisplay && monthPicker) {
            let isEditMode = false;
            let holidayOverrides = {}; // 수정 모드 중 변경된 공휴일 상태 저장

            if (!monthPicker.value) {
                const now = new Date();
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
                    
                    let dayObj;
                    if (dbData) {
                        dayObj = JSON.parse(JSON.stringify(dbData));
                    } else {
                        dayObj = {
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
                        };
                    }

                    // 수정 모드 중 변경된 사항 반영
                    if (holidayOverrides[dateStr] !== undefined) {
                        dayObj.isHoliday = holidayOverrides[dateStr];
                    }
                    currentMonthData.push(dayObj);
                }

                const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

                let headerHtml = `<tr><th colspan="2" class="table-light-bg" style="background-color: #f8f9fa;">구분</th>`;

                currentMonthData.forEach(dayData => {
                    const d = new Date(dayData.date);
                    const isSun = d.getDay() === 0;
                    const isSat = d.getDay() === 6;
                    const isRedDay = isSun || dayData.isHoliday;
                    
                    let textColor = "#212529";
                    if (isRedDay) textColor = "#dc3545";
                    else if (isSat) textColor = "#0d6efd";
                    
                    const editStyle = isEditMode ? "cursor: pointer; text-decoration: underline;" : "";
                    headerHtml += `<th class="table-light-bg date-header ${isEditMode ? 'editable' : ''}" 
                        data-date="${dayData.date}" 
                        data-isholiday="${dayData.isHoliday}"
                        style="text-align:center; background-color: #f8f9fa; color: ${textColor}; ${editStyle}">
                        ${d.getMonth()+1}/${d.getDate()}<br><small>(${daysOfWeek[d.getDay()]})</small>
                    </th>`;
                });

                const renderCctvRow = (idx, label) => {
                    let row = `<tr>`;
                    if (idx === 0) row += `<td rowspan="3" class="group-header table-fdfdfd-bg v-middle" style="background-color: #fdfdfd;">항<br>포<br>구</td>`;
                    row += `<td class="sub-group table-fdfdfd-bg" style="background-color: #fdfdfd;">${label}</td>`;

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
                    if (idx === 0) row += `<td rowspan="3" class="group-header table-fdfdfd-bg v-middle" style="background-color: #fdfdfd;">T<br>O<br>D</td>`;
                    row += `<td class="sub-group table-fdfdfd-bg" style="background-color: #fdfdfd;">${label}</td>`;
                    
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
                            <thead>${headerHtml}</thead>
                            <tbody>${bodyHtml}</tbody>
                        </table>
                    </div>`;
            };

            const saveAllWorkChanges = async () => {
                const inputs = document.querySelectorAll('.edit-work-input');
                const dataByDate = {};
                const allSchedules = await getAllSchedules();

                inputs.forEach(input => {
                    const date = input.dataset.date;
                    const group = input.dataset.group;
                    const idx = parseInt(input.dataset.idx);
                    const p = input.dataset.p;
                    const val = input.value.trim();

                    if (!dataByDate[date]) {
                        const existing = allSchedules.find(d => d.date === date);
                        dataByDate[date] = {
                            date,
                            isHoliday: holidayOverrides[date] !== undefined ? holidayOverrides[date] : (existing ? existing.isHoliday : false),
                            cctv: existing ? JSON.parse(JSON.stringify(existing.cctv)) : [
                                { shift: "06-14", p1: "", p2: "" },
                                { shift: "14-22", p1: "", p2: "" },
                                { shift: "22-06", p1: "", p2: "" }
                            ],
                            tod: existing ? JSON.parse(JSON.stringify(existing.tod)) : [
                                { location: "고하도", p1: "", p2: "" },
                                { location: "외기 평시", p1: "", p2: "" },
                                { location: "외기 핵취", p1: "", p2: "" }
                            ]
                        };
                    }
                    dataByDate[date][group][idx][p] = val;
                });

                // 입력 필드에는 없지만 공휴일만 변경된 날짜 처리
                for (const date in holidayOverrides) {
                    if (!dataByDate[date]) {
                        const existing = allSchedules.find(d => d.date === date);
                        if (existing) {
                            dataByDate[date] = JSON.parse(JSON.stringify(existing));
                            dataByDate[date].isHoliday = holidayOverrides[date];
                        } else {
                            dataByDate[date] = {
                                date,
                                isHoliday: holidayOverrides[date],
                                cctv: [{shift:"06-14",p1:"",p2:""},{shift:"14-22",p1:"",p2:""},{shift:"22-06",p1:"",p2:""}],
                                tod: [{location:"고하도",p1:"",p2:""},{location:"외기 평시",p1:"",p2:""},{location:"외기 핵취",p1:"",p2:""}]
                            };
                        }
                    }
                }

                const db = await window.getDB();
                const tx = db.transaction(STORE_NAME, "readwrite");
                const store = tx.objectStore(STORE_NAME);

                for (const date in dataByDate) {
                    store.put(dataByDate[date]);
                }

                return new Promise((resolve, reject) => {
                    tx.oncomplete = () => {
                        db.close();
                        holidayOverrides = {}; // 초기화
                        resolve();
                    };
                    tx.onerror = () => {
                        db.close();
                        reject(tx.error);
                    };
                });
            };

            // 날짜 클릭 메뉴 처리
            let activeMenu = null;
            monthlyDisplay.addEventListener('click', (e) => {
                const th = e.target.closest('.date-header.editable');
                if (activeMenu) {
                    activeMenu.remove();
                    activeMenu = null;
                }
                if (!th) return;

                const date = th.dataset.date;
                const currentIsHoliday = th.dataset.isholiday === 'true';

                const menu = document.createElement('div');
                menu.style.cssText = `
                    position: fixed;
                    top: ${e.clientY}px;
                    left: ${e.clientX}px;
                    background: white;
                    border: 1px solid #ccc;
                    box-shadow: 2px 2px 8px rgba(0,0,0,0.15);
                    z-index: 1000;
                    border-radius: 4px;
                    padding: 4px 0;
                `;
                
                const item = document.createElement('div');
                item.innerText = currentIsHoliday ? "평일로 변경" : "공휴일로 변경";
                item.style.cssText = "padding: 8px 16px; cursor: pointer; font-size: 14px;";
                item.onmouseover = () => item.style.backgroundColor = "#f0f0f0";
                item.onmouseout = () => item.style.backgroundColor = "transparent";
                item.onclick = () => {
                    holidayOverrides[date] = !currentIsHoliday;
                    renderMonthlyView();
                    menu.remove();
                    activeMenu = null;
                };
                
                menu.appendChild(item);
                document.body.appendChild(menu);
                activeMenu = menu;

                // 메뉴 외부 클릭 시 닫기
                setTimeout(() => {
                    const closeMenu = (ev) => {
                        if (!menu.contains(ev.target)) {
                            menu.remove();
                            activeMenu = null;
                            document.removeEventListener('click', closeMenu);
                        }
                    };
                    document.addEventListener('click', closeMenu);
                }, 0);
            });

            // 방향키 네비게이션
            monthlyDisplay.addEventListener('keydown', (e) => {
                if (!e.target.classList.contains('edit-work-input')) return;
                const input = e.target;
                const td = input.parentElement;
                const tr = td.parentElement;
                const inputsInTd = Array.from(td.querySelectorAll('.edit-work-input'));
                const inputIdx = inputsInTd.indexOf(input); 
                
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
                            targetInput = nextTrTds[tdIdx]?.querySelectorAll('.edit-work-input')[0];
                        }
                        break;
                    case 'ArrowUp':
                        if (inputIdx === 1) {
                            targetInput = inputsInTd[0];
                        } else if (trIdx > 0) {
                            const prevTrTds = Array.from(trs[trIdx - 1].querySelectorAll('td.names-cell'));
                            targetInput = prevTrTds[tdIdx]?.querySelectorAll('.edit-work-input')[1];
                        }
                        break;
                    case 'Enter':
                        e.preventDefault();
                        if (inputIdx === 0) {
                            targetInput = inputsInTd[1];
                        } else if (trIdx < trs.length - 1) {
                            const nextTrTds = Array.from(trs[trIdx + 1].querySelectorAll('td.names-cell'));
                            targetInput = nextTrTds[tdIdx]?.querySelectorAll('.edit-work-input')[0];
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

            prevMonthBtn?.addEventListener('click', () => {
                if (isEditMode) return;
                const [y, m] = monthPicker.value.split('-').map(Number);
                const d = new Date(y, m - 2, 1);
                monthPicker.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                renderMonthlyView();
            });

            nextMonthBtn?.addEventListener('click', () => {
                if (isEditMode) return;
                const [y, m] = monthPicker.value.split('-').map(Number);
                const d = new Date(y, m, 1);
                monthPicker.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
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
