function updateWorkSchedule() {
    if (typeof scheduleData === 'undefined') return;

    const getFormattedDate = (dateObj) => {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const now = new Date();
    const todayStr = getFormattedDate(now);
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-11

    // 대시보드용 (오늘/내일) - 이건 특정 날짜를 찾으므로 필터 불필요
    const workDisplay = document.getElementById('work-display');
    if (workDisplay) {
        const tomorrowObj = new Date(now.getTime() + 86400000);
        const tomorrowStr = getFormattedDate(tomorrowObj);

        const renderTable = (dateStr, label) => {
            const data = scheduleData.find(s => s.date === dateStr);
            if (!data) return `<div class="no-data">${dateStr} 정보 없음</div>`;
            const formatName = (name) => (name === "-" ? "" : name);

            return `
                <table class="work-table table table-bordered">
                    <thead>
                        <tr><th colspan="4" class="table-date-header ${data.isHoliday ? 'text-danger' : ''}">${dateStr} (${label})</th></tr>
                        <tr><th colspan="2" style="width:40%;">구분</th><th style="width:30%;">사수</th><th style="width:30%;">부사수</th></tr>
                    </thead>
                    <tbody>
                        <tr><td rowspan="3" class="group-header">해복합</td><td class="sub-group">${data.cctv[0]?.shift || ""}</td><td>${formatName(data.cctv[0]?.p1)}</td><td>${formatName(data.cctv[0]?.p2)}</td></tr>
                        <tr><td class="sub-group">${data.cctv[1]?.shift || ""}</td><td>${formatName(data.cctv[1]?.p1)}</td><td>${formatName(data.cctv[1]?.p2)}</td></tr>
                        <tr><td class="sub-group">${data.cctv[2]?.shift || ""}</td><td>${formatName(data.cctv[2]?.p1)}</td><td>${formatName(data.cctv[2]?.p2)}</td></tr>
                        <tr><td rowspan="3" class="group-header">TOD</td><td class="sub-group">${data.tod[0]?.location || ""}</td><td>${formatName(data.tod[0]?.p1)}</td><td>${formatName(data.tod[0]?.p2)}</td></tr>
                        <tr><td class="sub-group">${data.tod[1]?.location || ""}</td><td>${formatName(data.tod[1]?.p1)}</td><td>${formatName(data.tod[1]?.p2)}</td></tr>
                        <tr><td class="sub-group">${data.tod[2]?.location || ""}</td><td>${formatName(data.tod[2]?.p1)}</td><td>${formatName(data.tod[2]?.p2)}</td></tr>
                    </tbody>
                </table>
            `;
        };
        workDisplay.innerHTML = renderTable(todayStr, "금일") + renderTable(tomorrowStr, "익일");
    }

    // 월간 전체 근무표 및 통계용
    const monthlyDisplay = document.getElementById('monthly-work-display');
    const statsDisplay = document.getElementById('stats-display');

    if (monthlyDisplay && statsDisplay) {
        // ★ 현재 월의 데이터만 필터링 ★
        const currentMonthData = scheduleData.filter(day => {
            const d = new Date(day.date);
            return d.getFullYear() === currentYear && d.getMonth() === currentMonth;
        });

        const days = ["일", "월", "화", "수", "목", "금", "토"];
        const stats = {};

        // 1. 인원 초기화
        currentMonthData.forEach(day => {
            const allNames = [...day.cctv.flatMap(c => [c.p1, c.p2]), ...day.tod.flatMap(t => [t.p1, t.p2])].filter(n => n && n !== "-");
            allNames.forEach(n => { if (!stats[n]) stats[n] = { wdWork: 0, weWork: 0, totalHours: 0 }; });
        });

        // 2. 월간 근무표 헤더 및 통계 집계
        let headerHtml = `<tr><th colspan="2">구분</th>`;
        let totalWD = 0, totalWE = 0;

        currentMonthData.forEach(dayData => {
            const d = new Date(dayData.date);
            const isWE = (d.getDay() === 0 || d.getDay() === 6 || dayData.isHoliday);
            if (isWE) totalWE++; else totalWD++;

            const dayName = days[d.getDay()];
            const isRedDay = (d.getDay() === 0 || dayData.isHoliday);
            const dayClass = isRedDay ? "text-danger" : (d.getDay() === 6 ? "text-primary" : "");
            
            headerHtml += `<th class="${dayClass}">${d.getMonth()+1}/${d.getDate()}<br>(${dayName})</th>`;

            dayData.cctv.forEach(c => { 
                [c.p1, c.p2].forEach(p => { if (stats[p]) { if (isWE) stats[p].weWork++; else stats[p].wdWork++; stats[p].totalHours += 8; } });
            });
            // TOD 통계 (외기 주기 및 이름 체크 포함)
            dayData.tod.forEach(t => {
                if (t.location !== "-") {
                    let h = 0;
                    if (t.location === "고하도") h = 9;
                    else if (t.location === "외기 평시") h = 7;
                    else if (t.location === "외기 핵취") h = 10;

                    [t.p1, t.p2].forEach(p => { if (stats[p] && p !== "-") { if (isWE) stats[p].weWork++; else stats[p].wdWork++; stats[p].totalHours += h; } });
                }
            });

        });

        // 3. 월간 근무표 행 렌더링
        const renderCctvRow = (idx, label) => {
            let row = `<tr>`;
            if (idx === 0) row += `<td rowspan="3" class="group-header">CCTV</td>`;
            row += `<td class="sub-group">${label}</td>`;
            currentMonthData.forEach(day => {
                const s = day.cctv[idx];
                const p1 = s?.p1 === "-" ? "" : (s?.p1 || "");
                const p2 = s?.p2 === "-" ? "" : (s?.p2 || "");
                row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
            });
            return row + `</tr>`;
        };

        const renderTodRow = (type, label) => {
            let row = `<tr>`;
            if (type === '고하도') row += `<td rowspan="3" class="group-header">TOD</td>`;
            row += `<td class="sub-group">${label}</td>`;
            
            currentMonthData.forEach(day => {
                let s = (type === '고하도') ? day.tod[0] : (day.tod[1].location === label ? day.tod[1] : null);
                const p1 = (s && s.p1 !== "-") ? s.p1 : "";
                const p2 = (s && s.p2 !== "-") ? s.p2 : "";
                row += `<td class="names-cell"><div class="p1">${p1}</div><div class="p2">${p2}</div></td>`;
            });
            return row + `</tr>`;
        };

        let bodyHtml = "";
        bodyHtml += renderCctvRow(0, "06-14"); bodyHtml += renderCctvRow(1, "14-22"); bodyHtml += renderCctvRow(2, "22-06");
        bodyHtml += renderTodRow('고하도', "고하도"); bodyHtml += renderTodRow('외기', "외기 평시"); bodyHtml += renderTodRow('외기', "외기 핵취");

        monthlyDisplay.innerHTML = `<table class="work-table table-bordered monthly-table"><thead>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`;

        // 4. 통계 심화 분석
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
            statsRows += `<tr><td class="font-weight-bold">${name}</td><td>${s.wdWork}회</td><td>${s.weWork}회</td><td>${totalWD - s.wdWork}일</td><td>${totalWE - s.weWork}일</td><td class="font-weight-bold text-dark">${s.totalHours}시간</td><td class="${devClass}">${dev > 0 ? '+' : ''}${dev}h</td></tr>`;
        });

        statsDisplay.innerHTML = `
            <div class="summary-grid mb-4">
                <div class="summary-item"><span>평균값</span><strong>${avgHours.toFixed(1)}h</strong></div>
                <div class="summary-item"><span>중앙값</span><strong>${medianHours}h</strong></div>
                <div class="summary-item"><span>이달의 MVP</span><strong class="text-danger">${maxUsers.length ? maxUsers.join(', ') + ' (' + maxVal + 'h)' : '-'}</strong></div>
                <div class="summary-item"><span>이달의 꿀벌</span><strong class="text-primary">${minUsers.length ? minUsers.join(', ') + ' (' + minVal + 'h)' : '-'}</strong></div>
            </div>
            <table class="work-table table-bordered stats-table"><thead><tr><th>성명</th><th>평일 근무</th><th>주말 근무</th><th>평일 비번</th><th>주말 비번</th><th>총 근무 시간</th><th>평균 편차</th></tr></thead><tbody>${statsRows}</tbody></table>`;
    }
}

document.addEventListener('DOMContentLoaded', updateWorkSchedule);
