document.addEventListener('DOMContentLoaded', async () => {
    
    const selectEl = document.getElementById('memberSelect');
    const displayEl = document.getElementById('resultDisplay');
    const previewEl = document.getElementById('previewDisplay');
    let timerId = null; 
    let members = [];

    async function loadMembersFromDB() {
        return new Promise((resolve) => {
            const request = indexedDB.open("myDB");
            request.onsuccess = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("member")) {
                    console.warn("'member' store not found");
                    resolve([]);
                    return;
                }
                const tx = db.transaction("member", "readonly");
                const store = tx.objectStore("member");
                const getReq = store.getAll();
                getReq.onsuccess = () => resolve(getReq.result || []);
                getReq.onerror = () => resolve([]);
            };
            request.onupgradeneeded = (e) => {
                const db = e.target.result;
                if (!db.objectStoreNames.contains("member")) db.createObjectStore("member");
            };
            request.onerror = () => resolve([]);
        });
    }

    members = await loadMembersFromDB();

    if (members && members.length > 0) {
        members.forEach((m, idx) => {
            let opt = document.createElement('option');
            opt.value = idx;
            opt.textContent = m.name;
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
            previewEl.classList.remove('hidden');
            renderPreview();
        } else {
            const user = members[val];
            displayEl.classList.remove('hidden');
            previewEl.classList.add('hidden');
            
            calculateMilitary(user);
            timerId = setInterval(() => calculateMilitary(user), 10); 
        }
    }

    function renderPreview() {
        previewEl.innerHTML = '';
        const now = new Date();

        members.forEach((user, idx) => {
            const start = new Date(user.start);
            const end = new Date(user.end);
            const totalTime = end - start;
            const passedTime = now - start;
            const percent = Math.min(100, Math.max(0, (passedTime / totalTime) * 100)).toFixed(2);
            const remainDays = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

            const card = document.createElement('div');
            card.className = 'preview-card';
            card.innerHTML = `
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <span class="preview-name">${user.name}</span>
                    <span class="preview-percent">${percent}%</span>
                </div>
                <div class="progress-bar-container" style="height: 6px; margin-bottom: 8px;">
                    <div class="progress-bar-fill" style="width: ${percent}%"></div>
                </div>
                <div class="text-secondary small">
                    ${remainDays > 0 ? '전역까지 D-' + remainDays : '전역 완료'}
                </div>
            `;
            card.addEventListener('click', () => {
                selectEl.value = idx;
                handleMemberSelect(idx);
            });
            previewEl.appendChild(card);
        });
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

        let nextPromoDate = null;
        if (promoMonthOffset !== -1) {
            nextPromoDate = new Date(startFirstDay.getFullYear(), startFirstDay.getMonth() + promoMonthOffset, 1);
        }

        document.getElementById('resName').innerText = remainTime > 0 ? `${rank} ${user.nickName}` : `병장 ${user.nickName}`;
        document.getElementById('resPercent').innerText = `${percent}%`;
        document.getElementById('progressBarFill').style.width = `${percent}%`;
        
        document.getElementById('resRank').innerText = remainTime > 0 ? `${rank} ${hobong}호봉` : "병장 (전역 완료)";
        document.getElementById('resStartDate').innerText = user.start;
        document.getElementById('resEndDate').innerText = user.end;
        document.getElementById('resDday').innerText = remainTime > 0 ? `D-${remainDays}` : "전역 완료";

        if (rank === "병장" || !nextPromoDate || remainTime <= 0) {
            document.getElementById('resNextPromo').innerText = "일정 없음";
            document.getElementById('resPromoDday').innerText = "-";
        } else {
            const promoDday = Math.ceil((nextPromoDate - now) / (1000 * 60 * 60 * 24));
            const py = nextPromoDate.getFullYear();
            const pm = String(nextPromoDate.getMonth() + 1).padStart(2, '0');
            const pd = String(nextPromoDate.getDate()).padStart(2, '0');
            document.getElementById('resNextPromo').innerText = `${py}-${pm}-${pd}`;
            document.getElementById('resPromoDday').innerText = `D-${promoDday}`;
        }

        if (vac && vac > now) {
            const vacDday = Math.ceil((vac - now) / (1000 * 60 * 60 * 24));
            document.getElementById('resNextVac').innerText = user.vacation;
            document.getElementById('resVacDday').innerText = `D-${vacDday}`;
        } else {
            document.getElementById('resNextVac').innerText = "일정 없음";
            document.getElementById('resVacDday').innerText = "-";
        }
    }
});
