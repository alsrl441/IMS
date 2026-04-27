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

        const renderPersonalStatus = async (monthData, year, month) => {
            const display = document.getElementById('personal-status-display');
            if (!display) return;

            // 1. 인원 데이터 가져오기 (personnel)
            const MEMBER_STORE = "members";
            await window.ensureStore(MEMBER_STORE, "id");
            const members = await window.getDBData(MEMBER_STORE);
            if (!members || members.length === 0) {
                display.innerHTML = '<div class="text-center py-4 text-muted">등록된 인원 정보가 없습니다.</div>';
                return;
            }

            // 계급 순서 정의 (필요시 사용)
            const rankOrder = ["이병", "일병", "상병", "병장", "하사", "중사", "상사", "소위", "중위", "대위"];
            const getRank = (name) => {
                const m = members.find(mem => mem.name === name);
                if (!m) return "";
                // 인사정보에서 계급을 가져오는 로직 (현재는 affiliation이나 position에 있을 수 있음, 
                // 만약 없다면 기본값 혹은 계산된 계급 사용)
                // 여기서는 요청하신 대로 관등성명 출력을 위해 이름을 우선 사용하고,
                // 실제 personnel 데이터의 진급일 기준 계산 로직이 필요할 수 있음.
                const now = new Date();
                const start = new Date(m.start);
                const pfc = getPromotionDate(m.start, 2, 0);
                const cpl = getPromotionDate(m.start, 8, m.pfc2cpl);
                const sgt = getPromotionDate(m.start, 14, m.cpl2sgt);
                
                if (now < pfc) return "이병";
                if (now < cpl) return "일병";
                if (now < sgt) return "상병";
                if (now < new Date(m.end)) return "병장";
                return "전역";
            };

            const getPromotionDate = (s, m, a) => {
                if (!s) return null; let d = new Date(s); d.setMonth(d.getMonth() + m + 1); d.setDate(1);
                if (a) d.setMonth(d.getMonth() - a); return d;
            };

            const daysInMonth = monthData.length;
            const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];

            // 헤더 생성
            let headerHtml = `<tr><th class="name-col">성명</th>`;
            monthData.forEach(day => {
                const d = new Date(day.date);
                const dayName = daysOfWeek[d.getDay()];
                const isSun = d.getDay() === 0;
                const isSat = d.getDay() === 6;
                const isHoliday = day.isHoliday || isSun || isSat;
                const isRedDay = isSun || day.isHoliday;
                const dayClass = isRedDay ? "text-danger" : (isSat ? "text-primary" : "");
                
                headerHtml += `<th class="${isHoliday ? 'is-holiday' : ''} ${day.date === getFormattedDate(new Date()) ? 'is-today' : ''} ${dayClass}">
                    ${d.getMonth()+1}/${d.getDate()}<br><small>(${dayName})</small>
                </th>`;
            });
            headerHtml += `</tr>`;

            let bodyHtml = "";
            
            // 모든 인원 순회
            members.sort((a, b) => a.name.localeCompare(b.name)).forEach(member => {
                let rowHtml = `<tr><td class="name-col">${member.name}</td>`;
                const vacation = member.vacation || [];
                
                for (let i = 0; i < daysInMonth; i++) {
                    const currentDateStr = monthData[i].date;
                    
                    // 1. 휴가 체크
                    if (vacation.length === 2 && currentDateStr >= vacation[0] && currentDateStr <= vacation[1]) {
                        if (currentDateStr === vacation[0] || i === 0 || (new Date(monthData[i-1].date) < new Date(vacation[0]))) {
                            let colSpan = 0;
                            for (let j = i; j < daysInMonth; j++) {
                                if (monthData[j].date <= vacation[1]) colSpan++;
                                else break;
                            }
                            rowHtml += `<td colspan="${colSpan}" class="vacation-cell">휴가</td>`;
                            i += (colSpan - 1);
                            continue;
                        }
                    }

                    // 2. 근무 체크
                    const dayData = monthData[i];
                    let workLabel = "★"; 
                    let workClass = "off-day";

                    const findWork = (day) => {
                        for (const c of day.cctv) {
                            if (c.p1 === member.name || c.p2 === member.name) return c.shift;
                        }
                        for (const t of day.tod) {
                            if (t.p1 === member.name || t.p2 === member.name) return t.location;
                        }
                        return null;
                    };

                    const shift = findWork(dayData);
                    if (shift) {
                        if (shift.includes("06-14")) { workLabel = "6"; workClass = "work-6"; }
                        else if (shift.includes("14-22")) { workLabel = "14"; workClass = "work-14"; }
                        else if (shift.includes("22-06")) { workLabel = "22"; workClass = "work-22"; }
                        else { workLabel = "근무"; workClass = "work-other"; }
                    }

                    rowHtml += `<td class="${workClass}">${workLabel}</td>`;
                }
                bodyHtml += rowHtml + `</tr>`;
            });

            display.innerHTML = `
                <div class="monthly-table-wrapper">
                    <table class="work-table table-bordered personal-table">
                        <thead>${headerHtml}</thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>`;
        };

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
            const stats = {};

            // 통계 대상 인원 파악
            currentMonthData.forEach(day => {
                const namesInDay = [
                    ...day.cctv.flatMap(c => [c.p1, c.p2]),
                    ...day.tod.flatMap(t => [t.p1, t.p2])
                ].filter(name => name && name !== "-");
                
                namesInDay.forEach(name => {
                    if (!stats[name]) stats[name] = { wdWork: 0, weWork: 0, totalHours: 0, totalLostTime: 0, score: 0 };
                });
            });

            let headerHtml = `<tr><th colspan="2" class="table-light-bg">구분</th>`;
            let totalWD = 0, totalWE = 0;

            currentMonthData.forEach(dayData => {
                const d = new Date(dayData.date);
                const isSun = d.getDay() === 0;
                const isSat = d.getDay() === 6;
                const isHoliday = dayData.isHoliday || isSun || isSat;
                
                let dayType = "weekday";
                if (isSun || dayData.isHoliday) dayType = "holiday";
                else if (isSat) dayType = "saturday";

                if (isSun || isSat || dayData.isHoliday) totalWE++; else totalWD++;

                const dayName = daysOfWeek[d.getDay()];
                const isRedDay = (isSun || dayData.isHoliday);
                const dayClass = isRedDay ? "text-danger" : (isSat ? "text-primary" : "");
                
                headerHtml += `<th class="${isHoliday ? 'is-holiday' : ''} ${dayClass} table-light-bg" style="min-width:80px; text-align:center;">
                    ${d.getMonth()+1}/${d.getDate()}<br><small>(${dayName})</small>
                </th>`;

                // CCTV 통계 계산
                const cctvWeights = WORK_WEIGHTS[dayType].cctv;
                dayData.cctv.forEach((c, idx) => {
                    const shift = idx === 0 ? "06-14" : (idx === 1 ? "14-22" : "22-06");
                    const [wh, lh] = cctvWeights[shift];
                    [c.p1, c.p2].forEach(p => {
                        if (p && p !== "-" && stats[p]) {
                            if (dayType === "weekday") stats[p].wdWork++; else stats[p].weWork++;
                            stats[p].totalHours += wh;
                            stats[p].totalLostTime += lh;
                        }
                    });
                });

                // TOD 통계 계산
                const todWeights = WORK_WEIGHTS[dayType].tod;
                dayData.tod.forEach(t => {
                    const loc = t.location;
                    if (loc && loc !== "-" && todWeights[loc]) {
                        const [wh, lh] = todWeights[loc];
                        [t.p1, t.p2].forEach(p => {
                            if (p && p !== "-" && stats[p]) {
                                if (dayType === "weekday") stats[p].wdWork++; else stats[p].weWork++;
                                stats[p].totalHours += wh;
                                stats[p].totalLostTime += lh;
                            }
                        });
                    }
                });
            });

            // 점수 계산
            Object.keys(stats).forEach(name => {
                stats[name].score = stats[name].totalHours + stats[name].totalLostTime;
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

            // 통계 렌더링 (기존과 동일)
            const scoreList = Object.values(stats).map(s => s.score).sort((a, b) => a - b);
            const avgScore = scoreList.length ? (scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : 0;
            let medianScore = 0;
            if (scoreList.length > 0) {
                const mid = Math.floor(scoreList.length / 2);
                medianScore = scoreList.length % 2 !== 0 ? scoreList[mid] : (scoreList[mid - 1] + scoreList[mid]) / 2;
            }
            const maxScore = scoreList.length ? Math.max(...scoreList) : 0;
            const minScore = scoreList.length ? Math.min(...scoreList) : 0;
            const maxUsers = Object.keys(stats).filter(n => stats[n].score === maxScore);
            const minUsers = Object.keys(stats).filter(n => stats[n].score === minScore);

            // 개인별 월간 현황표 렌더링
            await renderPersonalStatus(currentMonthData, selectedYear, selectedMonth);

            let statsRows = "";
            Object.keys(stats).sort().forEach(name => {
                const s = stats[name];
                const dev = (s.score - avgScore).toFixed(1);
                const devClass = dev > 0 ? "text-danger" : (dev < 0 ? "text-primary" : "");
                statsRows += `
                    <tr>
                        <td class="name-cell">${name}</td>
                        <td>${s.wdWork}</td>
                        <td>${totalWD - s.wdWork}</td>
                        <td>${s.weWork}</td>
                        <td>${totalWE - s.weWork}</td>
                        <td>${s.totalHours}h</td>
                        <td>${s.totalLostTime.toFixed(1)}h</td>
                        <td class="hours-cell">${s.score.toFixed(1)}h</td>
                        <td class="dev-cell ${devClass}">${dev > 0 ? '+' : ''}${dev}h</td>
                    </tr>`;
            });

            statsDisplay.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item"><div class="summary-label">평균값</div><div class="summary-value">${avgScore.toFixed(1)}h</div></div>
                    <div class="summary-item"><div class="summary-label">중앙값</div><div class="summary-value">${medianScore.toFixed(1)}h</div></div>
                    <div class="summary-item mvp"><div class="summary-label">이달의 MVP</div><div class="summary-value" style="font-size:1rem;">${maxUsers.join(', ')}</div></div>
                    <div class="summary-item bee"><div class="summary-label">이달의 꿀벌</div><div class="summary-value" style="font-size:1rem;">${minUsers.join(', ')}</div></div>
                </div>
                <div class="monthly-table-wrapper">
                    <table class="work-table table-bordered stats-table">
                        <thead>
                            <tr><th>성명</th><th>평일 근무</th><th>평일 비번</th><th>휴일 근무</th><th>휴일 비번</th><th>근무시간</th><th>뺏긴 시간</th><th>총합</th><th>평균 편차</th></tr>
                        </thead>
                        <tbody>${statsRows}</tbody>
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
