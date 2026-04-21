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
            // 'id'를 keyPath로 사용하는 저장소 생성 보장
            await window.ensureStore(STORE_NAME, "id");
            
            let data = await window.getDBData(STORE_NAME);
            
            if (!data || data.length === 0) {
                const sampleMember = {
                    "id": "0",
                    "name": "홍길동",
                    "nickName": "ㅎㄱㄷ",
                    "start": "2025-01-01",
                    "end": "2026-06-30",
                    "vacation": "2026-06-01",
                    "promotion": { "pfc2cpl": 0, "cpl2sgt": 0 },
                    "photo": "",
                    "affiliation": "해안복합감시반",
                    "position": "항포구 감시병",
                    "hobby": "취미",
                    "specialty": "특기"
                };
                await window.putDBData(STORE_NAME, sampleMember);
                console.log("샘플 인원 정보가 생성되었습니다.");
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
            opt.textContent = `${m.name} (${m.nickName || ''})`;
            selectEl.appendChild(opt);
        });
        renderPreview();
    } else {
        previewEl.innerHTML = '<div class="text-center py-5 text-muted">DB에 등록된 인원 정보가 없습니다. (DBM에서 Import 필요)</div>';
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
        }
    }

    function renderPreview() {
        previewEl.innerHTML = '';
        members.forEach((user, idx) => {
            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
                <img src="${user.photo || '../img/default-profile.png'}" class="preview-photo shadow-sm">
                <span class="preview-name">${user.name}</span>
                <div class="preview-info">${user.affiliation || '-'}</div>
                <div class="preview-info text-primary">${user.position || '-'}</div>
            `;
            card.addEventListener('click', () => {
                selectEl.value = idx;
                handleMemberSelect(idx);
            });
            previewEl.appendChild(card);
        });
    }

    function updateStaticProfile(user) {
        document.getElementById('resPhoto').src = user.photo || '../img/default-profile.png';
        document.getElementById('resName').innerText = user.name;
        document.getElementById('resNickName').innerText = user.nickName ? `(${user.nickName})` : '';
        document.getElementById('resAffiliation').innerText = user.affiliation || '정보 없음';
        document.getElementById('resPosition').innerText = user.position || '정보 없음';
        document.getElementById('resHobby').innerText = user.hobby || '정보 없음';
        document.getElementById('resSpecialty').innerText = user.specialty || '정보 없음';
        document.getElementById('resServicePeriod').innerText = `${user.start} ~ ${user.end}`;
    }

    function calculateMilitary(user) {
        const now = new Date();
        const start = new Date(user.start);
        const end = new Date(user.end);
        const vac = user.vacation ? new Date(user.vacation) : null;

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
            rank = "이병";
            hobong = currentMonthCount;
            promoMonthOffset = pfcThreshold;
        } else if (currentMonthCount <= cplThreshold) {
            rank = "일병";
            hobong = currentMonthCount - pfcThreshold;
            promoMonthOffset = cplThreshold;
        } else if (currentMonthCount <= sgtThreshold) {
            rank = "상병";
            hobong = currentMonthCount - cplThreshold;
            promoMonthOffset = sgtThreshold;
        } else {
            rank = "병장";
            hobong = currentMonthCount - sgtThreshold;
            promoMonthOffset = -1;
        }

        document.getElementById('resRankTop').innerText = rank;
        document.getElementById('resRankStatus').innerText = remainTime > 0 ? `${rank} ${hobong}호봉` : "병장 (전역 완료)";
        document.getElementById('resPercent').innerText = `${percent}%`;
        document.getElementById('progressBarFill').style.width = `${percent}%`;
        document.getElementById('resDday').innerText = remainTime > 0 ? `D-${remainDays}` : "전역 완료";

        let nextPromoDate = null;
        if (promoMonthOffset !== -1) {
            nextPromoDate = new Date(startFirstDay.getFullYear(), startFirstDay.getMonth() + promoMonthOffset, 1);
        }

        if (rank === "병장" || !nextPromoDate || remainTime <= 0) {
            document.getElementById('resPromoInfo').innerText = "일정 없음";
        } else {
            const promoDday = Math.ceil((nextPromoDate - now) / (1000 * 60 * 60 * 24));
            document.getElementById('resPromoInfo').innerText = `D-${promoDday} (${nextPromoDate.toLocaleDateString()})`;
        }

        if (vac && vac > now) {
            const vacDday = Math.ceil((vac - now) / (1000 * 60 * 60 * 24));
            document.getElementById('resVacInfo').innerText = `D-${vacDday} (${user.vacation})`;
        } else {
            document.getElementById('resVacInfo').innerText = "일정 없음";
        }
    }
});
