document.addEventListener('DOMContentLoaded', async () => {
    
    const selectEl = document.getElementById('memberSelect');
    const displayEl = document.getElementById('resultDisplay');
    const noDataEl = document.getElementById('noDataMessage');
    const previewEl = document.getElementById('previewDisplay');
    let timerId = null; 
    let members = [];

    async function loadMembersFromDB() {
        const STORE_NAME = "members";
        try {
            await window.ensureStore(STORE_NAME, "id");
            let data = await window.getDBData(STORE_NAME);
            if (!data || data.length === 0) {
                const sampleMember = {
                    "id": "0",
                    "name": "홍길동",
                    "nickName": "ㅎㄱㄷ",
                    "start": "2025-07-15",
                    "end": "2027-01-14",
                    "vacation": ["2026-06-01", "2026-06-08"],
                    "promotion": { "pfc2cpl": 0, "cpl2sgt": 0 },
                    "photo": "",
                    "affiliation": "해안복합감시반",
                    "position": "항포구 감시병",
                    "hobby": "취미",
                    "specialty": "특기"
                };
                await window.putDBData(STORE_NAME, sampleMember);
                data = [sampleMember];
            }
            return data;
        } catch (err) {
            console.error("인원 정보 로딩 실패:", err);
            return [];
        }
    }

    members = await loadMembersFromDB();

    if (members && members.length > 0) {
        members.forEach((m, idx) => {
            let opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m.name; // 별명 제거, 이름만 표시
            selectEl.appendChild(opt);
        });
        renderPreview();
    } else {
        previewEl.innerHTML = '<div class="text-center py-5 text-muted">DB에 등록된 인원 정보가 없습니다.</div>';
    }

    selectEl.addEventListener('change', (e) => {
        handleMemberSelect(e.target.value);
    });

    function handleMemberSelect(val) {
        if (timerId) clearInterval(timerId);

        if (val === "") {
            displayEl.classList.add('hidden');
            noDataEl.classList.remove('hidden');
            previewEl.classList.remove('hidden');
            renderPreview();
        } else {
            const user = members[val];
            displayEl.classList.remove('hidden');
            noDataEl.classList.add('hidden');
            previewEl.classList.add('hidden');
            
            updateStaticProfile(user);
            calculateMilitary(user);
            timerId = setInterval(() => calculateMilitary(user), 10);
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }

    function renderPreview() {
        previewEl.innerHTML = '';
        members.forEach((user, idx) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
                <div class="preview-text">
                    <div class="preview-name">${user.name}</div>
                    <div class="preview-info">${user.rank || ''} ${user.affiliation || ''}</div>
                </div>
            `;
            card.addEventListener('click', () => {
                selectEl.value = idx;
                handleMemberSelect(idx);
            });
            previewEl.appendChild(card);
        });
    }

    function formatDate(date) {
        const d = new Date(date);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function updateStaticProfile(user) {
        document.getElementById('resPhoto').src = user.photo || '../img/default-profile.png';
        document.getElementById('resNickName').innerText = user.nickName || user.name;
        document.getElementById('resName').innerText = user.name;
        document.getElementById('resAffiliation').innerText = user.affiliation || '-';
        document.getElementById('resPosition').innerText = user.position || '-';
        document.getElementById('resStartDate').innerText = user.start || '-';
        document.getElementById('resEndDate').innerText = user.end || '-';
        
        // 휴가 범위 표시: yyyy-MM-DD ~ yyyy-MM-DD (n일)
        const vacRangeEl = document.getElementById('resVacationRange');
        if (Array.isArray(user.vacation) && user.vacation.length === 2) {
            const vStart = new Date(user.vacation[0]);
            const vEnd = new Date(user.vacation[1]);
            const diffTime = Math.abs(vEnd - vStart);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // 시작일 포함
            vacRangeEl.innerText = `${user.vacation[0]} ~ ${user.vacation[1]} (${diffDays}일)`;
        } else {
            vacRangeEl.innerText = '일정 없음';
        }
    }

    function calculateMilitary(user) {
        const now = new Date();
        const start = new Date(user.start);
        const end = new Date(user.end);
        
        // 휴가 D-day 계산을 위한 시작일 추출
        const vacStartStr = Array.isArray(user.vacation) ? user.vacation[0] : null;
        const vac = vacStartStr ? new Date(vacStartStr) : null;

        const totalTime = end - start;
        const passedTime = now - start;
        const remainTime = end - now;

        const percent = Math.min(100, Math.max(0, (passedTime / totalTime) * 100)).toFixed(8);
        const remainDays = Math.ceil(remainTime / (1000 * 60 * 60 * 24));

        const startFirstDay = new Date(start.getFullYear(), start.getMonth(), 1);
        const currentMonthCount = (now.getFullYear() - startFirstDay.getFullYear()) * 12 + (now.getMonth() - startFirstDay.getMonth()) + 1;
        
        const pfc2cpl = (user.promotion && user.promotion.pfc2cpl) || 0;
        const cpl2sgt = (user.promotion && user.promotion.cpl2sgt) || 0;

        const pfcThreshold = 3;
        const cplThreshold = 9 - pfc2cpl;
        const sgtThreshold = 15 - pfc2cpl - cpl2sgt;

        let rank = "", hobong = 0, promoMonthOffset = 0;

        if (currentMonthCount <= pfcThreshold) {
            rank = "이병"; hobong = currentMonthCount; promoMonthOffset = pfcThreshold;
        } else if (currentMonthCount <= cplThreshold) {
            rank = "일병"; hobong = currentMonthCount - pfcThreshold; promoMonthOffset = cplThreshold;
        } else if (currentMonthCount <= sgtThreshold) {
            rank = "상병"; hobong = currentMonthCount - cplThreshold; promoMonthOffset = sgtThreshold;
        } else {
            rank = "병장"; hobong = currentMonthCount - sgtThreshold; promoMonthOffset = -1;
        }

        document.getElementById('resRankStatus').innerText = remainTime > 0 ? `${rank} ${hobong}호봉` : "병장 (전역)";
        document.getElementById('resPercent').innerText = `${percent}%`;
        document.getElementById('progressBarFill').style.width = `${percent}%`;
        document.getElementById('resDday').innerText = remainTime > 0 ? `D-${remainDays}` : "전역 완료";

        let nextPromoDate = null;
        if (promoMonthOffset !== -1) {
            nextPromoDate = new Date(startFirstDay.getFullYear(), startFirstDay.getMonth() + promoMonthOffset, 1);
        }

        const promoDateEl = document.getElementById('resPromoDate');
        const promoDdayEl = document.getElementById('resPromoDday');
        
        if (rank === "병장" || !nextPromoDate || remainTime <= 0) {
            promoDateEl.innerText = "일정 없음";
            promoDdayEl.innerText = "-";
        } else {
            const promoDday = Math.ceil((nextPromoDate - now) / (1000 * 60 * 60 * 24));
            promoDateEl.innerText = formatDate(nextPromoDate); // yyyy-MM-DD 형식 적용
            promoDdayEl.innerText = `D-${promoDday}`;
        }

        const vacDdayEl = document.getElementById('resVacDday');
        if (vac && vac > now) {
            const vacDday = Math.ceil((vac - now) / (1000 * 60 * 60 * 24));
            vacDdayEl.innerText = `D-${vacDday}`;
        } else {
            vacDdayEl.innerText = "-";
        }
    }
});
