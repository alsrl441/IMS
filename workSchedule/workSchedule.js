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

    if (monthlyDisplay && statsDisplay && monthPicker) {
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
                        cctv: [{}, {}, {}],
                        tod: [{}, {}, {}],
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
                const isHoliday = dayData.isHoliday;
                
                let dayType = "weekday";
                if (isSun || isHoliday) dayType = "holiday";
                else if (isSat) dayType = "saturday";

                if (isSun || isSat || isHoliday) totalWE++; else totalWD++;

                const dayName = daysOfWeek[d.getDay()];
                const isRedDay = (isSun || isHoliday);
                const dayClass = isRedDay ? "text-danger" : (isSat ? "text-primary" : "");
                
                headerHtml += `<th class="${dayClass} table-light-bg" style="min-width:80px; text-align:center;">${d.getMonth()+1}/${d.getDate()}<br><small>(${dayName})</small></th>`;

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

            // 점수 계산 (근무시간 + 뺏긴 시간)
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
                    row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
                });
                return row + `</tr>`;
            };

            const renderTodRow = (type, label) => {
                let row = `<tr>`;
                if (type === '고하도') row += `<td rowspan="3" class="group-header table-fdfdfd-bg v-middle">TOD</td>`;
                row += `<td class="sub-group table-fdfdfd-bg">${label}</td>`;
                
                currentMonthData.forEach(day => {
                    let s = day.tod.find(item => item.location === label);
                    const p1 = (s && s.p1 !== "-") ? s.p1 : "";
                    const p2 = (s && s.p2 !== "-") ? s.p2 : "";
                    row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
                });
                return row + `</tr>`;
            };

            let bodyHtml = "";
            bodyHtml += renderCctvRow(0, "06-14");
            bodyHtml += renderCctvRow(1, "14-22");
            bodyHtml += renderCctvRow(2, "22-06");
            bodyHtml += renderTodRow('고하도', "고하도");
            bodyHtml += renderTodRow('외기 평시', "외기 평시");
            bodyHtml += renderTodRow('외기 핵취', "외기 핵취");

            monthlyDisplay.innerHTML = `
                <div class="monthly-table-wrapper">
                    <table class="work-table table-bordered monthly-table">
                        <thead>${headerHtml}</tr></thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>`;

            const scoreList = Object.values(stats).map(s => s.score).sort((a, b) => a - b);
            const avgScore = scoreList.length ? (scoreList.reduce((a, b) => a + b, 0) / scoreList.length) : 0;
            
            // 중앙값 계산
            let medianScore = 0;
            if (scoreList.length > 0) {
                const mid = Math.floor(scoreList.length / 2);
                medianScore = scoreList.length % 2 !== 0 ? scoreList[mid] : (scoreList[mid - 1] + scoreList[mid]) / 2;
            }

            const maxScore = scoreList.length ? Math.max(...scoreList) : 0;
            const minScore = scoreList.length ? Math.min(...scoreList) : 0;
            const maxUsers = Object.keys(stats).filter(n => stats[n].score === maxScore);
            const minUsers = Object.keys(stats).filter(n => stats[n].score === minScore);

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
                    <div class="summary-item">
                        <div class="summary-label">평균값</div>
                        <div class="summary-value">${avgScore.toFixed(1)}h</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">중앙값</div>
                        <div class="summary-value">${medianScore.toFixed(1)}h</div>
                    </div>
                    <div class="summary-item mvp">
                        <div class="summary-label">이달의 MVP</div>
                        <div class="summary-value" style="font-size:1rem;">${maxUsers.join(', ')}</div>
                    </div>
                    <div class="summary-item bee">
                        <div class="summary-label">이달의 꿀벌</div>
                        <div class="summary-value" style="font-size:1rem;">${minUsers.join(', ')}</div>
                    </div>
                </div>
                <div class="monthly-table-wrapper">
                    <table class="work-table table-bordered stats-table">
                        <thead>
                            <tr>
                                <th>성명</th>
                                <th>평일 근무</th>
                                <th>평일 비번</th>
                                <th>휴일 근무</th>
                                <th>휴일 비번</th>
                                <th>근무시간</th>
                                <th>뺏긴 시간</th>
                                <th>총합</th>
                                <th>평균 편차</th>
                            </tr>
                        </thead>
                        <tbody>${statsRows}</tbody>
                    </table>
                </div>`;
        };

        renderMonthlyView();
        monthPicker.addEventListener('change', renderMonthlyView);
    }
}

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateWorkSchedule();
} else {
    document.addEventListener('DOMContentLoaded', updateWorkSchedule);
}
