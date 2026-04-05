async function updateWorkSchedule() {
        
    function getDaySchedule(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open("myDB"); 
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("workSchedule")) {
                    resolve(null);
                    return;
                }
                try {
                    const tx = db.transaction("workSchedule", "readonly");
                    const store = tx.objectStore("workSchedule");
                    
                    const getAllReq = store.getAll();
                    getAllReq.onsuccess = () => {
                        const allData = getAllReq.result || [];
                        const found = allData.find(item => item.date === dateStr);
                        resolve(found || null);
                    };
                    getAllReq.onerror = () => resolve(null);
                } catch (err) {
                    console.warn("Store 'workSchedule'을 찾을 수 없습니다.");
                    resolve(null);
                }
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("workSchedule")) db.createObjectStore("workSchedule");
            };
            request.onerror = () => resolve(null);
        });
    }

    function getAllSchedules() {
        return new Promise((resolve) => {
            const request = indexedDB.open("myDB");
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("workSchedule")) {
                    resolve([]);
                    return;
                }
                try {
                    const tx = db.transaction("workSchedule", "readonly");
                    const store = tx.objectStore("workSchedule");
                    const getReq = store.getAll();
                    getReq.onsuccess = () => resolve(getReq.result || []);
                    getReq.onerror = () => resolve([]);
                } catch (err) {
                    resolve([]);
                }
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("workSchedule")) db.createObjectStore("workSchedule");
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
                            <td rowspan="3" class="group-header table-fdfdfd-bg v-middle">해복합</td>
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
            
            const currentMonthData = allSchedules.filter(day => {
                const d = new Date(day.date);
                return d.getFullYear() === selectedYear && (d.getMonth() + 1) === selectedMonth;
            }).sort((a, b) => a.date.localeCompare(b.date));

            if (currentMonthData.length === 0) {
                monthlyDisplay.innerHTML = `<div class="alert alert-light text-center py-5" style="border:1px solid #dee2e6;">${selectedYear}년 ${selectedMonth}월 데이터가 존재하지 않습니다.</div>`;
                statsDisplay.innerHTML = "";
                return;
            }

            const daysOfWeek = ["일", "월", "화", "수", "목", "금", "토"];
            const stats = {};

            currentMonthData.forEach(day => {
                const namesInDay = [
                    ...day.cctv.flatMap(c => [c.p1, c.p2]),
                    ...day.tod.flatMap(t => [t.p1, t.p2])
                ].filter(name => name && name !== "-");
                
                namesInDay.forEach(name => {
                    if (!stats[name]) stats[name] = { wdWork: 0, weWork: 0, totalHours: 0 };
                });
            });

            let headerHtml = `<tr><th colspan="2" class="table-light-bg">구분</th>`;
            let totalWD = 0, totalWE = 0;

            currentMonthData.forEach(dayData => {
                const d = new Date(dayData.date);
                const isWeekendOrHoliday = (d.getDay() === 0 || d.getDay() === 6 || dayData.isHoliday);
                if (isWeekendOrHoliday) totalWE++; else totalWD++;

                const dayName = daysOfWeek[d.getDay()];
                const isRedDay = (d.getDay() === 0 || dayData.isHoliday);
                const dayClass = isRedDay ? "text-danger" : (d.getDay() === 6 ? "text-primary" : "");
                
                headerHtml += `<th class="${dayClass} table-light-bg" style="min-width:80px; text-align:center;">${d.getMonth()+1}/${d.getDate()}<br><small>(${dayName})</small></th>`;

                dayData.cctv.forEach(c => { 
                    [c.p1, c.p2].forEach(p => { 
                        if (stats[p]) { 
                            if (isWeekendOrHoliday) stats[p].weWork++; else stats[p].wdWork++; 
                            stats[p].totalHours += 8; 
                        } 
                    });
                });

                dayData.tod.forEach(t => {
                    if (t.location !== "-" && t.location !== "") {
                        let hours = 0;
                        if (t.location === "고하도") hours = 9;
                        else if (t.location === "외기 평시") hours = 7;
                        else if (t.location === "외기 핵취") hours = 10;

                        [t.p1, t.p2].forEach(p => { 
                            if (stats[p] && p !== "-") { 
                                if (isWeekendOrHoliday) stats[p].weWork++; else stats[p].wdWork++; 
                                stats[p].totalHours += hours; 
                            } 
                        });
                    }
                });
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
            bodyHtml += renderTodRow('외기', "외기 평시");
            bodyHtml += renderTodRow('외기', "외기 핵취");

            monthlyDisplay.innerHTML = `
                <div class="monthly-table-wrapper">
                    <table class="work-table table-bordered monthly-table">
                        <thead>${headerHtml}</tr></thead>
                        <tbody>${bodyHtml}</tbody>
                    </table>
                </div>`;

            const hourList = Object.values(stats).map(s => s.totalHours);
            const avgHours = hourList.length ? (hourList.reduce((a, b) => a + b, 0) / hourList.length) : 0;
            const sortedHours = [...hourList].sort((a, b) => a - b);
            const medianHours = sortedHours.length ? (sortedHours.length % 2 === 0 
                ? (sortedHours[sortedHours.length/2 - 1] + sortedHours[sortedHours.length/2]) / 2 
                : sortedHours[Math.floor(sortedHours.length/2)]) : 0;
            
            const maxVal = hourList.length ? Math.max(...hourList) : 0;
            const minVal = hourList.length ? Math.min(...hourList) : 0;
            const maxUsers = Object.keys(stats).filter(n => stats[n].totalHours === maxVal);
            const minUsers = Object.keys(stats).filter(n => stats[n].totalHours === minVal);

            let statsRows = "";
            Object.keys(stats).sort().forEach(name => {
                const s = stats[name];
                const dev = (s.totalHours - avgHours).toFixed(1);
                const devClass = dev > 0 ? "text-danger" : (dev < 0 ? "text-primary" : "");
                statsRows += `
                    <tr>
                        <td class="name-cell">${name}</td>
                        <td>${s.wdWork}회</td>
                        <td>${s.weWork}회</td>
                        <td>${totalWD - s.wdWork}일</td>
                        <td>${totalWE - s.weWork}일</td>
                        <td class="hours-cell">${s.totalHours}h</td>
                        <td class="dev-cell ${devClass}">${dev > 0 ? '+' : ''}${dev}h</td>
                    </tr>`;
            });

            statsDisplay.innerHTML = `
                <div class="summary-grid">
                    <div class="summary-item">
                        <div class="summary-label">평균값</div>
                        <div class="summary-value">${avgHours.toFixed(1)}h</div>
                    </div>
                    <div class="summary-item">
                        <div class="summary-label">중앙값</div>
                        <div class="summary-value">${medianHours}h</div>
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
                                <th>휴일 근무</th>
                                <th>평일 비번</th>
                                <th>휴일 비번</th>
                                <th>총 시간</th>
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
