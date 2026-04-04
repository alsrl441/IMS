/**
 * CCSS Work Schedule System v2.5 (IndexedDB Stability Version)
 * 제작: Gemini (v3.9 Clean Bootstrap Style Compatible)
 */

async function updateWorkSchedule() {
    // --- [1] IndexedDB Data Fetcher ---
    
    // [수정] 특정 키 조회가 실패할 경우를 대비해 전체 검색 방식으로 변경
    function getDaySchedule(dateStr) {
        return new Promise((resolve) => {
            const request = indexedDB.open("workSchedule"); 
            request.onsuccess = (e) => {
                const db = e.target.result;
                try {
                    const tx = db.transaction("workSchedule", "readonly");
                    const store = tx.objectStore("workSchedule");
                    
                    // 단순 get(dateStr) 대신 getAll()로 안전하게 찾기
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
            request.onerror = () => resolve(null);
        });
    }

    // 모든 데이터를 가져오는 함수 (이건 기존 getAll 방식 유지)
    function getAllSchedules() {
        return new Promise((resolve) => {
            const request = indexedDB.open("workSchedule");
            request.onsuccess = (e) => {
                const db = e.target.result;
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
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // --- [2] 대시보드 렌더링 (index.html 메인용) ---
    const workDisplay = document.getElementById('work-display');
    if (workDisplay) {
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);

        const renderTable = async (dateStr, label) => {
            const data = await getDaySchedule(dateStr);
            if (!data) return `<div class="no-data" style="padding:20px; color:#6c757d; text-align:center;">${dateStr} (${label}) 데이터가 없습니다.</div>`;
            
            const formatName = (name) => (name === "-" || !name ? "" : name);

            return `
                <table class="work-table table table-bordered mb-4" style="width:100%; border-collapse:collapse; margin-bottom:20px;">
                    <thead>
                        <tr style="background:#f8f9fa;">
                            <th colspan="4" class="table-date-header ${data.isHoliday ? 'text-danger' : ''}" style="padding:10px; border:1px solid #dee2e6; text-align:center;">
                                ${dateStr} (${label}) ${data.isHoliday ? '<span style="font-size:0.8rem;">[공휴일/휴무]</span>' : ''}
                            </th>
                        </tr>
                        <tr style="background:#fff;">
                            <th colspan="2" style="width:40%; padding:8px; border:1px solid #dee2e6; text-align:center;">구분</th>
                            <th style="width:30%; padding:8px; border:1px solid #dee2e6; text-align:center;">사수</th>
                            <th style="width:30%; padding:8px; border:1px solid #dee2e6; text-align:center;">부사수</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td rowspan="3" class="group-header" style="vertical-align:middle; text-align:center; border:1px solid #dee2e6; font-weight:bold; background:#fdfdfd;">해복합</td>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.cctv[0]?.shift || "06-14"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[0]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[0]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.cctv[1]?.shift || "14-22"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[1]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[1]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.cctv[2]?.shift || "22-06"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[2]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.cctv[2]?.p2)}</td>
                        </tr>
                        <tr>
                            <td rowspan="3" class="group-header" style="vertical-align:middle; text-align:center; border:1px solid #dee2e6; font-weight:bold; background:#fdfdfd;">TOD</td>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.tod[0]?.location || "고하도"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[0]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[0]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.tod[1]?.location || "외기 평시"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[1]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[1]?.p2)}</td>
                        </tr>
                        <tr>
                            <td class="sub-group" style="text-align:center; border:1px solid #dee2e6; padding:5px;">${data.tod[2]?.location || "외기 핵취"}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[2]?.p1)}</td>
                            <td style="text-align:center; border:1px solid #dee2e6; padding:5px;">${formatName(data.tod[2]?.p2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        };
        
        const todayContent = await renderTable(todayStr, "금일");
        const tomorrowContent = await renderTable(tomorrowStr, "익일");
        workDisplay.innerHTML = todayContent + tomorrowContent;
    }

    // --- [3] 월간 상세 근무표 및 통계 (workSchedule.html용) ---
    const monthlyDisplay = document.getElementById('monthly-work-display');
    const statsDisplay = document.getElementById('stats-display');

    if (monthlyDisplay && statsDisplay) {
        const allSchedules = await getAllSchedules();
        
        const currentMonthData = allSchedules.filter(day => {
            const d = new Date(day.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        }).sort((a, b) => a.date.localeCompare(b.date));

        if (currentMonthData.length === 0) {
            monthlyDisplay.innerHTML = `<div class="alert alert-light text-center py-5" style="border:1px solid #dee2e6;">${currentYear}년 ${currentMonth + 1}월 데이터가 존재하지 않습니다.</div>`;
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

        let headerHtml = `<tr><th colspan="2" style="background:#f8f9fa;">구분</th>`;
        let totalWD = 0, totalWE = 0;

        currentMonthData.forEach(dayData => {
            const d = new Date(dayData.date);
            const isWeekendOrHoliday = (d.getDay() === 0 || d.getDay() === 6 || dayData.isHoliday);
            if (isWeekendOrHoliday) totalWE++; else totalWD++;

            const dayName = daysOfWeek[d.getDay()];
            const isRedDay = (d.getDay() === 0 || dayData.isHoliday);
            const dayClass = isRedDay ? "text-danger" : (d.getDay() === 6 ? "text-primary" : "");
            
            headerHtml += `<th class="${dayClass}" style="min-width:80px; text-align:center; background:#f8f9fa;">${d.getMonth()+1}/${d.getDate()}<br><small>(${dayName})</small></th>`;

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
            if (idx === 0) row += `
                <td
                    rowspan="3"
                    class="group-header"
                    style="background:#fdfdfd;
                    font-weight:bold;
                    text-align:center;
                    vertical-align:middle;"
                >
                    CCTV
                </td>
            `;
            row += `
                <td
                    class="sub-group"
                    style="background:#fdfdfd;
                    text-align:center;
                ">
                    ${label}
                </td>
            `;

            currentMonthData.forEach(day => {
                const s = day.cctv[idx];
                const p1 = (s?.p1 === "-" || !s?.p1) ? "" : s.p1;
                const p2 = (s?.p2 === "-" || !s?.p2) ? "" : s.p2;
                row += `
                    <td class="names-cell" style="text-align:center; padding:4px; font-size:0.85rem;">
                        <div>${p1}</div>
                        <div>${p2}</div>
                    </td>
                `;
            });
            return row + `</tr>`;
        };

        const renderTodRow = (type, label) => {
            let row = `<tr>`;
            if (type === '고하도') row += `
                <td
                    rowspan="3"
                    class="group-header"
                    style="
                        background:#fdfdfd;
                        font-weight:bold;
                        text-align:center;
                        vertical-align:middle;
                    "
                >
                    TOD
                </td>
            `;
            row += `
                <td
                    class="sub-group"
                    style="
                        background:#fdfdfd;
                        text-align:center;
                    "
                >
                    ${label}
                </td>
            `;
            
            currentMonthData.forEach(day => {
                let s = day.tod.find(item => item.location === label);
                const p1 = (s && s.p1 !== "-") ? s.p1 : "";
                const p2 = (s && s.p2 !== "-") ? s.p2 : "";
                row += `
                    <td
                        class="names-cell"
                        style="
                            text-align:center;
                            padding:4px;
                            font-size:0.85rem;
                        "
                    >
                        <div style="font-weight:500;">
                            ${p1}
                        </div>
                        <div style="color:#6c757d;">
                            ${p2}
                        </div>
                    </td>
                `;
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
            <div style="overflow-x:auto;">
                <table
                    class="work-table table-bordered monthly-table"
                    style="
                        width:100%;
                        border-collapse:collapse;
                        min-width:1000px;
                    "
                >
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
                    <td style="font-weight:bold; text-align:center; padding:8px; border:1px solid #dee2e6;">${name}</td>
                    <td style="text-align:center; padding:8px; border:1px solid #dee2e6;">${s.wdWork}회</td>
                    <td style="text-align:center; padding:8px; border:1px solid #dee2e6;">${s.weWork}회</td>
                    <td style="text-align:center; padding:8px; border:1px solid #dee2e6;">${totalWD - s.wdWork}일</td>
                    <td style="text-align:center; padding:8px; border:1px solid #dee2e6;">${totalWE - s.weWork}일</td>
                    <td style="font-weight:bold; color:#212529; text-align:center; padding:8px; border:1px solid #dee2e6;">${s.totalHours}h</td>
                    <td class="${devClass}" style="text-align:center; padding:8px; border:1px solid #dee2e6; font-weight:600;">${dev > 0 ? '+' : ''}${dev}h</td>
                </tr>`;
        });

        statsDisplay.innerHTML = `
            <div class="summary-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:15px; margin-bottom:30px;">
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center; border:1px solid #dee2e6;">
                    <div style="font-size:0.8rem; color:#6c757d; margin-bottom:5px;">평균값</div>
                    <strong style="font-size:1.2rem;">${avgHours.toFixed(1)}h</strong>
                </div>
                <div style="background:#f8f9fa; padding:15px; border-radius:8px; text-align:center; border:1px solid #dee2e6;">
                    <div style="font-size:0.8rem; color:#6c757d; margin-bottom:5px;">중앙값</div>
                    <strong style="font-size:1.2rem;">${medianHours}h</strong>
                </div>
                <div style="background:#fff3cd; padding:15px; border-radius:8px; text-align:center; border:1px solid #ffeeba;">
                    <div style="font-size:0.8rem; color:#856404; margin-bottom:5px;">이달의 MVP</div>
                    <strong style="font-size:1rem; color:#856404;">${maxUsers.join(', ')}</strong>
                </div>
                <div style="background:#d1ecf1; padding:15px; border-radius:8px; text-align:center; border:1px solid #bee5eb;">
                    <div style="font-size:0.8rem; color:#0c5460; margin-bottom:5px;">이달의 꿀벌</div>
                    <strong style="font-size:1rem; color:#0c5460;">${minUsers.join(', ')}</strong>
                </div>
            </div>
            <div style="overflow-x:auto;">
                <table class="work-table table-bordered stats-table" style="width:100%; border-collapse:collapse; min-width:800px;">
                    <thead style="background:#f8f9fa;">
                        <tr>
                            <th style="padding:10px; border:1px solid #dee2e6;">성명</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">평일 근무</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">주말 근무</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">평일 비번</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">주말 비번</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">총 시간</th>
                            <th style="padding:10px; border:1px solid #dee2e6;">평균 편차</th>
                        </tr>
                    </thead>
                    <tbody>${statsRows}</tbody>
                </table>
            </div>`;
    }
}

// 안전한 실행을 위해 DOM 상태 확인 후 실행
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    updateWorkSchedule();
} else {
    document.addEventListener('DOMContentLoaded', updateWorkSchedule);
}
